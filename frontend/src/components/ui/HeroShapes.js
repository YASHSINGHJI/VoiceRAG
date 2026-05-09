/**
 * HeroShapes — floating translucent ellipses background layer.
 * Accepts `darkMode` prop so colours switch with theme toggling.
 */
import { motion } from 'framer-motion';

/* Dark palette — muted cool greys */
const SHAPES_DARK = [
  { delay: 0.3, width: 600, height: 140, rotate: 12,  gradient: 'rgba(160,160,185,0.10)', style: { left: '-5%',  top: '15%'   } },
  { delay: 0.5, width: 500, height: 120, rotate: -15, gradient: 'rgba(130,130,155,0.08)', style: { right: '-2%', top: '68%'   } },
  { delay: 0.4, width: 300, height: 80,  rotate: -8,  gradient: 'rgba(100,100,130,0.09)', style: { left: '8%',   bottom: '6%' } },
  { delay: 0.6, width: 200, height: 60,  rotate: 20,  gradient: 'rgba(180,180,200,0.07)', style: { right: '18%', top: '8%'   } },
  { delay: 0.7, width: 150, height: 40,  rotate: -25, gradient: 'rgba(200,200,220,0.06)', style: { left: '22%',  top: '5%'   } },
];

/* Light palette — subtle navy-tinted shapes */
const SHAPES_LIGHT = [
  { delay: 0.3, width: 600, height: 140, rotate: 12,  gradient: 'rgba(60,60,120,0.08)',  style: { left: '-5%',  top: '15%'   } },
  { delay: 0.5, width: 500, height: 120, rotate: -15, gradient: 'rgba(80,80,140,0.06)',  style: { right: '-2%', top: '68%'   } },
  { delay: 0.4, width: 300, height: 80,  rotate: -8,  gradient: 'rgba(50,50,110,0.07)',  style: { left: '8%',   bottom: '6%' } },
  { delay: 0.6, width: 200, height: 60,  rotate: 20,  gradient: 'rgba(70,70,130,0.05)',  style: { right: '18%', top: '8%'   } },
  { delay: 0.7, width: 150, height: 40,  rotate: -25, gradient: 'rgba(90,90,150,0.05)',  style: { left: '22%',  top: '5%'   } },
];

function ElegantShape({ delay, width, height, rotate, gradient, style, dark }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ duration: 2.4, delay, ease: [0.23, 0.86, 0.39, 0.96], opacity: { duration: 1.2 } }}
      style={{ position: 'absolute', pointerEvents: 'none', ...style }}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width, height, position: 'relative' }}
      >
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 100,
          background: `linear-gradient(135deg, ${gradient}, transparent)`,
          border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          backdropFilter: 'blur(2px)',
          boxShadow: dark
            ? '0 8px 32px 0 rgba(255,255,255,0.04)'
            : '0 8px 32px 0 rgba(0,0,0,0.04)',
        }} />
      </motion.div>
    </motion.div>
  );
}

export function HeroShapes({ darkMode = true }) {
  const shapes = darkMode ? SHAPES_DARK : SHAPES_LIGHT;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {shapes.map((s, i) => <ElegantShape key={i} {...s} dark={darkMode} />)}
    </div>
  );
}

export default HeroShapes;
