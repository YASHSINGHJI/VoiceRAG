import React from 'react';
import './WaveformBars.css';

/**
 * Animated SVG waveform bars.
 * Props:
 *   barCount  – number of bars (default 20)
 *   color     – bar color (default var(--c-accent))
 *   height    – container height in px (default 48)
 *   animated  – pause animation when false
 *   style     – extra inline styles on wrapper
 */
const WaveformBars = ({
  barCount = 20,
  color = 'var(--c-accent)',
  height = 48,
  animated = true,
  style = {},
}) => {
  const bars = Array.from({ length: barCount }, (_, i) => i);
  const barW = 3;
  const gap  = 3;
  const totalW = barCount * (barW + gap) - gap;

  return (
    <div
      className={`waveform-bars ${animated ? 'animated' : 'paused'}`}
      style={{ width: totalW, height, ...style }}
      aria-hidden="true"
    >
      <svg width={totalW} height={height} viewBox={`0 0 ${totalW} ${height}`}>
        {bars.map(i => {
          const x = i * (barW + gap);
          return (
            <rect
              key={i}
              className="wbar"
              x={x}
              width={barW}
              rx={barW / 2}
              fill={color}
              style={{
                animationDelay:    `${(i * 0.08).toFixed(2)}s`,
                transformOrigin:   `${x + barW / 2}px ${height / 2}px`,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};

export default WaveformBars;
