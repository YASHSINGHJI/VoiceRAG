import React, { useEffect, useState } from 'react';
import { Library, Search, Clock, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './LectureSidebar.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LectureSidebar = ({ onSelect }) => {
  const [lectures, setLectures]   = useState([]);
  const [query,    setQuery]       = useState('');
  const [loading,  setLoading]     = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/lectures`)
      .then(r => r.json())
      .then(data => { setLectures(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = lectures.filter(l =>
    l.video_title.toLowerCase().includes(query.toLowerCase())
  );

  const fmtDuration = (secs) => {
    const m = Math.floor(secs / 60);
    return `${m} min`;
  };

  return (
    <aside className="lecture-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <Library size={16} className="sidebar-icon" />
          <h3>LECTURES</h3>
        </div>
        <div className="sidebar-search-container">
          <Search size={14} className="search-icon" />
          <input
            className="sidebar-search"
            placeholder="Search lectures..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="sidebar-list-container">
        <ul className="sidebar-list">
          {loading && <li className="sidebar-loading">Loading metadata...</li>}
          <AnimatePresence mode="popLayout">
            {filtered.map((l, i) => (
              <motion.li 
                key={l.video_number}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <button
                  className="sidebar-item"
                  onClick={() => onSelect(l)}
                  title={`Ask about ${l.video_title}`}
                >
                  <div className="sidebar-item-top">
                    <span className="sidebar-num">#{l.video_number}</span>
                    <span className="sidebar-meta">
                      <Clock size={10} /> {fmtDuration(l.duration_seconds)}
                    </span>
                  </div>
                  <span className="sidebar-title">
                    {l.video_title.replace(/^\d+\.\s*/, '')}
                  </span>
                  <div className="sidebar-item-bottom">
                    <BookOpen size={10} /> {l.chunk_count} chunks
                  </div>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </aside>
  );
};

export default LectureSidebar;
