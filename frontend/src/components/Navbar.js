import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../ThemeContext';
import './Navbar.css';

const NAV_LINKS = [
  { to: '/',           label: 'Home'           },
  { to: '/chat',       label: 'Chat'           },
  { to: '/knowledge',  label: 'Knowledge Base' },
  { to: '/search',     label: 'Search'         },
  { to: '/analytics',  label: 'Analytics'      },
];

const Navbar = () => {
  const { darkMode, setDarkMode } = useTheme();
  const navigate = useNavigate();

  return (
    <nav className={`navbar ${darkMode ? 'dark' : 'light'}`}>
      {/* Logo */}
      <button className="nav-logo" onClick={() => navigate('/')}>
        🎤 <span>VoiceRAG</span>
      </button>

      {/* Links */}
      <ul className="nav-links">
        {NAV_LINKS.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {label}
              <span className="nav-underline" />
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Theme toggle */}
      <button
        id="theme-toggle-btn"
        className="nav-theme-btn"
        onClick={() => setDarkMode(d => !d)}
        aria-label="Toggle theme"
        title={darkMode ? 'Light mode' : 'Dark mode'}
      >
        {darkMode ? <FaSun /> : <FaMoon />}
      </button>
    </nav>
  );
};

export default Navbar;
