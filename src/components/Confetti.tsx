import { useEffect, useRef } from "react";
import { useSettings } from "@/hooks/useSettings";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  decay: number;
  shape: "rect" | "circle";
}

const CELEBRATION_COLORS = [
  "#3b82f6", // Track blue
  "#10b981", // Track green
  "#ef4444", // Track red
  "#8b5cf6", // Track purple
  "#f59e0b", // Track yellow / gold
  "#ec4899", // Track pink
  "#f97316", // Track orange
  "#14b8a6", // Track teal
  "#6366f1", // Track indigo
];

interface ConfettiProps {
  /** Fires the animation on mount. Automatically unmounts / clears after duration. */
  onComplete?: () => void;
  durationMs?: number;
}

export function Confetti({ onComplete, durationMs = 3000 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.reduceMotion) {
      // Reduced motion: simple timed callback without canvas particles
      const timer = window.setTimeout(() => onComplete?.(), 1000);
      return () => window.clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];
    const particleCount = Math.min(120, Math.floor(width / 7));

    // Spawn dual bursts from bottom left and bottom right towards center
    for (let i = 0; i < particleCount; i++) {
      const isLeft = i % 2 === 0;
      const angle = isLeft
        ? (Math.PI / 4) + (Math.random() * Math.PI) / 4 // 45° to 90°
        : (Math.PI / 2) + (Math.random() * Math.PI) / 4; // 90° to 135°

      const speed = 14 + Math.random() * 18;
      const color = CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)];

      particles.push({
        x: isLeft ? width * 0.15 : width * 0.85,
        y: height * 0.88,
        vx: Math.cos(angle) * speed * (isLeft ? 1 : -1),
        vy: -Math.sin(angle) * speed,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 8,
        color,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
        decay: 0.008 + Math.random() * 0.008,
        shape: Math.random() > 0.3 ? "rect" : "circle",
      });
    }

    let animationFrameId: number;
    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, width, height);

      let activeParticles = 0;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38; // Gravity
        p.vx *= 0.985; // Air resistance
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, p.opacity - p.decay);

        if (p.opacity > 0.01 && p.y < height + 40) {
          activeParticles++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;

          if (p.shape === "rect") {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      if (elapsed < durationMs && activeParticles > 0) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        onComplete?.();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onComplete, durationMs, settings.reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
      aria-hidden="true"
    />
  );
}
