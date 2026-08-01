"use client";

// Canvas confetti burst on the voucher reveal — ported from the prototype.
// Brand colors only; gravity fall with fade; skipped entirely under
// prefers-reduced-motion. Mounted only on the final screen (perf budget).
import { useEffect, useRef } from "react";

const COLORS = ["#ED1C24", "#FFFFFF", "#1E1E1E", "#FF8A8E"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  r: number;
  vr: number;
  c: string;
  life: number;
}

export default function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    let parts: Particle[] = [];
    for (let i = 0; i < 110; i++) {
      parts.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 160,
        y: canvas.height * 0.32,
        vx: (Math.random() - 0.5) * 11,
        vy: -(Math.random() * 11 + 5),
        w: Math.random() * 8 + 5,
        h: Math.random() * 5 + 4,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 1,
      });
    }

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts = parts.filter((p) => p.life > 0 && p.y < canvas.height + 30);
      for (const p of parts) {
        p.vy += 0.32;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        p.life -= 0.006;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (parts.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", sizeCanvas);
    };
  }, []);

  return <canvas className="confetti" ref={canvasRef} aria-hidden="true" />;
}
