import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaMicrophone, FaStop, FaSun, FaMoon, FaPaperPlane, FaTrash, FaBook } from 'react-icons/fa';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const App = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Welcome to VoiceRAG! Ask me anything about the AI lectures — type your question or click the microphone to speak.',
      sender: 'bot',
      timestamp: new Date(),
      sources: [],
    },
  ]);
  const [inputText, setInputText]       = useState('');
  const [interimText, setInterimText]   = useState('');   // live interim voice text
  const [isListening, setIsListening]   = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [darkMode, setDarkMode]         = useState(true);
  const [expandedSources, setExpandedSources] = useState({}); // { messageId: bool }

  const messagesEndRef  = useRef(null);
  const recognitionRef  = useRef(null);
  const inputRef        = useRef(null);

  // ── Web Speech API initialization ─────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous      = false;
    recognition.interimResults  = true;
    recognition.lang            = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText('');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      // Show live interim text as a placeholder preview
      setInterimText(interim);
      // Append confirmed final text to input
      if (finalText) {
        setInputText((prev) => (prev ? prev + ' ' + finalText : finalText).trim());
        setInterimText('');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Voice toggle ──────────────────────────────────────────────────────────
  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // ── Send message (streaming RAG) ──────────────────────────────────────────
  const handleSendMessage = useCallback(async () => {
    const question = inputText.trim();
    if (!question || isLoading) return;

    // Stop voice if still active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Append user message
    const userMessage = {
      id: Date.now(),
      text: question,
      sender: 'user',
      timestamp: new Date(),
      sources: [],
    };

    // Append bot placeholder (will be updated while streaming)
    const botId = Date.now() + 1;
    const botPlaceholder = {
      id: botId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      sources: [],
      loading: true,
    };

    setMessages((prev) => [...prev, userMessage, botPlaceholder]);
    setInputText('');
    setInterimText('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      let fullAnswer = '';
      let sources    = [];

      // Parse Server-Sent Events (SSE)
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep the last (possibly incomplete) chunk

        let eventType = null;
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim();
            try {
              const parsed = JSON.parse(payload);
              if (eventType === 'sources') {
                sources = parsed;
                // Snapshot into const so the closure doesn't reference a loop variable
                const snapshotSources = sources;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botId ? { ...m, sources: snapshotSources } : m
                  )
                );
              } else if (eventType === 'token') {
                fullAnswer += parsed;
                const snapshotAnswer = fullAnswer;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botId
                      ? { ...m, text: snapshotAnswer, loading: false }
                      : m
                  )
                );
              } else if (eventType === 'done') {
                const finalAnswer  = fullAnswer;
                const finalSources = sources;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botId
                      ? { ...m, text: finalAnswer, loading: false, sources: finalSources }
                      : m
                  )
                );
              } else if (eventType === 'error') {
                throw new Error(parsed);
              }
            } catch (parseErr) {
              // ignore malformed SSE lines
            }
            eventType = null;
          }
        }
      }
    } catch (err) {
      const errMsg =
        err.message.includes('Failed to fetch') || err.message.includes('NetworkError')
          ? '⚠️ Could not reach the backend. Make sure the Flask server is running on port 5000 (`python app.py`).'
          : `⚠️ Error: ${err.message}`;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId
            ? { ...m, text: errMsg, loading: false, isError: true }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputText, isLoading, isListening]);

  // ── Clear chat ─────────────────────────────────────────────────────────────
  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        text: 'Chat cleared. Ask me anything about the AI lectures!',
        sender: 'bot',
        timestamp: new Date(),
        sources: [],
      },
    ]);
    setExpandedSources({});
  };

  // ── Keyboard handler ──────────────────────────────────────────────────────
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── Toggle source panel for a message ────────────────────────────────────
  const toggleSources = (id) => {
    setExpandedSources((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Typing indicator dots component ──────────────────────────────────────
  const TypingDots = () => (
    <span className="typing-dots" aria-label="Loading response">
      <span /><span /><span />
    </span>
  );

  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* ── Header ── */}
      <header className="header">
        <div className="logo">
          <h1>🎤 VoiceRAG</h1>
          <span className="logo-subtitle">AI Lecture Assistant</span>
        </div>
        <div className="header-controls">
          <button
            id="theme-toggle-btn"
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle theme"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
          <button
            id="clear-chat-btn"
            className="clear-btn"
            onClick={handleClearChat}
            aria-label="Clear chat"
            title="Clear conversation"
          >
            <FaTrash /> Clear
          </button>
        </div>
      </header>

      {/* ── Chat messages ── */}
      <main className="chat-container" aria-live="polite" aria-label="Chat messages">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`message ${message.sender}${message.isError ? ' error' : ''}`}
          >
            {message.sender === 'bot' && (
              <div className="avatar bot-avatar" aria-hidden="true">🤖</div>
            )}

            <div className="message-bubble">
              <div className="message-content">
                {message.loading ? (
                  <TypingDots />
                ) : (
                  <p className="message-text">{message.text}</p>
                )}
                <time className="timestamp" dateTime={message.timestamp.toISOString()}>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>

              {/* Sources panel */}
              {message.sources && message.sources.length > 0 && (
                <div className="sources-section">
                  <button
                    id={`sources-toggle-${message.id}`}
                    className="sources-toggle"
                    onClick={() => toggleSources(message.id)}
                    aria-expanded={!!expandedSources[message.id]}
                  >
                    <FaBook />
                    {expandedSources[message.id] ? 'Hide' : 'Show'} Sources ({message.sources.length})
                  </button>
                  {expandedSources[message.id] && (
                    <ul className="sources-list" aria-label="Retrieved sources">
                      {message.sources.map((src, i) => (
                        <li key={i} className="source-item">
                          <div className="source-header">
                            <span className="source-rank">#{i + 1}</span>
                            <span className="source-title">
                              [Video {src.video_number}] {src.video_title}
                            </span>
                            <span className="source-score">
                              {(src.score * 100).toFixed(1)}% match
                            </span>
                          </div>
                          <div className="source-time">
                            ⏱ {src.start.toFixed(1)}s – {src.end.toFixed(1)}s
                          </div>
                          <p className="source-preview">{src.preview}{src.preview.length >= 300 ? '…' : ''}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {message.sender === 'user' && (
              <div className="avatar user-avatar" aria-hidden="true">🧑</div>
            )}
          </article>
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* ── Input area ── */}
      <footer className="input-area">
        {isListening && (
          <div className="listening-banner" role="status">
            <span className="listening-dot" />
            Listening… {interimText && <em>"{interimText}"</em>}
          </div>
        )}
        <div className="input-wrapper">
          <input
            ref={inputRef}
            id="message-input"
            type="text"
            value={interimText ? `${inputText} ${interimText}`.trim() : inputText}
            onChange={(e) => {
              if (!isListening) setInputText(e.target.value);
            }}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? 'Listening for your voice…' : 'Ask about AI lectures…'}
            className="text-input"
            disabled={isLoading}
            aria-label="Question input"
            readOnly={isListening}
          />
          <button
            id="voice-input-btn"
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceInput}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            title={isListening ? 'Stop' : 'Voice input'}
            disabled={isLoading}
          >
            {isListening ? <FaStop /> : <FaMicrophone />}
          </button>
          <button
            id="send-message-btn"
            className={`send-btn ${isLoading ? 'loading' : ''}`}
            onClick={handleSendMessage}
            aria-label="Send message"
            title="Send"
            disabled={isLoading || !inputText.trim()}
          >
            <FaPaperPlane />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
