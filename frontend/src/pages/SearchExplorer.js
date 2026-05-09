import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import { PageHero } from '../components/ui/PageHero';
import { SonicWaveformOverlay } from '../components/ui/SonicWaveformOverlay';
import { BorderBeam } from '../components/ui/BorderBeam';
import { FaSearch } from 'react-icons/fa';
import { ArrowUp, Mic, Square } from 'lucide-react';
import { Spotlight } from '../components/ui/Spotlight';
import './SearchExplorer.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/* ── Score ring ─────────────────────────────────────────────────────────── */
const ScoreRing = ({ score }) => {
  const r     = 26;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * score;
  const color = score > 0.72 ? '#00ffc8' : score > 0.55 ? '#fbbf24' : '#f87171';

  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="score-ring">
      <circle cx="34" cy="34" r={r} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle cx="34" cy="34" r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 34 34)"
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }}
      />
      <text x="34" y="39" textAnchor="middle"
        fill={color} fontSize="12" fontWeight="700" fontFamily="Inter,sans-serif">
        {Math.round(score * 100)}%
      </text>
    </svg>
  );
};

/* ── Result card ─────────────────────────────────────────────────────────── */
const ResultCard = ({ result, idx, query, darkMode }) => {
  const highlight = (text) => {
    if (!query) return text;
    const words = query.split(/\s+/).filter(Boolean);
    const re    = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(re);
    return parts.map((p, i) =>
      re.test(p) ? <mark key={i} className="hl">{p}</mark> : p
    );
  };

  return (
    <div
      className="result-card"
      style={{ animationDelay: `${idx * 0.08}s`, position: 'relative' }}
    >
      <BorderBeam duration={8} borderWidth={1.5} lightColor={darkMode ? '#00ffc8' : '#4a90ff'} />
      {/* Spotlight — AI Component 3.txt */}
      <Spotlight size={260} color="rgba(0,255,200,0.08)" colorMid="rgba(74,144,255,0.04)" />
      <div className="rc-left">
        <ScoreRing score={result.score} />
        <span className="rc-rank">#{idx + 1}</span>
      </div>
      <div className="rc-body">
        <div className="rc-header">
          <span className="rc-lecture">[Video {result.video_number}] {result.video_title}</span>
          <span className="rc-badge">⏱ {result.start.toFixed(1)}s – {result.end.toFixed(1)}s</span>
        </div>
        <p className="rc-text">{highlight(result.text || result.preview)}</p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
const SearchExplorer = () => {
  const [query,    setQuery]    = useState('');
  const [topK,     setTopK]     = useState(5);
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [error,    setError]    = useState('');
  const [listening,setListening]= useState(false);
  const recRef = useRef(null);
  const { darkMode } = useTheme();

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false;
    rec.onstart  = () => setListening(true);
    rec.onresult = e => setQuery(e.results[0][0].transcript);
    rec.onend    = () => setListening(false);
    recRef.current = rec;
  }, []);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setSearched(false);
    try {
      const r = await fetch(`${API_BASE}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), top_k: topK }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setResults(d.results);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false); setSearched(true);
    }
  };

  const handleKey = e => { if (e.key === 'Enter') doSearch(); };

  return (
    <div className="se-page">
      <SonicWaveformOverlay isListening={listening} />
      <PageHero
        darkMode={darkMode}
        badge="Semantic Retrieval"
        title1="Search"
        title2="Explorer"
        sub="Semantic similarity search across 1,330 lecture chunks — ranked by embedding cosine score"
      />

      {/* Search bar */}
      <div className="se-bar">
        <div className="se-input-wrap">
          <FaSearch className="se-icon" />
          <input
            id="search-input"
            className="se-input"
            placeholder="Enter a concept, topic, or question…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={handleKey}
          />
          <button
            className={`se-voice ${listening ? 'on' : ''}`}
            onClick={() => listening ? recRef.current?.stop() : recRef.current?.start()}
            title="Voice search"
          >
            {listening ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
          </button>
        </div>

        {/* Top-K slider */}
        <div className="se-controls">
          <label className="se-label">
            Top‑K: <strong>{topK}</strong>
            <input type="range" min="1" max="10" value={topK}
              onChange={e => setTopK(Number(e.target.value))} className="se-slider" />
          </label>
          <button
            id="search-submit-btn"
            className="se-submit"
            onClick={doSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching…' : <ArrowUp size={18} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <p className="se-error">⚠️ {error}</p>}

      {/* Results */}
      {searched && !error && (
        <div className="se-results">
          <p className="se-count">{results.length} chunks retrieved</p>
          {results.map((r, i) => (
            <ResultCard key={i} result={r} idx={i} query={query} darkMode={darkMode} />
          ))}
          {results.length === 0 && <p className="se-empty">No results found.</p>}
        </div>
      )}

      {!searched && !loading && (
        <div className="se-placeholder">
          <div className="se-placeholder-icon">🔍</div>
          <p>Type a concept from the AI lectures and hit Search.</p>
          <p className="se-tip">Try: "neural networks", "search algorithms", "Bayesian reasoning"</p>
        </div>
      )}
    </div>
  );
};

export default SearchExplorer;
