/**
 * Landing.js — home page
 * Theme-aware: consumes useTheme() so spotlight fills, waveform colour,
 * and HeroShapes react to dark/light toggling in real time.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { TypewriterEffectSmooth } from '../components/ui/TypewriterEffect';
import { AceternitySpotlight } from '../components/ui/AceternitySpotlight';
import { HeroShapes } from '../components/ui/HeroShapes';
import { SplineScene } from '../components/ui/SplineScene';
import { BorderBeam } from '../components/ui/BorderBeam';
import WaveformBars from '../components/WaveformBars';
import { LiquidButton } from '../components/ui/LiquidGlassButton';
import './Landing.css';

const STATS = [
  { val: '1,330', lbl: 'Transcript Chunks' },
  { val: '30',    lbl: 'AI Lectures'       },
  { val: '1024',  lbl: 'Embedding Dims'    },
  { val: 'BGE-M3',lbl: 'Embed Model'       },
];

const Landing = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  /* ── Theme-dependent dynamic values ── */
  const spotlightA = darkMode ? 'rgba(180,180,210,0.13)' : 'rgba(80,80,140,0.10)';
  const spotlightB = darkMode ? 'rgba(140,140,170,0.10)' : 'rgba(60,60,120,0.07)';
  const waveColor  = darkMode ? '#a0a0b8'               : '#5a5a8a';

  return (
    <div className="landing">
      {/* ── Background layers ── */}
      <HeroShapes darkMode={darkMode} />

      {/* AceternitySpotlight — sweep from top-left */}
      <AceternitySpotlight
        fill={spotlightA}
        style={{ left: '-5%', top: '-30%' }}
      />
      {/* Second spotlight — sweep from right */}
      <AceternitySpotlight
        fill={spotlightB}
        style={{ left: '55%', top: '-20%', animationDelay: '1.2s' }}
      />

      {/* ── Split card ── */}
      <div className="landing-card" style={{ position: 'relative' }}>
        <BorderBeam duration={12} borderWidth={2} lightColor={darkMode ? '#00ffc8' : '#4a90ff'} />

        {/* ── Left: text content ── */}
        <div className="landing-left">

          {/* Waveform bars */}
          <div className="landing-wave">
            <WaveformBars barCount={30} height={48} color={waveColor} />
          </div>

          {/* Typewriter headline */}
          <h1 className="landing-headline">
            <TypewriterEffectSmooth
              words={[
                { text: 'Ask' },
                { text: 'your' },
                { text: 'AI' },
                { text: 'lectures' },
              ]}
            />
            <div className="landing-typewriter-accent">
              <TypewriterEffectSmooth
                words={[{ text: 'anything.', color: darkMode ? '#a0a0c0' : '#4a4a80' }]}
              />
            </div>
          </h1>

          <p className="landing-sub">
            Voice-powered RAG over 30 MIT AI lectures.<br />
            Retrieve, synthesise, and understand — instantly.
          </p>

          {/* CTA — LiquidButton from 4.txt */}
          <div className="landing-cta-wrap">
            <LiquidButton
              onClick={() => navigate('/chat')}
              className="landing-liquid-btn"
              size="lg"
            >
              Start Asking →
            </LiquidButton>
          </div>

          {/* Stats */}
          <div className="landing-stats">
            {STATS.map(s => (
              <div key={s.lbl} className="stat-chip" style={{ position: 'relative' }}>
                <BorderBeam duration={6} borderWidth={1.5} lightColor={darkMode ? '#8b5cf6' : '#4a90ff'} />
                <span className="stat-val">{s.val}</span>
                <span className="stat-lbl">{s.lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: SplineScene 3D ── */}
        <div className="landing-right">
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

      </div>
    </div>
  );
};

export default Landing;
