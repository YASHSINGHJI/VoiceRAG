import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../ThemeContext';

export const SonicWaveformOverlay = ({ isListening }) => {
    const canvasRef = useRef(null);
    const { darkMode } = useTheme();

    useEffect(() => {
        if (!isListening) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        const mouse = { x: canvas.width / 2, y: canvas.height / 2 };
        let time = 0;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        
        const draw = () => {
            // Semi-transparent background to allow trailing effect
            // In light mode we might want a light trail, dark mode dark trail
            if (darkMode) {
                ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
            } else {
                ctx.fillStyle = 'rgba(240, 242, 245, 0.15)';
            }
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const lineCount = 40;
            const segmentCount = 60;
            const height = canvas.height / 2;
            
            for (let i = 0; i < lineCount; i++) {
                ctx.beginPath();
                const progress = i / lineCount;
                const colorIntensity = Math.sin(progress * Math.PI);
                
                // Color based on theme
                if (darkMode) {
                    ctx.strokeStyle = `rgba(0, 255, 200, ${colorIntensity * 0.4})`;
                } else {
                    ctx.strokeStyle = `rgba(74, 144, 255, ${colorIntensity * 0.4})`;
                }
                ctx.lineWidth = 1.5;

                for (let j = 0; j < segmentCount + 1; j++) {
                    const x = (j / segmentCount) * canvas.width;
                    
                    // Mouse influence
                    const distToMouse = Math.hypot(x - mouse.x, (height) - mouse.y);
                    const mouseEffect = Math.max(0, 1 - distToMouse / 400);

                    // Wave calculation (more chaotic when listening)
                    const noise = Math.sin(j * 0.1 + time + i * 0.2) * 20;
                    const spike = Math.cos(j * 0.2 + time + i * 0.1) * Math.sin(j * 0.05 + time) * 60;
                    const y = height + noise + spike * (1 + mouseEffect * 2);
                    
                    if (j === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
            }

            time += 0.03; // Faster animation for "listening" active state
            animationFrameId = requestAnimationFrame(draw);
        };

        const handleMouseMove = (event) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        };

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove);
        
        resizeCanvas();
        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isListening, darkMode]);

    if (!isListening) return null;

    return (
        <canvas 
            ref={canvasRef} 
            style={{ 
                position: 'fixed', 
                inset: 0, 
                zIndex: 0, 
                width: '100vw', 
                height: '100vh', 
                pointerEvents: 'none',
                opacity: 0.7,
                mixBlendMode: darkMode ? 'screen' : 'multiply'
            }} 
        />
    );
};

export default SonicWaveformOverlay;
