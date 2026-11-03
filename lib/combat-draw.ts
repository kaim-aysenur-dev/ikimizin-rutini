// Gelişim dövüşünün çizimi: elde tutulan silah (savuruşla döner), ileride büyü efektleri ve hasar sayıları.
import { type Effect, shotAt } from "./combat";
import { weaponStats } from "./combat-stats";
import { lights } from "./env";
import { type Origin, at as isoAt } from "./iso";
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

/* ------------------------------- büyü ve vuruş efektleri ------------------------------- */


// 3x5 piksel rakamlar (hasar sayıları için; yazı tipi bulanıklaşmasın)
const DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001010010010", "111101111101111", "111101111001111"];
function number(c: Ctx, x: number, y: number, n: number, color: string, plus = false) {
  const s = (plus ? "+" : "") + String(n), w = s.length * 4 - 1;
  let cx = Math.round(x - w / 2);
  for (const ch of s) {
    if (ch === "+") { rect(c, cx - 1, y + 1, 5, 3, P.ink); rect(c, cx, y + 2, 3, 1, color); rect(c, cx + 1, y + 1, 1, 3, color); cx += 4; continue; }
    const g = DIGITS[Number(ch)];
    rect(c, cx - 1, y - 1, 5, 7, P.ink);
    for (let k = 0; k < 15; k++) if (g[k] === "1") px(c, cx + (k % 3), y + Math.floor(k / 3), color);
    cx += 4;
  }
}
const ring = (c: Ctx, x: number, y: number, r: number, col: string, n = 24, phase = 0) => {
  for (let k = 0; k < n; k++) { const a = phase + (k / n) * Math.PI * 2; px(c, Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.5), col); }
};

