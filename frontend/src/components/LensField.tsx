import { useEffect, useRef } from "react";

/**
 * Generative hero backdrop: a "lens" of concentric arcs with an orbiting
 * waveform of particles — the product's two ideas (looking + listening) drawn
 * live on canvas. Pointer parallax; static single frame under reduced motion.
 */

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  phase: number;
}

export function LensField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let width = 0;
    let height = 0;
    let raf = 0;
    let t = 0;
    const pointer = { x: 0.5, y: 0.42, tx: 0.5, ty: 0.42 };

    const particles: Particle[] = Array.from({ length: 90 }, (_, i) => ({
      angle: (i / 90) * Math.PI * 2,
      radius: 0.55 + (i % 5) * 0.09,
      speed: 0.0012 + (i % 7) * 0.00035,
      size: 0.8 + (i % 3) * 0.7,
      phase: (i / 90) * Math.PI * 6,
    }));

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;

      const cx = width * pointer.x;
      const cy = height * pointer.y;
      const base = Math.min(width, height) * 0.34;

      // Lens: concentric arcs, each slightly rotated, gap at a drifting angle
      for (let ring = 0; ring < 4; ring++) {
        const r = base * (0.45 + ring * 0.22);
        const gap = t * (0.1 + ring * 0.05) + ring * 1.7;
        ctx.beginPath();
        ctx.arc(cx, cy, r, gap, gap + Math.PI * 1.62);
        ctx.strokeStyle = `rgba(55, 213, 200, ${0.1 - ring * 0.018})`;
        ctx.lineWidth = ring === 0 ? 1.4 : 1;
        ctx.stroke();
      }

      // Focus dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(111, 232, 219, 0.5)";
      ctx.fill();

      // Waveform orbit: particle ring whose radius sings
      for (const p of particles) {
        const wobble = Math.sin(t * 1.8 + p.phase) * base * 0.045;
        const r = base * p.radius + wobble;
        const a = p.angle + t * p.speed * 60;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.62; // squashed ellipse — lens perspective
        const alpha = 0.12 + 0.1 * Math.sin(t * 2 + p.phase);
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(111, 232, 219, ${Math.max(0.04, alpha)})`;
        ctx.fill();
      }

      t += 0.008;
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };

    const onPointer = (event: PointerEvent) => {
      pointer.tx = 0.35 + (event.clientX / window.innerWidth) * 0.3;
      pointer.ty = 0.3 + (event.clientY / window.innerHeight) * 0.24;
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduced) {
      t = 4; // pleasant static frame
      draw();
    } else {
      window.addEventListener("pointermove", onPointer);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    />
  );
}
