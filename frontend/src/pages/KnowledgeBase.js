import React, { useEffect, useState } from 'react';
import { useTheme } from '../ThemeContext';
import { PageHero } from '../components/ui/PageHero';
import { BorderBeam } from '../components/ui/BorderBeam';
import WaveformBars from '../components/WaveformBars';
import { Spotlight } from '../components/ui/Spotlight';
import './KnowledgeBase.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const fmtDuration = s => `${Math.floor(s / 60)} min`;

const LectureCard = ({ lecture, darkMode }) => {
  const [open,   setOpen]   = useState(false);
  const [chunks, setChunks] = useState([]);
  const [loading,setLoading]= useState(false);
  const [page,   setPage]   = useState(1);
  const [total,  setTotal]  = useState(0);
  const [hovered,setHovered]= useState(false);

  const loadChunks = async (pg = 1) => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/lectures/${lecture.video_number}/chunks?page=${pg}&limit=5`);
      const d = await r.json();
      setChunks(pg === 1 ? d.chunks : [...chunks, ...d.chunks]);
      setTotal(d.total);
      setPage(pg);
    } finally { setLoading(false); }
  };

  const toggle = () => {
    if (!open && chunks.length === 0) loadChunks(1);
    setOpen(o => !o);
  };

  return (
    <div
      className={`kb-card ${open ? 'expanded' : ''}`}
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <BorderBeam duration={10} borderWidth={1.5} lightColor={darkMode ? '#00ffc8' : '#4a90ff'} />
      {/* Spotlight — AI Component 3.txt */}
      <Spotlight size={320} color="rgba(0,255,200,0.09)" colorMid="rgba(74,144,255,0.04)" />
      <div className="kb-card-header" onClick={toggle}>
        <div className="kb-num">#{lecture.video_number}</div>
        <div className="kb-info">
          <h3 className="kb-title">{lecture.video_title.replace(/^\d+\.\s*/, '')}</h3>
          <div className="kb-meta">
            <span>📦 {lecture.chunk_count} chunks</span>
            <span>⏱ {fmtDuration(lecture.duration_seconds)}</span>
          </div>
        </div>
        <div className="kb-wave">
          <WaveformBars barCount={12} height={32} animated={hovered || open} />
        </div>
        <span className="kb-chevron">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="kb-chunks">
          {chunks.map((c, i) => (
            <div key={i} className="kb-chunk">
              <span className="chunk-time">{c.start.toFixed(1)}s – {c.end.toFixed(1)}s</span>
              <p className="chunk-text">{c.text}</p>
            </div>
          ))}
          {loading && <p className="kb-loading">Loading…</p>}
          {!loading && chunks.length < total && (
            <button className="load-more-btn" onClick={() => loadChunks(page + 1)}>
              Load more ({total - chunks.length} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const KnowledgeBase = () => {
  const [lectures, setLectures] = useState([]);
  const [filter,   setFilter]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const { darkMode } = useTheme();

  useEffect(() => {
    fetch(`${API_BASE}/api/lectures`)
      .then(r => r.json())
      .then(d => { setLectures(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const shown = lectures.filter(l =>
    l.video_title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="kb-page">
      <PageHero
        darkMode={darkMode}
        badge="MIT AI Lectures"
        title1="Knowledge"
        title2="Base"
        sub="Browse all 30 MIT AI lectures — click any card to preview transcript chunks"
      />

      <div className="kb-header">
        <input
          className="kb-search"
          placeholder="🔍 Search lectures…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {loading
        ? <p className="kb-loading-page">Loading lecture metadata…</p>
        : (
          <div className="kb-grid">
            {shown.map(l => <LectureCard key={l.video_number} lecture={l} darkMode={darkMode} />)}
          </div>
        )}
    </div>
  );
};

export default KnowledgeBase;
