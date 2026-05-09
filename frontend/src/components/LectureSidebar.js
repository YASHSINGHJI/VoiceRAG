import React, { useEffect, useState } from 'react';
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
        <h3>📚 Lectures</h3>
        <input
          className="sidebar-search"
          placeholder="Filter…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <ul className="sidebar-list">
        {loading && <li className="sidebar-loading">Loading…</li>}
        {filtered.map(l => (
          <li key={l.video_number}>
            <button
              className="sidebar-item"
              onClick={() => onSelect(l)}
              title={`Ask about ${l.video_title}`}
            >
              <span className="sidebar-num">{l.video_number}</span>
              <span className="sidebar-title">
                {l.video_title.replace(/^\d+\.\s*/, '')}
              </span>
              <span className="sidebar-meta">
                {l.chunk_count} chunks · {fmtDuration(l.duration_seconds)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default LectureSidebar;
