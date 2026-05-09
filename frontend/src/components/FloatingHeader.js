/**
 * FloatingHeader — from AI Component 10.txt
 * Adapted: TypeScript/Tailwind/shadcn → plain JS + CSS
 * A pill-shaped floating header that sits centered at the top of every page.
 * Matches the #18181b greyish-black palette of the app.
 */
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AudioLines, Sparkles } from 'lucide-react';
import { AnimatedThemeToggler } from './ui/AnimatedThemeToggler';
import { useTheme } from '../ThemeContext';
import './FloatingHeader.css';

const NAV_LINKS = [
  { to: '/',          label: 'Home',          end: true  },
  { to: '/chat',      label: 'Chat',          end: false },
  { to: '/knowledge', label: 'Knowledge Base',end: false },
  { to: '/search',    label: 'Search',        end: false },
  { to: '/analytics', label: 'Analytics',     end: false },
];

const FloatingHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  return (
    <>
      {/* ── Floating pill ── */}
      <header className={`fh-header ${darkMode ? 'dark' : 'light'}`}>
        <nav className="fh-nav">

          {/* Logo */}
          <button className="fh-logo" onClick={() => { navigate('/'); setMenuOpen(false); }}>
            <div className="fh-logo-icon-wrapper">
              <AudioLines className="fh-logo-icon" size={22} />
              <Sparkles className="fh-logo-sparkle" size={10} />
            </div>
            <span className="fh-logo-text">VoiceRAG</span>
          </button>

          {/* Desktop links */}
          <div className="fh-links">
            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `fh-link${isActive ? ' active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="fh-right">
            <AnimatedThemeToggler />
            <button
              className="fh-burger"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <span className={`fh-burger-bar top ${menuOpen ? 'open' : ''}`} />
              <span className={`fh-burger-bar mid ${menuOpen ? 'open' : ''}`} />
              <span className={`fh-burger-bar bot ${menuOpen ? 'open' : ''}`} />
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <div className="fh-overlay" onClick={() => setMenuOpen(false)}>
          <aside className="fh-drawer" onClick={e => e.stopPropagation()}>
            <div className="fh-drawer-logo">
              <span>🎤</span>
              <span className="fh-logo-text">VoiceRAG</span>
            </div>
            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `fh-drawer-link${isActive ? ' active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </aside>
        </div>
      )}
    </>
  );
};

export default FloatingHeader;
