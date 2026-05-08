import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop, FaSun, FaMoon, FaPaperPlane, FaTrash } from 'react-icons/fa';
import './App.css';

const App = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Welcome to VoiceRAG! Click the microphone to start speaking.', sender: 'bot', timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setInputText((prev) => prev + transcript);
          } else {
            interimTranscript += transcript;
          }
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleVoiceInput = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
    }
  };

  const handleSendMessage = () => {
    if (inputText.trim() === '') return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages([...messages, userMessage]);
    setInputText('');

    // Simulate bot response
    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        text: 'This is a prototype response. Connect this to your backend RAG system!',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 500);
  };

  const handleClearChat = () => {
    setMessages([
      { id: 1, text: 'Chat cleared. Ready for new queries!', sender: 'bot', timestamp: new Date() }
    ]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="header">
        <div className="logo">
          <h1>🎤 VoiceRAG</h1>
        </div>
        <div className="header-controls">
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle theme"
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
          <button
            className="clear-btn"
            onClick={handleClearChat}
            aria-label="Clear chat"
          >
            <FaTrash /> Clear
          </button>
        </div>
      </div>

      <div className="chat-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.sender}`}>
            <div className="message-content">
              <p>{message.text}</p>
              <span className="timestamp">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <div className="input-wrapper">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your query or use voice..."
            className="text-input"
          />
          <button
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceInput}
            aria-label="Voice input"
          >
            {isListening ? <FaStop /> : <FaMicrophone />}
          </button>
          <button
            className="send-btn"
            onClick={handleSendMessage}
            aria-label="Send message"
          >
            <FaPaperPlane />
          </button>
        </div>
        {isListening && <p className="listening-indicator">🎙️ Listening...</p>}
      </div>
    </div>
  );
};

export default App;
