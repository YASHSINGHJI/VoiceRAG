/**
 * AceternitySpotlight — from AI Component 3.txt (aceternity/spotlight)
 * Adapted: TypeScript → JS, Tailwind → inline CSS animation
 * 
 * SVG-based static spotlight with a sweep-in animation.
 * Different from ibelick/Spotlight (mouse-following) — this one is decorative.
 *
 * Usage:
 *   <div style={{ position: 'relative', overflow: 'hidden' }}>
 *     <AceternitySpotlight fill="rgba(0,255,200,0.25)" style={{ left: '60%', top: '-20%' }} />
 *     content…
 *   </div>
 */
import React from 'react';

export function AceternitySpotlight({ fill = 'white', style = {}, className = '' }) {
  return (
    <svg
      className={className}
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        zIndex: 1,
        height: '169%',
        width: '84%',
        opacity: 0,
        animation: 'aceternity-spotlight 2s ease 0.75s 1 forwards',
        ...style,
      }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
    >
      <g filter="url(#ace-filter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity="0.21"
        />
      </g>
      <defs>
        <filter
          id="ace-filter"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </svg>
  );
}

export default AceternitySpotlight;
