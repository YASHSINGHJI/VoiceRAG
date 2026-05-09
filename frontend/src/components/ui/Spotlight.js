/**
 * Spotlight — from AI Component 3.txt (ibelick interactive variant)
 * Adapted: TypeScript → JS, framer-motion (already installed).
 *
 * Drop it inside any positioned element and it renders a radial-gradient
 * spotlight that follows the mouse pointer with spring physics.
 *
 * Usage:
 *   <div style={{ position: 'relative', overflow: 'hidden' }}>
 *     <Spotlight />
 *     …content…
 *   </div>
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export function Spotlight({
  className   = '',
  size        = 280,
  color       = 'rgba(0,255,200,0.10)',
  colorMid    = 'rgba(74,144,255,0.06)',
  springOptions = { bounce: 0 },
}) {
  const containerRef   = useRef(null);
  const [isHovered, setIsHovered]       = useState(false);
  const [parentElement, setParentElement] = useState(null);

  const mouseX = useSpring(0, springOptions);
  const mouseY = useSpring(0, springOptions);

  const spotlightLeft = useTransform(mouseX, x => `${x - size / 2}px`);
  const spotlightTop  = useTransform(mouseY, y => `${y - size / 2}px`);

  /* Attach to parent element */
  useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.style.overflow = 'hidden';
      setParentElement(parent);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!parentElement) return;
      const { left, top } = parentElement.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    },
    [mouseX, mouseY, parentElement],
  );

  /* Bind events to parent */
  useEffect(() => {
    if (!parentElement) return;
    const onEnter = () => setIsHovered(true);
    const onLeave = () => setIsHovered(false);
    parentElement.addEventListener('mousemove', handleMouseMove);
    parentElement.addEventListener('mouseenter', onEnter);
    parentElement.addEventListener('mouseleave', onLeave);
    return () => {
      parentElement.removeEventListener('mousemove', handleMouseMove);
      parentElement.removeEventListener('mouseenter', onEnter);
      parentElement.removeEventListener('mouseleave', onLeave);
    };
  }, [parentElement, handleMouseMove]);

  return (
    <motion.div
      ref={containerRef}
      className={className}
      style={{
        position:      'absolute',
        width:         size,
        height:        size,
        borderRadius:  '50%',
        left:          spotlightLeft,
        top:           spotlightTop,
        background:    `radial-gradient(circle at center, ${color} 0%, ${colorMid} 45%, transparent 75%)`,
        filter:        'blur(12px)',
        pointerEvents: 'none',
        zIndex:        0,
        opacity:       isHovered ? 1 : 0,
        transition:    'opacity 0.25s ease',
      }}
    />
  );
}

export default Spotlight;
