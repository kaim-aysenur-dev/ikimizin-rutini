"use client";

import { useEffect, useRef } from "react";
import type { Ctx } from "@/lib/pixel";

// Liste ikonları için hafif tuval: bir kez çizilir. animate ise yalnız ekranda görünürken saniyede birkaç kare oynar.
// Yüzlerce eşyalı listelerde her ikona ayrı döngü açmamak için (PixelCanvas her karede çalışır).
export function PixelIcon({ draw, size, scale = 2, animate = false, className }: {
  draw: (c: Ctx, w: number, h: number, t: number) => void; size: [number, number]; scale?: number; animate?: boolean; className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const cv = ref.current!, c = cv.getContext("2d")!;
    c.imageSmoothingEnabled = false;
    const paint = (t: number) => { c.clearRect(0, 0, cv.width, cv.height); drawRef.current(c, cv.width, cv.height, t); };
    paint(0);
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      window.clearInterval(timer);
      if (e.isIntersecting) timer = window.setInterval(() => paint(performance.now() / 1000), 125);
    });
    io.observe(cv);
    return () => { io.disconnect(); window.clearInterval(timer); };
  }, [animate, size[0], size[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={ref} width={size[0]} height={size[1]} className={className} style={{ width: size[0] * scale, height: size[1] * scale, imageRendering: "pixelated" }} aria-hidden="true" />;
}
