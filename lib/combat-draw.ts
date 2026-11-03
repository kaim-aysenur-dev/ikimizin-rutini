// Gelişim dövüşünün çizimi: elde tutulan silah (savuruşla döner), ileride büyü efektleri ve hasar sayıları.
import { weaponStats } from "./combat-stats";
import { GEAR } from "./gear";
import { type Ctx, type V, P, disc, line, px, rect } from "./pixel";

const levelOf = new Map(GEAR.map((g) => [g.id, g.level]));

/** Namlu rengi seviyeden: demir, çelik, altın, efsane moru */
function bladeOf(level: number): [string, string] {
  if (level >= 30) return ["#c9a6f0", "#f0e0ff"];
  if (level >= 20) return ["#e8c060", "#fff2b0"];
  if (level >= 10) return ["#c8ccd8", "#ffffff"];
  return ["#9a9aa6", "#d8d8e0"];
}

/**
 * Elde silah. hand: el noktası (dünya pikseli); dir: bakış; swing: 0 dinlenme, 0..1 savuruş ilerlemesi.
 * Kılıç ve ağır silahlar yukarıdan öne doğru yay çizer; mızrak ileri dürter; yay ve asa öne kalkar.
 */
export function drawHeld(c: Ctx, gearId: string | null, hand: V, dir: 1 | -1, swing = 0) {
  if (!gearId) return;
  const st = weaponStats(gearId);
  if (!st) return;
  const lv = levelOf.get(gearId) ?? 1;
  const [blade, edge] = bladeOf(lv);
  const [hx, hy] = hand;
  const along = (len: number, ang: number): V => [Math.round(hx + Math.cos(ang) * len * dir), Math.round(hy + Math.sin(ang) * len)];
  const swingAng = (from: number, to: number) => from + (to - from) * Math.min(1, swing);
  switch (st.style) {
    case "kilic": case "hancer": case "iki-elli": {
      const len = st.style === "hancer" ? 8 : st.style === "iki-elli" ? 17 : 13;
      const ang = swing > 0 ? swingAng(-2.1, 0.5) : -1.15;
      const tip = along(len, ang), guard = along(1.5, ang);
      line(c, guard, tip, st.style === "iki-elli" ? 4 : 3, P.ink);
      line(c, guard, tip, st.style === "iki-elli" ? 2 : 1, blade);
      line(c, along(3, ang), along(len - 2, ang), 1, edge);
      px(c, tip[0], tip[1], edge);
      const g1 = along(2.5, ang + 1.4), g2 = along(2.5, ang - 1.4);
      line(c, [guard[0] + (g1[0] - hx), guard[1] + (g1[1] - hy)], [guard[0] + (g2[0] - hx), guard[1] + (g2[1] - hy)], 1, st.trail ?? P.gold);
      if (swing > 0 && swing < 1) {
        // savuruş izi
        for (let k = 1; k <= 4; k++) { const a = swingAng(-2.1, 0.5) - k * 0.22, p = along(len, a); px(c, p[0], p[1], st.trail ?? "rgba(230,235,255,0.7)"); }
      }
      break;
    }
    case "agir": {
      const ang = swing > 0 ? swingAng(-2.3, 0.6) : -1.2, head = along(12, ang);
      line(c, hand, head, 3, P.ink); line(c, hand, head, 1, P.woodLt);
      rect(c, head[0] - 3, head[1] - 3, 7, 6, P.ink); rect(c, head[0] - 2, head[1] - 2, 5, 4, blade); rect(c, head[0] - 2, head[1] - 2, 5, 1, edge);
      break;
    }
    case "mizrak": {
      const reach = swing > 0 ? 4 * Math.sin(Math.PI * Math.min(1, swing)) : 0;
      const back: V = [hx - (7 - reach) * dir, hy + 3], tip: V = [hx + (14 + reach) * dir, hy - 4];
      line(c, back, tip, 3, P.ink); line(c, back, tip, 1, P.woodLt);
      rect(c, tip[0] - (dir > 0 ? 0 : 3), tip[1] - 2, 4, 3, P.ink); rect(c, tip[0] - (dir > 0 ? 0 : 2), tip[1] - 1, 3, 2, blade); px(c, tip[0] + 3 * dir, tip[1], edge);
      break;
    }
    case "yay": {
      const pull = swing > 0 ? Math.sin(Math.PI * Math.min(1, swing)) * 2 : 0;
      for (let k = -8; k <= 8; k++) { const x = hx + Math.round((3 - (k * k) / 21) * dir) + 2 * dir; rect(c, x - 1, hy + k, 2, 1, P.ink); px(c, x, hy + k, k % 3 ? P.woodLt : blade); }
      line(c, [hx + 2 * dir, hy - 8], [hx - Math.round(pull) * dir, hy], 1, "#e8e0f0");
      line(c, [hx - Math.round(pull) * dir, hy], [hx + 2 * dir, hy + 8], 1, "#e8e0f0");
      break;
    }
    case "asa": {
      const top: V = [hx + 2 * dir, hy - 17 - (swing > 0 ? 3 : 0)];
      line(c, [hx, hy + 6], top, 3, P.ink); line(c, [hx, hy + 6], top, 1, P.woodLt);
      disc(c, top[0], top[1] - 2, 3, P.ink); disc(c, top[0], top[1] - 2, 2, blade); px(c, top[0], top[1] - 3, edge);
      break;
    }
  }
}
