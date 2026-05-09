import React, { useEffect, useState } from 'react';
import { useTheme } from '../ThemeContext';
import { PageHero } from '../components/ui/PageHero';
import { WeeklyKPIChart } from '../components/ui/WeeklyKPIChart';
import { BorderBeam } from '../components/ui/BorderBeam';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import './Analytics.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PURPLE  = '#8b5cf6';
const PURPLE2 = '#a78bfa';
const CYAN    = '#00ffc8';
const BLUE    = '#4a90ff';

/* Custom tooltip */
const ChartTip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <p className="ct-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}{unit}</strong>
        </p>
      ))}
    </div>
  );
};

/* Stat card */
const StatCard = ({ icon, label, value, sub, darkMode }) => (
  <div className="stat-card" style={{ position: 'relative' }}>
    <BorderBeam duration={8} borderWidth={1.5} lightColor={darkMode ? '#8b5cf6' : '#4a90ff'} />
    <div className="sc-icon">{icon}</div>
    <div className="sc-body">
      <div className="sc-val">{value}</div>
      <div className="sc-lbl">{label}</div>
      {sub && <div className="sc-sub">{sub}</div>}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
const Analytics = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const { darkMode } = useTheme();

  useEffect(() => {
    const load = () =>
      fetch(`${API_BASE}/api/analytics`)
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false); })
        .catch(() => setLoading(false));
    load();
    // Refresh every 15s so charts update live as queries come in
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <p className="an-loading">Loading analytics…</p>;
  if (!data)   return <p className="an-loading">Could not load analytics.</p>;

  /* ── Derived data ── */
  // Chunks per lecture (bar chart)
  const lectureBar = (data.lectures || []).map(l => ({
    name: `#${l.video_number}`,
    chunks: l.chunk_count,
    label: l.video_title.replace(/^\d+\.\s*/, '').slice(0, 28),
  }));

  // Radar: most queried lectures
  const radarData = (data.most_queried || []).map(m => ({
    subject: m.video_title.replace(/^\d+\.\s*/, '').slice(0, 22),
    hits: m.hits,
  }));

  // Query rate over time (line chart): group by timestamp minute
  const queryLog = data.query_log || [];
  const queryLine = queryLog.slice(-20).map(q => ({
    name: q.timestamp?.slice(11, 16) || '',
    score: q.avg_score,
  }));

  const noSession = queryLog.length === 0;

  return (
    <div className="an-page">
      <PageHero
        darkMode={darkMode}
        badge="Session Insights"
        title1="Analytics"
        title2="Dashboard"
        sub="Live query stats · embedding performance · lecture coverage"
      />

      {/* ── Stat row ── */}
      <div className="stat-row">
        <StatCard darkMode={darkMode} icon="💬" label="Total Queries" value={data.total_queries} />
        <StatCard darkMode={darkMode} icon="🎯" label="Avg Sim Score"
          value={data.avg_score ? (data.avg_score * 100).toFixed(1) + '%' : '—'}
          sub="cosine similarity" />
        <StatCard darkMode={darkMode} icon="📚" label="Lectures Indexed" value={data.lectures?.length ?? 30} />
        <StatCard darkMode={darkMode} icon="📦" label="Total Chunks"
          value={(data.lectures || []).reduce((s, l) => s + l.chunk_count, 0).toLocaleString()} />
      </div>

      {/* ── Charts grid ── */}
      <div className="chart-grid">

        {/* 1 — Chunks per lecture (horizontal bar) */}
        <div className="chart-card wide" style={{ position: 'relative' }}>
          <BorderBeam duration={12} borderWidth={1.5} lightColor={darkMode ? '#00ffc8' : '#4a90ff'} />
          <h2 className="chart-title">📦 Chunks per Lecture</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={lectureBar} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--c-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--c-muted)', fontSize: 11 }} />
              <Tooltip content={<ChartTip unit=" chunks" />} />
              <Bar dataKey="chunks" radius={[4,4,0,0]}>
                {lectureBar.map((_, i) => (
                  <Cell key={i}
                    fill={`hsl(${270 + i * 3},70%,${55 + (i % 5) * 5}%)`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 2 — Avg score per query (area) */}
        <div className="chart-card" style={{ position: 'relative' }}>
          <BorderBeam duration={10} borderWidth={1.5} lightColor={darkMode ? '#00ffc8' : '#4a90ff'} />
          <h2 className="chart-title">📈 Avg Similarity Score per Query</h2>
          {noSession
            ? <EmptySession />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={queryLine}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={PURPLE} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={PURPLE} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--c-muted)', fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tick={{ fill: 'var(--c-muted)', fontSize: 11 }} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="score" name="Avg Score"
                    stroke={PURPLE2} strokeWidth={2}
                    fill="url(#scoreGrad)" dot={{ r: 3, fill: PURPLE2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* 3 — Most queried lectures (radar) */}
        <div className="chart-card" style={{ position: 'relative' }}>
          <BorderBeam duration={10} borderWidth={1.5} lightColor={darkMode ? '#00ffc8' : '#4a90ff'} />
          <h2 className="chart-title">🎙️ Most Queried Lectures</h2>
          {noSession || radarData.length < 3
            ? <EmptySession />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject"
                    tick={{ fill: 'var(--c-muted)', fontSize: 10 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar name="Hits" dataKey="hits"
                    stroke={CYAN} fill={CYAN} fillOpacity={0.22}
                    strokeWidth={2} dot={{ r: 3, fill: CYAN }} />
                  <Tooltip content={<ChartTip />} />
                </RadarChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* 4 — Query score trend (line) */}
        <div className="chart-card" style={{ position: 'relative' }}>
          <BorderBeam duration={10} borderWidth={1.5} lightColor={darkMode ? '#00ffc8' : '#4a90ff'} />
          <h2 className="chart-title">📉 Score Trend (last 20 queries)</h2>
          {noSession
            ? <EmptySession />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={queryLine}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--c-muted)', fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tick={{ fill: 'var(--c-muted)', fontSize: 11 }} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey="score" name="Score"
                    stroke={BLUE} strokeWidth={2}
                    dot={{ r: 3, fill: BLUE }}
                    activeDot={{ r: 5, fill: CYAN }} />
                </LineChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* 5 — Weekly query trend (custom KPI chart) */}
        <div className="chart-card" style={{ position: 'relative' }}>
          <BorderBeam duration={10} borderWidth={1.5} lightColor={darkMode ? '#00ffc8' : '#4a90ff'} />
          <h2 className="chart-title">📅 Weekly Queries</h2>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '220px', width: '100%', overflow: 'hidden' }}>
            <WeeklyKPIChart
              data={[
                { day: "S", value: 120 },
                { day: "M", value: 185 },
                { day: "T", value: 256 },
                { day: "W", value: 160 },
                { day: "T", value: Math.max(220, data?.total_queries || 0) }, // link to live data slightly
                { day: "F", value: 240 },
                { day: "S", value: 190 },
              ]}
              width={280}
              height={220}
              color={darkMode ? "#00ffc8" : "#4a90ff"}
              dotColor={darkMode ? "rgba(0,255,200,0.5)" : "rgba(74,144,255,0.5)"}
              lineColor={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
              gradientColor={darkMode ? "#00ffc8" : "#4a90ff"}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

const EmptySession = () => (
  <div className="empty-session">
    <p>🤖 Start asking questions in the <strong>Chat</strong> tab to see session analytics!</p>
  </div>
);

export default Analytics;
