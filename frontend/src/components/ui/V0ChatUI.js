/**
 * VercelV0Chat — from AI Component 2.txt
 * Full UI: centred heading + dark card textarea + toolbar + action chips
 * Adapted: TypeScript → JS, Tailwind → inline/CSS styles, react-icons instead of lucide-react
 */
import { useState, useEffect } from 'react';
import { useAutoResizeTextarea } from './VercelV0Chat';
import { TypewriterEffectSmooth } from './TypewriterEffect';
import { ArrowUp, Mic, Square } from 'lucide-react';
import {
  FaImage, FaFigma, FaUpload, FaDesktop, FaUser,
} from 'react-icons/fa';
import './V0ChatUI.css';

/* ── Action chips from 2.txt adapted for VoiceRAG context ── */
const CHIPS = [
  { icon: <FaImage  />, label: 'Neural Networks'        },
  { icon: <FaFigma  />, label: 'Backpropagation'         },
  { icon: <FaUpload />, label: 'Reinforcement Learning'  },
  { icon: <FaDesktop/>, label: 'Attention Mechanism'     },
  { icon: <FaUser   />, label: 'Transformers Explained'  },
];

export function V0ChatUI({ onSend, isListening, onVoice, value = '', onChange }) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 60, maxHeight: 200 });

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const submit = () => {
    const q = value.trim();
    if (!q) return;
    onSend?.(q);
    onChange?.('');
    adjustHeight(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const fillChip = (label) => {
    onChange?.(`Explain ${label} in the context of MIT AI lectures`);
  };

  return (
    <div className="v0-chat-ui">
      {/* Heading with TypewriterEffect (AI Component 1.txt) */}
      <div className="v0-heading-wrap">
        <TypewriterEffectSmooth
          words={[
            { text: 'What' },
            { text: 'can' },
            { text: 'I' },
            { text: 'help' },
            { text: 'you' },
            { text: 'learn?', color: '#00ffc8' },
          ]}
        />
      </div>

      {/* Dark card input box */}
      <div className="v0-card">
        {/* Textarea */}
        <div className="v0-textarea-wrap">
          <textarea
            ref={textareaRef}
            className="v0-textarea"
            value={value}
            onChange={e => { onChange?.(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Ask about any AI concept from the 30 MIT lectures…"}
            readOnly={isListening}
          />
        </div>

        {/* Toolbar */}
        <div className="v0-toolbar">
          <div className="v0-toolbar-left" />

          {/* Right — voice + send */}
          <div className="v0-toolbar-right">
            <button
              className={`v0-voice-btn ${isListening ? 'listening' : ''}`}
              onClick={onVoice}
              title={isListening ? 'Stop' : 'Voice input'}
            >
              {isListening ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
            </button>
            <button
              className={`v0-send-btn ${value.trim() ? 'active' : ''}`}
              onClick={submit}
              title="Send"
              disabled={!value.trim()}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Action chips */}
      <div className="v0-chips">
        {CHIPS.map(c => (
          <button
            key={c.label}
            className="v0-chip"
            onClick={() => fillChip(c.label)}
          >
            <span className="v0-chip-icon">{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default V0ChatUI;