/** Bir efekti çizer (dünya pikseli). Hasar sayıları en üste, ayrı çağrıyla çizilsin diye `numbers` bayrağı. */
export function drawEffect(c: Ctx, o: Origin, e: Effect, now: number, numbers = false) {
  const k = Math.max(0, Math.min(1, (now - e.at) / Math.max(0.01, e.until - e.at)));
  const col = e.color ?? "#fff6c8";
  if (numbers) {
    if (e.kind !== "hasar" && e.kind !== "sifa-sayi") return;
    const [x, y] = isoAt(o, e.i, e.j);
    number(c, x, Math.round(y - 30 - k * 14), e.value ?? 0, e.kind === "sifa-sayi" ? "#7fe08a" : e.color ?? "#ffe08a", e.kind === "sifa-sayi");
    return;
  }
  if (e.vi !== undefined) {
    const [pi, pj] = shotAt(e, now), [x, y] = isoAt(o, pi, pj), hy = y - 12;
    if (e.kind === "ok") {
      const dx = Math.sign((e.vi ?? 0) - (e.vj ?? 0)) || e.dir;
      line(c, [x - 5 * dx, hy + 1], [x + 3 * dx, hy - 1], 1, e.color ?? P.woodLt); px(c, x + 4 * dx, hy - 1, "#e8e8f0"); px(c, x - 5 * dx, hy, "#e8e0f0");
    } else {
      disc(c, x, hy, 3, P.ink); disc(c, x, hy, 2, col); px(c, x - 1, hy - 1, "#ffffff");
      for (let q = 1; q <= 3; q++) { const [tx, ty] = isoAt(o, pi - (e.vi ?? 0) * q * 0.03, pj - (e.vj ?? 0) * q * 0.03); px(c, tx, ty - 12, col); }
      lights.push({ x, y: hy, r: 16, color: "255,190,120" });
    }
    return;
  }
  const [x, y] = isoAt(o, e.i, e.j);
  switch (e.kind) {
    case "vurus": {
      if (e.style === "yay" || e.style === "asa") break;
      // önde yay biçiminde parlayan kesik; kombonun son vuruşu daha geniş
      const big = (e.step ?? 1) >= 3 ? 1.5 : 1, r = Math.round(10 * big), cx = x + e.dir * 6, cy = y - 10;
      const from = -1.6, to = 0.9, cur = from + (to - from) * Math.min(1, k * 2);
      for (let a = from; a <= cur; a += 0.12) px(c, Math.round(cx + Math.cos(a) * r * e.dir), Math.round(cy + Math.sin(a) * r * 0.7), k < 0.5 ? (e.color ?? "#ffffff") : "rgba(220,230,255,0.5)");
      break;
    }
    case "kivilcim": case "ok": {
      // mermisiz oynatılan büyü (karşı tarafın): elde parlayan kıvılcım ve önüne saçılan ışık
      const cx = x + e.dir * 6, cy = y - 12, r = 2 + Math.round(k * 7);
      disc(c, cx, cy, Math.max(1, 3 - Math.round(k * 2)), col);
      for (let q = 0; q < 8; q++) { const a = (q / 8) * Math.PI * 2; px(c, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.6), q % 2 ? col : "#ffffff"); }
      lights.push({ x: cx, y: cy, r: 20, color: "255,200,140" });
      break;
    }
    case "kalkani": ring(c, x, y - 10, 11 + Math.sin(now * 6), col, 28, now * 2); ring(c, x, y - 10, 9, "rgba(255,255,255,0.35)", 20, -now * 2); break;
    case "muhru": case "patlamasi": {
      const r = (e.value ?? 2) * 11 * (e.kind === "patlamasi" ? k : 0.4 + k * 0.6);
      ring(c, x, y, r, col, 40, now * 3); ring(c, x, y, r * 0.7, e.kind === "muhru" ? "#ffffff" : col, 28, -now * 3);
      lights.push({ x, y: y - 4, r: 30, color: "200,200,255" });
      break;
    }
    case "yagmuru": {
      // gökten düşen ışık sütunları ve bir şimşek
      for (let q = 0; q < 10; q++) {
        const qx = x + Math.round(Math.sin(q * 2.3) * 16), qy = y + Math.round(Math.cos(q * 1.7) * 6), fall = ((k * 3 + q * 0.13) % 1) * 40;
        line(c, [qx, qy - 46 + fall], [qx - 1, qy - 40 + fall], 1, q % 2 ? col : "#ffffff");
      }
      if (k < 0.25) { let bx = x; for (let s = 0; s < 6; s++) { const nx = bx + (s % 2 ? 3 : -3); line(c, [bx, y - 60 + s * 10], [nx, y - 50 + s * 10], 1, "#ffffff"); bx = nx; } lights.push({ x, y: y - 20, r: 50, color: "210,220,255" }); }
      break;
    }
    case "ejder": {
      // bakılan yönde ilerleyen alev dalgası
      const len = (e.value ?? 8) * 1.4;
      for (let q = 0; q < 26; q++) {
        const d = ((k * 1.3 - q / 26) * len); if (d < 0 || d > len) continue;
        const [fx, fy] = isoAt(o, e.i + e.dir * d / Math.SQRT2, e.j - e.dir * d / Math.SQRT2);
        const wob = Math.round(Math.sin(q * 1.9 + now * 12) * 3);
        rect(c, fx - 1, fy - 12 + wob, 3, 3, q % 3 ? "#f0a24a" : "#ffe08a"); px(c, fx, fy - 15 + wob, "#c8463a");
        if (q % 4 === 0) lights.push({ x: fx, y: fy - 12, r: 20, color: "250,150,60" });
      }
      break;
    }
    case "sifa": case "iki-kalp":
      for (let q = 0; q < 8; q++) {
        const qq = (k + q / 8) % 1, sx = x + Math.round(Math.sin(q * 2.4) * 8), sy = Math.round(y - 4 - qq * 26);
        if (e.kind === "iki-kalp") { px(c, sx - 1, sy, "#e48aa0"); px(c, sx + 1, sy, "#e48aa0"); px(c, sx, sy + 1, "#e48aa0"); }
        else { px(c, sx, sy, "#7fe08a"); px(c, sx, sy - 1, "#d8ffd0"); }
      }
      lights.push({ x, y: y - 10, r: 22, color: e.kind === "iki-kalp" ? "240,140,170" : "130,230,140" });
      break;
  }
}
