import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WaveformVisualizerProps {
  stream: MediaStream | null;
  active: boolean;
}

export function WaveformVisualizer({ stream, active }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || !stream) return;

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const canvas = canvasRef.current;
    let animFrame: number;

    const draw = () => {
      animFrame = requestAnimationFrame(draw);
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barCount = dataArray.length;
      const gap = 3;
      const barWidth = (width - gap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i] / 255;
        const barHeight = Math.max(4, value * height);
        const x = i * (barWidth + gap);
        const y = height - barHeight;
        const radius = barWidth / 2;

        const alpha = 0.5 + value * 0.5;
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, radius);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      source.disconnect();
      audioCtx.close();
    };
  }, [active, stream]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.3 }}
          className="w-full flex items-end justify-center"
        >
          <canvas
            ref={canvasRef}
            width={320}
            height={64}
            className="w-full max-w-xs rounded-xl"
            style={{ height: 64 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
