"use client";

import { useRef } from "react";
import { PixelCanvas } from "@/components/pixel-canvas";
import { PARROT_NAME } from "@/lib/companions";
import type { Ctx } from "@/lib/pixel";
import { type HallTag, drawHall } from "@/lib/scenes/hall";

const NAMES: Record<HallTag["who"], string> = { cengiz: "Cengiz", aysenur: "Ayşenur", duldul: "Düldül", parrot: PARROT_NAME || "Papağan" };
const WHO = Object.keys(NAMES) as HallTag["who"][];

// Panelin arkasındaki şato salonu. Karakterler parşömenin dışında kalan en geniş boşluğa yerleşir;
// isim etiketleri her karede baş noktasına taşınır (React durumu yok, doğrudan stil).
export function PanelBackdrop() {
  const tagRefs = useRef<Partial<Record<HallTag["who"], HTMLSpanElement | null>>>({});

  const draw = (c: Ctx, w: number, h: number, t: number, still: boolean) => {
    const k = window.innerWidth / w;
    const main = document.querySelector(".main")?.getBoundingClientRect();
    const side = document.querySelector(".sidebar")?.getBoundingClientRect();
    let gap: [number, number] | null = null;
    if (main) {
      const left: [number, number] = [(side?.right ?? 0) / k, main.left / k];
      const right: [number, number] = [main.right / k, w];
      const best = left[1] - left[0] > right[1] - right[0] ? left : right;
      if (best[1] - best[0] >= 96) gap = best;
    }
    const tags = drawHall(c, w, h, t, still, gap);
    // ekran konumu + genişlik; yan yana başların etiketleri çakışmasın diye iki yana itilir
    const placed = tags.map((tag) => ({ el: tagRefs.current[tag.who], x: tag.at[0] * k, y: (tag.at[1] - 3) * k, w: tagRefs.current[tag.who]?.offsetWidth ?? 0 }));
    placed.sort((a, b) => a.x - b.x);
    for (let i = 1; i < placed.length; i++) {
      const a = placed[i - 1], b = placed[i];
      const over = (a.w + b.w) / 2 + 4 - (b.x - a.x);
      if (over > 0 && Math.abs(a.y - b.y) < 24) { a.x -= over / 2; b.x += over / 2; }
    }
    for (const who of WHO) if (tagRefs.current[who]) tagRefs.current[who]!.style.display = "none";
    for (const p of placed) {
      if (!p.el) continue;
      p.el.style.display = "";
      p.el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
    }
  };

  return (
    <>
      <PixelCanvas fill fps={12} draw={draw} className="panel-backdrop" />
      {WHO.map((who) => (
        <span key={who} ref={(el) => { tagRefs.current[who] = el; }} className={`hall-tag is-${who}`} style={{ display: "none" }} aria-hidden="true">
          {NAMES[who]}
        </span>
      ))}
    </>
  );
}
