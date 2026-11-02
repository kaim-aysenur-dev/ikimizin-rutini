"use client";

import { useEffect, useRef } from "react";
import type { Ctx } from "@/lib/pixel";
import { weather } from "@/lib/weather";

// Düşük çözünürlüklü, tam sayı ölçekli canvas; draw her karede dünya pikseliyle çağrılır.
// fill: ekranı kaplar (arka plan); yoksa verilen dünya boyutunda sabit kalır (portre).
export function PixelCanvas({ draw, fill, size, scale = 3, className, label, fps = 60 }: {
  draw: (c: Ctx, w: number, h: number, t: number, still: boolean) => void;
  fill?: boolean; size?: [number, number]; scale?: number; className?: string; label?: string; fps?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let k = scale;
    const resize = () => {
      if (fill) {
        k = Math.max(2, Math.min(6, Math.round(Math.min(window.innerWidth / 320, window.innerHeight / 200))));
        cv.width = Math.ceil(window.innerWidth / k); cv.height = Math.ceil(window.innerHeight / k);
      } else { cv.width = size![0]; cv.height = size![1]; }
      cv.style.width = `${cv.width * k}px`; cv.style.height = `${cv.height * k}px`;
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener("resize", resize);
    let raf = 0, last = -1e9;
    // fps: arka plan ve portreler için kare sınırı (sayfa hafif kalsın)
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      if (now - last < 1000 / fps - 1) return;
      last = now;
      const t = now / 1000;
      weather.t = t; weather.still = still;
      drawRef.current(ctx, cv.width, cv.height, t, still);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [fill, size?.[0], size?.[1], scale, fps]);

  return <canvas ref={ref} className={className} style={{ imageRendering: "pixelated" }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
