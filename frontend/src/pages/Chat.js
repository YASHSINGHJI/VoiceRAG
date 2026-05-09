import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../ThemeContext';
import { SonicWaveformOverlay } from '../components/ui/SonicWaveformOverlay';
import { FaTrash, FaBook } from 'react-icons/fa';
import { ArrowUp, Mic, Square } from 'lucide-react';
import LectureSidebar from '../components/LectureSidebar';
import { useAutoResizeTextarea } from '../components/ui/VercelV0Chat';
import { V0ChatUI } from '../components/ui/V0ChatUI';
import { SparklesCore } from '../components/ui/Sparkles';
import './Chat.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/* ── Typewriter component ───────────────────────────────────────────────── */
const TypewriterText = ({ text }) => {
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, [text]);
  return (
    <p className="msg-text">
      {shown}
      {shown.length < text.length && <span className="tw-cursor">▋</span>}
    </p>
  );
};

/* ── Typing dots ─────────────────────────────────────────────────────────── */
const TypingDots = () => (
  <span className="typing-dots" aria-label="Loading">
    <span /><span /><span />
  </span>
);

/* ── Source card ─────────────────────────────────────────────────────────── */
const SourceCard = ({ src, idx }) => (
  <div className="source-card">
    <div className="sc-header">
      <span className="sc-rank">#{idx + 1}</span>
      <span className="sc-title">[{src.video_number}] {src.video_title}</span>
      <span className="sc-score">{(src.score * 100).toFixed(1)}%</span>
    </div>
    <div className="sc-time">⏱ {src.start.toFixed(1)}s – {src.end.toFixed(1)}s</div>
    <p className="sc-preview">{src.preview}{src.preview?.length >= 300 ? '…' : ''}</p>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════ */
const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1, sender: 'bot', timestamp: new Date(), sources: [],
      text: 'Welcome to VoiceRAG! Select a lecture from the sidebar or type your question below.',
      done: true,
    },
  ]);
  const hasUserMsg = messages.some(m => m.sender === 'user');
  const { darkMode } = useTheme();

  const [inputText,    setInputText]    = useState('');
  const [interimText,  setInterimText]  = useState('');
  const [isListening,  setIsListening]  = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [expandedSrcs, setExpandedSrcs] = useState({});

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef       = useRef(null);

  /* ── Auto-resize textarea (AI Component 2.txt) ── */
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 52, maxHeight: 200 });
  /* keep inputRef pointing at the same element for focus calls */
  const combinedRef = (el) => { textareaRef.current = el; inputRef.current = el; };

  /* speech api */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = 'en-US';
    rec.onstart  = () => { setIsListening(true); setInterimText(''); };
    rec.onresult = e => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t) : (interim += t);
      }
      setInterimText(interim);
      if (final) { setInputText(p => (p ? p + ' ' + final : final).trim()); setInterimText(''); }
    };
    rec.onerror = () => { setIsListening(false); setInterimText(''); };
    rec.onend   = () => { setIsListening(false); setInterimText(''); };
    recognitionRef.current = rec;
  }, []);

  /* auto scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleVoice = () => {
    if (!recognitionRef.current) return alert('Speech recognition not supported in this browser.');
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  const sendMessage = useCallback(async () => {
    const q = inputText.trim();
    if (!q || isLoading) return;
    if (isListening && recognitionRef.current) recognitionRef.current.stop();

    const uid  = Date.now();
    const bid  = uid + 1;

    setMessages(prev => [...prev,
      { id: uid, sender: 'user', text: q, timestamp: new Date(), sources: [], done: true },
      { id: bid, sender: 'bot',  text: '', timestamp: new Date(), sources: [], loading: true, done: false },
    ]);
    setInputText(''); setInterimText(''); setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '', fullAnswer = '', sources = [];
      let evType = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();

        for (const line of lines) {
          if (line.startsWith('event: ')) { evType = line.slice(7).trim(); continue; }
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (evType === 'sources') {
                sources = parsed;
                const snap = [...sources];
                setMessages(p => p.map(m => m.id === bid ? { ...m, sources: snap } : m));
              } else if (evType === 'token') {
                fullAnswer += parsed;
                const snap = fullAnswer;
                setMessages(p => p.map(m => m.id === bid ? { ...m, loading: false } : m));
                // store raw for typewriter
                setMessages(p => p.map(m => m.id === bid ? { ...m, rawText: snap } : m));
              } else if (evType === 'done') {
                const fa = fullAnswer, fs = [...sources];
                setMessages(p => p.map(m =>
                  m.id === bid ? { ...m, text: fa, rawText: fa, loading: false, done: true, sources: fs } : m
                ));
              } else if (evType === 'error') {
                throw new Error(parsed);
              }
            } catch (_) {}
            evType = null;
          }
        }
      }
    } catch (err) {
      const errMsg = err.message?.includes('fetch') || err.message?.includes('Failed')
        ? '⚠️ Backend unreachable. Run `python app.py` in the project root.'
        : `⚠️ ${err.message}`;
      setMessages(p => p.map(m => m.id === bid
        ? { ...m, text: errMsg, loading: false, done: true, isError: true } : m));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputText, isLoading, isListening]);

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* V0ChatUI onSend: pre-fill and immediately submit */
  const handleV0Send = useCallback((q) => {
    setInputText(q);
    /* small delay so state flushes before sendMessage reads inputText */
    setTimeout(() => {
      const uid = Date.now();
      const bid = uid + 1;
      setMessages(prev => [...prev,
        { id: uid, sender: 'user', text: q, timestamp: new Date(), sources: [], done: true },
        { id: bid, sender: 'bot',  text: '', timestamp: new Date(), sources: [], loading: true, done: false },
      ]);
      setInputText('');
      setIsLoading(true);

      fetch(`${API_BASE}/api/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      }).then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '', fullAnswer = '', sources = [], evType = null;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n'); buf = lines.pop();
          for (const line of lines) {
            if (line.startsWith('event: ')) { evType = line.slice(7).trim(); continue; }
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (evType === 'sources') { sources = parsed; setMessages(p => p.map(m => m.id === bid ? { ...m, sources: [...parsed] } : m)); }
                else if (evType === 'token') { fullAnswer += parsed; setMessages(p => p.map(m => m.id === bid ? { ...m, loading: false, rawText: fullAnswer } : m)); }
                else if (evType === 'done') { setMessages(p => p.map(m => m.id === bid ? { ...m, text: fullAnswer, rawText: fullAnswer, loading: false, done: true, sources: [...sources] } : m)); }
              } catch (_) {}
              evType = null;
            }
          }
        }
      }).catch(err => {
        const msg = err.message?.includes('fetch') ? '⚠️ Backend unreachable. Run `python app.py`.' : `⚠️ ${err.message}`;
        setMessages(p => p.map(m => m.id === bid ? { ...m, text: msg, loading: false, done: true, isError: true } : m));
      }).finally(() => { setIsLoading(false); inputRef.current?.focus(); });
    }, 0);
  }, []);

  const toggleSrc = id => setExpandedSrcs(p => ({ ...p, [id]: !p[id] }));

  /* Sidebar lecture select → pre-fills the bottom textarea */
  const handleSidebarSelect = (lecture) => {
    setInputText(`Summarise the key concepts from "${lecture.video_title}"`);
    inputRef.current?.focus();
  };

  return (
    <div className="chat-page">
      <SonicWaveformOverlay isListening={isListening} />
      <LectureSidebar onSelect={handleSidebarSelect} />

      <div className="chat-main">
        <div className="chat-sparkles-container">
          <SparklesCore
            id="tsparticleschat"
            background="transparent"
            minSize={0.4}
            maxSize={1.2}
            particleDensity={100}
            className="chat-sparkles-inner"
            particleColor={darkMode ? "#ffffff" : "#4a90ff"}
            speed={0.8}
          />
        </div>
        {/* ── V0ChatUI initial state ── */}
        {!hasUserMsg && (
          <div className="v0-chat-launcher">
            <V0ChatUI 
              onSend={handleV0Send} 
              isListening={isListening} 
              onVoice={toggleVoice} 
              value={inputText}
              onChange={setInputText}
            />
          </div>
        )}

        {/* Messages — only shown after first user message */}
        {hasUserMsg && (
          <div className="chat-messages" aria-live="polite">
          {messages.map(msg => (
            <article key={msg.id} className={`chat-msg ${msg.sender}${msg.isError ? ' error' : ''}`}>

              <div className="msg-bubble">
                <div className={`msg-content ${msg.sender}`}>
                  {msg.loading
                    ? <TypingDots />
                    : msg.done && msg.sender === 'bot'
                      ? <TypewriterText text={msg.text} />
                      : <p className="msg-text">{msg.text}</p>
                  }
                  <time className="msg-time">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
                {msg.sources?.length > 0 && (
                  <div className="msg-sources">
                    <button className="src-toggle" onClick={() => toggleSrc(msg.id)}>
                      <FaBook />
                      {expandedSrcs[msg.id] ? 'Hide' : 'Show'} sources ({msg.sources.length})
                    </button>
                    {expandedSrcs[msg.id] && (
                      <div className="src-cards">
                        {msg.sources.map((s, i) => <SourceCard key={i} src={s} idx={i} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </article>
          ))}
          <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input — only shown after first user message; V0ChatUI handles initial input */}
        {hasUserMsg && <footer className="chat-input-area">
          {isListening && (
            <div className="listening-bar">
              <span className="listen-dot" />
              Listening… {interimText && <em>"{interimText}"</em>}
            </div>
          )}
          <div className="input-row">
            <button
              id="clear-chat-btn"
              className="icon-btn"
              onClick={() => setMessages([{ id: Date.now(), sender: 'bot', text: 'Chat cleared!',
                timestamp: new Date(), sources: [], done: true }])}
              title="Clear chat"
            >
              <FaTrash />
            </button>
            <textarea
              ref={combinedRef}
              id="chat-input"
              className="chat-text-input"
              rows={1}
              value={interimText ? `${inputText} ${interimText}`.trim() : inputText}
              onChange={e => { if (!isListening) { setInputText(e.target.value); adjustHeight(); } }}
              onKeyDown={handleKey}
              placeholder={isListening ? 'Listening…' : 'Ask anything about AI lectures… (Shift+Enter for new line)'}
              disabled={isLoading}
              readOnly={isListening}
            />
            <button
              id="voice-btn"
              className={`voice-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleVoice}
              disabled={isLoading}
              title={isListening ? 'Stop' : 'Voice input'}
            >
              {isListening ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
            </button>
            <button
              id="send-btn"
              className="send-btn"
              onClick={sendMessage}
              disabled={isLoading || !inputText.trim()}
              title="Send"
            >
              <ArrowUp size={20} strokeWidth={2.5} />
            </button>
          </div>
        </footer>}
      </div>
    </div>
  );
};

export default Chat;
