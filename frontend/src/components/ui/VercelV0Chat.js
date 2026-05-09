/**
 * VercelV0Chat — from AI Component 2.txt
 * Adapted: TypeScript → JS, Tailwind → inline/className styles,
 *          lucide-react icons already available via react-icons fallback.
 *
 * Key export: useAutoResizeTextarea hook (used in Chat.js)
 */
import { useEffect, useRef, useCallback, useState } from 'react';

/* ─────────────────────────────────────────────────────────────
   useAutoResizeTextarea — core hook from 2.txt
   ───────────────────────────────────────────────────────────── */
export function useAutoResizeTextarea({ minHeight = 60, maxHeight = 200 }) {
  const textareaRef = useRef(null);

  const adjustHeight = useCallback(
    (reset) => {
      const el = textareaRef.current;
      if (!el) return;
      if (reset) { el.style.height = `${minHeight}px`; return; }
      el.style.height = `${minHeight}px`;
      const newHeight = Math.max(minHeight, Math.min(el.scrollHeight, maxHeight));
      el.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight],
  );

  /* set initial height */
  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  /* re-adjust on resize */
  useEffect(() => {
    const onResize = () => adjustHeight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

/* ─────────────────────────────────────────────────────────────
   VercelV0Chat — standalone demo component (2.txt)
   Not used in routing; exported for reference / future use.
   ───────────────────────────────────────────────────────────── */
const ACTION_CHIPS = [
  { icon: '🖼️', label: 'Clone a Screenshot' },
  { icon: '🎨', label: 'Design from Figma'  },
  { icon: '📁', label: 'Upload a Project'   },
  { icon: '🖥️', label: 'Landing Page'       },
  { icon: '👤', label: 'Sign-Up Form'       },
];

export function VercelV0Chat({ onSend }) {
  const [value, setValue] = useState('');
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 60, maxHeight: 200 });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) { onSend?.(value.trim()); setValue(''); adjustHeight(true); }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 760, margin: '0 auto', gap: 16 }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--c-text)' }}>
        What can I help you ship?
      </h1>

      <div style={{ width: '100%', background: '#18181b', borderRadius: 14, border: '1px solid #27272a', overflow: 'hidden' }}>
        <div style={{ overflowY: 'auto' }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => { setValue(e.target.value); adjustHeight(); }}
            onKeyDown={handleKeyDown}
            placeholder="Ask v0 a question…"
            style={{
              width: '100%', padding: '12px 16px', background: 'transparent',
              border: 'none', outline: 'none', resize: 'none', overflow: 'hidden',
              color: '#fff', fontSize: '0.9rem', minHeight: 60, fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }} title="Attach">📎</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '4px 10px', borderRadius: 8, border: '1px dashed #52525b', background: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '0.8rem' }}>
              + Project
            </button>
            <button
              onClick={() => { if (value.trim()) { onSend?.(value.trim()); setValue(''); adjustHeight(true); } }}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid #52525b',
                background: value.trim() ? '#fff' : 'none', color: value.trim() ? '#000' : '#71717a',
                cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s',
              }}
            >↑</button>
          </div>
        </div>
      </div>

      {/* Action chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {ACTION_CHIPS.map(c => (
          <button
            key={c.label}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 14px', borderRadius: 50,
              background: '#18181b', border: '1px solid #27272a',
              color: '#a1a1aa', fontSize: '0.8rem', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#52525b'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.borderColor = '#27272a'; }}
          >
            <span>{c.icon}</span><span>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default VercelV0Chat;
