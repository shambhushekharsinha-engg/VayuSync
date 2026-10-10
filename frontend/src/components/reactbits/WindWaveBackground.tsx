import React, { useEffect, useRef } from 'react';

interface WindWaveBackgroundProps {
  strokeColor?: string;
  secondaryColor?: string;
  waveCount?: number;
  speed?: number;
  amplitude?: number;
  className?: string;
}

/**
 * WindWaveBackground — React Bits inspired animated fluid wave lines
 * Visualizes dynamic laminar boundary layer air streams and wind vectors.
 */
export const WindWaveBackground: React.FC<WindWaveBackgroundProps> = ({
  strokeColor = 'rgba(56, 189, 248, 0.18)',
  secondaryColor = 'rgba(249, 115, 22, 0.12)',
  waveCount = 4,
  speed = 0.015,
  amplitude = 28,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let step = 0;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      step += speed;

      for (let i = 0; i < waveCount; i++) {
        const progress = i / waveCount;
        const yOffset = height * (0.35 + progress * 0.45);
        const currentAmp = amplitude * (1 + i * 0.2);
        const waveFreq = 0.0035 + i * 0.001;

        ctx.beginPath();
        ctx.moveTo(0, yOffset);

        for (let x = 0; x <= width; x += 8) {
          const y =
            yOffset +
            Math.sin(x * waveFreq + step + i * 0.8) * currentAmp +
            Math.cos(x * waveFreq * 0.6 + step * 0.7) * (currentAmp * 0.4);
          ctx.lineTo(x, y);
        }

        ctx.strokeStyle = i % 2 === 0 ? strokeColor : secondaryColor;
        ctx.lineWidth = 1.2 + i * 0.4;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [strokeColor, secondaryColor, waveCount, speed, amplitude]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
    />
  );
};
