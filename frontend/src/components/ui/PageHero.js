/**
 * PageHero.js — compact page-header banner
 * Adapted from AI Component 6.txt (shape-landing-hero / HeroGeometric)
 * TypeScript → JS, Tailwind → inline styles + CSS module, framer-motion
 *
 * Props:
 *   badge     {string}  — small pill label (e.g. "MIT AI Lectures")
 *   title1    {string}  — first headline line
 *   title2    {string}  — second headline line (gradient)
 *   sub       {string}  — subtext paragraph
 *   darkMode  {boolean} — controls colour palette
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Circle } from 'lucide-react';
import './PageHero.css';

/* ─── Floating ellipse shapes (from 6.txt ElegantShape) ───────────────────── */
function ElegantShape({ delay = 0, width = 400, height = 100, rotate = 0, gradient, border, shadow, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -80, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      style={{ position: 'absolute', pointerEvents: 'none', ...style }}
    >
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width, height, position: 'relative' }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 9999,
          background: gradient,
          border,
          boxShadow: shadow,
          backdropFilter: 'blur(2px)',
        }} />
      </motion.div>
    </motion.div>
  );
}

/* ─── Theme shape configs ──────────────────────────────────────────────────── */
function getShapes(dark) {
  const b = dark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,80,0.08)';
  const s = dark ? '0 8px 32px rgba(255,255,255,0.04)' : '0 8px 32px rgba(0,0,100,0.06)';
  if (dark) return [
    { delay:0.3, width:520, height:120, rotate:12,  gradient:'linear-gradient(135deg,rgba(99,102,241,0.15),transparent)',  border:b, shadow:s, style:{left:'-8%', top:'10%'} },
    { delay:0.5, width:420, height:100, rotate:-14, gradient:'linear-gradient(135deg,rgba(236,72,153,0.12),transparent)',   border:b, shadow:s, style:{right:'-4%',top:'60%'} },
    { delay:0.4, width:260, height:70,  rotate:-8,  gradient:'linear-gradient(135deg,rgba(139,92,246,0.13),transparent)',   border:b, shadow:s, style:{left:'6%', bottom:'5%'} },
    { delay:0.6, width:180, height:55,  rotate:20,  gradient:'linear-gradient(135deg,rgba(245,158,11,0.11),transparent)',   border:b, shadow:s, style:{right:'20%',top:'8%'} },
    { delay:0.7, width:140, height:38,  rotate:-24, gradient:'linear-gradient(135deg,rgba(160,160,220,0.09),transparent)',  border:b, shadow:s, style:{left:'24%',top:'4%'} },
  ];
  return [
    { delay:0.3, width:520, height:120, rotate:12,  gradient:'linear-gradient(135deg,rgba(60,60,200,0.08),transparent)',   border:b, shadow:s, style:{left:'-8%', top:'10%'} },
    { delay:0.5, width:420, height:100, rotate:-14, gradient:'linear-gradient(135deg,rgba(180,40,100,0.07),transparent)',   border:b, shadow:s, style:{right:'-4%',top:'60%'} },
    { delay:0.4, width:260, height:70,  rotate:-8,  gradient:'linear-gradient(135deg,rgba(80,50,180,0.08),transparent)',    border:b, shadow:s, style:{left:'6%', bottom:'5%'} },
    { delay:0.6, width:180, height:55,  rotate:20,  gradient:'linear-gradient(135deg,rgba(150,80,10,0.07),transparent)',    border:b, shadow:s, style:{right:'20%',top:'8%'} },
    { delay:0.7, width:140, height:38,  rotate:-24, gradient:'linear-gradient(135deg,rgba(60,60,140,0.06),transparent)',    border:b, shadow:s, style:{left:'24%',top:'4%'} },
  ];
}

/* ─── Fade-up animation variants (from 6.txt fadeUpVariants) ─────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.85, delay: 0.4 + i * 0.18, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

/* ─── PageHero ─────────────────────────────────────────────────────────────── */
export function PageHero({ badge = '', title1 = '', title2 = '', sub = '', darkMode = true }) {
  const shapes = getShapes(darkMode);

  return (
    <div className={`page-hero ${darkMode ? 'dark' : 'light'}`}>
      {/* Gradient wash behind shapes */}
      <div className="ph-wash" />

      {/* Shapes layer */}
      <div className="ph-shapes">
        {shapes.map((s, i) => <ElegantShape key={i} {...s} />)}
      </div>

      {/* Content */}
      <div className="ph-content">
        {/* Badge pill */}
        {badge && (
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="ph-badge"
          >
            <Circle size={8} className="ph-badge-dot" />
            <span>{badge}</span>
          </motion.div>
        )}

        {/* Title */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
          <h1 className="ph-title">
            <span className="ph-title-line1">{title1}</span>
            {title2 && <><br /><span className="ph-title-line2">{title2}</span></>}
          </h1>
        </motion.div>

        {/* Subtext */}
        {sub && (
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="ph-sub"
          >
            {sub}
          </motion.p>
        )}
      </div>

      {/* Top/bottom vignette (from 6.txt gradient overlay) */}
      <div className="ph-vignette" />
    </div>
  );
}

export default PageHero;
