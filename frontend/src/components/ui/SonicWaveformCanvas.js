/**
 * SonicWaveformCanvas — from AI Component 7.txt
 * Adapted: plain JS, colours matched to VoiceRAG cyan palette (#00ffc8)
 * Drop-in replacement for the particle canvas on Landing page.
 */
import { useEffect, useRef } from 'react';

export function SonicWaveformCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const mouse = { x: 0, y: 0 };
    let time = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      mouse.x = canvas.width  / 2;
      mouse.y = canvas.height / 2;
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const lineCount   = 50;
      const segCount    = 80;
      const centerY     = canvas.height / 2;

      for (let i = 0; i < lineCount; i++) {
        ctx.beginPath();
        const prog     = i / lineCount;
        const alpha    = Math.sin(prog * Math.PI) * 0.45;
        ctx.strokeStyle = `rgba(0,255,200,${alpha})`;
        ctx.lineWidth   = 1.5;

        for (let j = 0; j <= segCount; j++) {
          const x           = (j / segCount) * canvas.width;
          const distMouse   = Math.hypot(x - mouse.x, centerY - mouse.y);
          const mouseEffect = Math.max(0, 1 - distMouse / 380);
          const noise       = Math.sin(j * 0.1 + time + i * 0.2) * 18;
          const spike       = Math.cos(j * 0.2 + time + i * 0.1) * Math.sin(j * 0.05 + time) * 45;
          const y           = centerY + noise + spike * (1 + mouseEffect * 2.2);

          j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      time  += 0.018;
      animId = requestAnimationFrame(draw);
    };

    const onMove = e => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener('resize',    resize);
    window.addEventListener('mousemove', onMove);
    resize();
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize',    resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent' }}
    />
  );
}

export default SonicWaveformCanvas;
