"use client";

import { useEffect, useRef } from "react";
import { PixelCanvas } from "@/components/pixel-canvas";
import { XP_EVENT } from "@/components/xp-badge";
import { PARROT_NAME } from "@/lib/companions";
import type { Ctx } from "@/lib/pixel";
import { HALL_MIN, type HallTag, drawHall } from "@/lib/scenes/hall";
import { levelOf } from "@/lib/xp";

const NAMES: Record<HallTag["who"], string> = { cengiz: "Cengiz", aysenur: "Ayşenur", duldul: "Düldül", parrot: PARROT_NAME || "Papağan", gandalf: "Gandalf" };
const WHO = Object.keys(NAMES) as HallTag["who"][];
const CHEER_SECONDS = 3;

// Panelin arkasındaki şato salonu. Karakterler parşömenin dışında kalan en geniş boşluğa yerleşir;
// isim etiketleri her karede baş noktasına taşınır (React durumu yok, doğrudan stil).
// Seviye ödülleri ve zırh XP'ye göre çizilir; seviye atlanınca ikisi birkaç saniye zıplar.
export function PanelBackdrop({ initialXp }: { initialXp: number }) {
  const tagRefs = useRef<Partial<Record<HallTag["who"], HTMLSpanElement | null>>>({});
  const xp = useRef(initialXp);
  const cheerAt = useRef(-99);

  useEffect(() => {
    const on = (e: Event) => {
      const before = levelOf(xp.current).level;
      xp.current = Math.max(0, xp.current + (Number((e as CustomEvent).detail) || 0));
      if (levelOf(xp.current).level > before) cheerAt.current = performance.now() / 1000;
    };
    window.addEventListener(XP_EVENT, on);
    return () => window.removeEventListener(XP_EVENT, on);
  }, []);

  const draw = (c: Ctx, w: number, h: number, t: number, still: boolean) => {
    const level = levelOf(xp.current).level;
    const k = window.innerWidth / w;
    const main = document.querySelector(".main")?.getBoundingClientRect();
    const side = document.querySelector(".sidebar")?.getBoundingClientRect();
    let gap: [number, number] | null = null;
    if (main) {
      const left: [number, number] = [(side?.right ?? 0) / k, main.left / k];
      const right: [number, number] = [main.right / k, w];
      const best = left[1] - left[0] > right[1] - right[0] ? left : right;
      if (best[1] - best[0] >= HALL_MIN) gap = best;
    }
    const tags = drawHall(c, w, h, t, still, gap, level, t - cheerAt.current < CHEER_SECONDS);
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
