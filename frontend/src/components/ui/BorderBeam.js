/**
 * BorderBeam — from AI Component 9.txt
 * Adapted: TypeScript → JS, motion/react → framer-motion, Tailwind → inline styles
 * Renders an animated glowing beam that travels around the parent's border.
 *
 * Usage:
 *   <div style={{ position:'relative' }}>
 *     <BorderBeam />
 *     content
 *   </div>
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export function BorderBeam({
  lightWidth = 180,
  duration = 8,
  lightColor = '#00ffc8',
  borderWidth = 1,
  borderColor = 'rgba(255,255,255,0.08)',
  style = {},
  className = '',
}) {
  const containerRef = useRef(null);
  const [pathD, setPathD] = useState('');

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const { offsetWidth: w, offsetHeight: h } = containerRef.current;
      setPathD(`M 0 0 H ${w} V ${h} H 0 V 0`);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        pointerEvents: 'none', zIndex: 1, ...style,
      }}
    >
      {/* Static border ring */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        border: `${borderWidth}px solid ${borderColor}`,
        pointerEvents: 'none',
      }} />

      {/* Glowing beam dot */}
      {pathD && (
        <motion.div
          style={{
            position: 'absolute',
            width: lightWidth,
            height: lightWidth,
            borderRadius: '50%',
            background: `radial-gradient(ellipse at center, ${lightColor}55 0%, ${lightColor}22 35%, transparent 70%)`,
            offsetPath: `path("${pathD}")`,
            top: -(lightWidth / 2),
            left: -(lightWidth / 2),
            pointerEvents: 'none',
          }}
          animate={{ offsetDistance: ['0%', '100%'] }}
          transition={{ duration, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  );
}

export default BorderBeam;
