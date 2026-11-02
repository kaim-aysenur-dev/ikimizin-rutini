// Bütün sahnelerin ortak çizim parçaları: taş duvar, gökyüzü, pencere, mum, raf, bitki, zemin.
// tod (gün saati): 0.2 sabah · 0.45 öğle · 0.68 ikindi · 0.8 akşam · 0.9+ gece
import { type Ctx, type V, P, disc, line, rect, rnd } from "./pixel";
import { type Vista, vista } from "./vista";
import { glassDrops, stormLevel, weather } from "./weather";

export const px = (c: Ctx, x: number, y: number, col: string) => rect(c, x, y, 1, 1, col);

/* ------------------------------ ışık kaynakları ------------------------------ */
// Mum ve ateş ışıkları gece karartmasının üstüne çizilsin diye ayrı toplanır (dünya koordinatı).
export type Light = { x: number; y: number; r: number; color: string };
export const lights: Light[] = [];

/* --------------------------------- renkler --------------------------------- */
type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const mix = (a: RGB, b: RGB, k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`;

const SKY: [number, string, string, string][] = [
  // tod, üst, orta, ufuk
  [0.2, "#c9a6c8", "#f2b9a0", "#f6d9a9"],
  [0.45, "#7fb0dc", "#a9cce6", "#e6e2cf"],
  [0.68, "#8a77a8", "#e3967a", "#f6c27a"],
  [0.8, "#3a3460", "#8a4d6c", "#e0805c"],
  [0.9, "#0e1328", "#1b2244", "#2b2850"],
  [1, "#0b0f22", "#141a33", "#22213f"],
];
export function skyAt(tod: number): [string, string, string] {
  let i = 1;
  while (i < SKY.length - 1 && tod > SKY[i][0]) i++;
  const a = SKY[i - 1], b = SKY[i];
  const k = Math.max(0, Math.min(1, (tod - a[0]) / (b[0] - a[0])));
  return [mix(hex(a[1]), hex(b[1]), k), mix(hex(a[2]), hex(b[2]), k), mix(hex(a[3]), hex(b[3]), k)];
}
export const isNight = (tod: number) => tod >= 0.84;

// ortam karartması: gündüz yok, akşam sıcak, gece lacivert
export function ambient(tod: number): string | null {
  if (tod < 0.6) return null;
  if (tod < 0.84) { const k = (tod - 0.6) / 0.24; return `rgba(90,40,60,${(k * 0.22).toFixed(3)})`; }
  const k = Math.min(1, (tod - 0.84) / 0.08);
  return `rgba(14,18,44,${(0.22 + k * 0.28).toFixed(3)})`;
}

export function sky(c: Ctx, x: number, y: number, w: number, h: number, tod: number, t = 0) {
  const [top, mid, low] = skyAt(tod);
  const h3 = Math.ceil(h / 3);
  rect(c, x, y, w, h3, top);
  rect(c, x, y + h3, w, h3, mid);
  rect(c, x, y + h3 * 2, w, h - h3 * 2, low);
  for (let i = 0; i < w; i += 2) { px(c, x + i, y + h3, top); px(c, x + i + 1, y + h3 * 2, mid); }
  if (tod > 0.78) {
    // yıldızlar yavaşça belirir
    const a = Math.min(1, (tod - 0.78) / 0.1);
    for (let i = 0; i < w * h / 60; i++) {
      const sx = x + Math.floor(rnd(i * 7.3) * w), sy = y + Math.floor(rnd(i * 3.1) * h * 0.7);
      const tw = 0.6 + 0.4 * Math.sin(t * 2 + i);
      px(c, sx, sy, `rgba(255,248,220,${(a * tw).toFixed(2)})`);
    }
  }
}

// güneş ya da ay: gün boyunca soldan sağa alçalarak geçer
export function sunMoon(c: Ctx, x: number, y: number, w: number, h: number, tod: number) {
  if (tod < 0.82) {
    const k = (tod - 0.15) / 0.67;
    const sx = x + w * (0.2 + k * 0.65), sy = y + h * (0.55 - Math.sin(Math.PI * Math.min(1, k)) * 0.35 + (k > 0.85 ? (k - 0.85) * 1.6 : 0));
    disc(c, sx, sy, 5, tod > 0.65 ? "#ffd08a" : "#fff1c4");
  } else {
    const mx = x + w * 0.7, my = y + h * 0.25;
    disc(c, mx, my, 4, "#f4efd8");
    disc(c, mx + 2, my - 1, 3, skyAt(tod)[0]);
  }
}

/* ---------------------------------- duvar ---------------------------------- */

export function bricks(c: Ctx, x0: number, y0: number, x1: number, y1: number, base: string, dark: string, light: string, seed: number) {
  rect(c, x0, y0, x1 - x0, y1 - y0, base);
  for (let y = y0, row = 0; y < y1; y += 7, row++) {
    rect(c, x0, y, x1 - x0, 1, dark);
    const off = row % 2 ? 6 : 0;
    for (let x = x0 - off, i = 0; x < x1; x += 13, i++) {
      if (x > x0) rect(c, x, y, 1, Math.min(7, y1 - y), dark);
      const r = rnd(seed + row * 31 + i);
      if (r > 0.75) rect(c, Math.max(x0, x + 2), y + 2, 4, 1, light);
      if (r < 0.12) rect(c, Math.max(x0, x + 6), y + 4, 3, 2, dark);
    }
  }
}

export const warmWall = (c: Ctx, x0: number, y0: number, x1: number, y1: number, seed: number) =>
  bricks(c, x0, y0, x1, y1, "#6e5f62", "#4f4249", "#8a7b78", seed);
export const coolWall = (c: Ctx, x0: number, y0: number, x1: number, y1: number, seed: number) =>
  bricks(c, x0, y0, x1, y1, "#5e5a66", "#3e3a46", "#7d7884", seed);

/* --------------------------------- pencere --------------------------------- */

export function archWindow(c: Ctx, x: number, y: number, w: number, h: number, tod: number, t: number, v: Vista) {
  const r = w / 2;
  c.save();
  c.beginPath();
  c.rect(x, y + r, w, h - r);
  c.arc(x + r, y + r, r, Math.PI, 0);
  c.clip();
  vista(c, v, x, x + w, y, y + h, tod, t);
  if (stormLevel(tod) > 0.3 || v.kind === "nightRain") glassDrops(c, x, y, w, h, t);
  c.restore();
  for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.05) {
    const ox = x + r + Math.cos(a) * (r + 1.5), oy = y + r + Math.sin(a) * (r + 1.5);
    rect(c, ox - 1, oy - 1, 3, 3, P.stoneLt);
  }
  rect(c, x - 2, y + r, 3, h - r, P.stoneLt);
  rect(c, x + w - 1, y + r, 3, h - r, P.stoneLt);
  rect(c, x - 4, y + h, w + 8, 4, P.stoneLt);
  rect(c, x - 4, y + h + 3, w + 8, 1, P.stoneDk);
  rect(c, x + r - 1, y + 2, 2, h - 2, P.woodDk);
  rect(c, x, y + Math.round(h * 0.55), w, 2, P.woodDk);
}

export function lightBeam(c: Ctx, x: number, y: number, w: number, toX: number, toY: number, tod: number) {
  const a = tod < 0.6 ? 0.07 : tod < 0.8 ? 0.06 : 0;
  if (!a) return;
  c.fillStyle = tod < 0.6 ? `rgba(255,222,160,${a})` : `rgba(255,160,110,${a})`;
  c.beginPath();
  c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(toX + w * 1.6, toY); c.lineTo(toX, toY);
  c.closePath(); c.fill();
}

/* ---------------------------------- süsler ---------------------------------- */

export function sarmasik(c: Ctx, x: number, y: number, len: number, seed: number) {
  for (let i = 0; i < len; i++) {
    // rüzgâr: fırtına büyüdükçe sarmaşık uçları daha çok kıpırdar
    const gust = weather.still ? 0 : Math.sin(weather.t * 1.6 + i * 0.25 + seed) * (i / len) * (0.6 + weather.storm * 2);
    const sx = x + Math.round(Math.sin((i + seed) * 0.5) * 2 + gust);
    px(c, sx, y + i, P.forest);
    if (i % 4 === 0) rect(c, sx - 2, y + i, 2, 2, P.moss);
    if (i % 4 === 2) rect(c, sx + 1, y + i, 2, 2, P.forest2);
  }
}

export function candle(c: Ctx, x: number, y: number, t: number, still: boolean) {
  const f = still ? 0 : Math.round(Math.sin(t * 9 + x) * 0.8 + Math.sin(t * 13 + y) * 0.6);
  lights.push({ x: x + 1, y: y - 3, r: 14 + f, color: "240,162,74" });
  rect(c, x, y, 3, 5, P.cream);
  rect(c, x + 2, y, 1, 5, P.parchDk);
  px(c, x + 1, y - 1, P.ink);
  rect(c, x + 1, y - 3 - (f > 0 ? 1 : 0), 1, 2, P.amber);
  px(c, x + 1, y - 4 - (f > 0 ? 1 : 0), P.goldLt);
}

export function sconce(c: Ctx, x: number, y: number, t: number, still: boolean) {
  rect(c, x - 3, y + 5, 9, 2, P.woodDk);
  rect(c, x, y + 7, 3, 3, P.woodDk);
  candle(c, x, y, t, still);
}

export function books(c: Ctx, x: number, y: number, n: number, seed: number) {
  const cols = [P.roseDk, P.navy, P.forest2, P.violet, "#7a3b3b", P.woodDk, P.lilac];
  let bx = x;
  for (let i = 0; i < n; i++) {
    const bw = 3 + Math.round(rnd(i + seed) * 2), bh = 8 + Math.round(rnd(i * 3 + seed) * 4);
    rect(c, bx, y - bh, bw, bh, P.ink);
    rect(c, bx, y - bh + 1, bw - 1, bh - 1, cols[(i + seed) % cols.length]);
    px(c, bx + 1, y - bh + 3, P.gold);
    bx += bw;
  }
  return bx;
}

export function potions(c: Ctx, x: number, y: number) {
  const pots: [string, number][] = [["#7fd1b9", 7], ["#e88aa8", 9], ["#c9a6f0", 6]];
  let bx = x;
  for (const [col, h] of pots) {
    rect(c, bx, y - h, 5, h, P.ink);
    rect(c, bx + 1, y - h + 3, 3, h - 3, col);
    rect(c, bx + 1, y - h + 1, 3, 2, "#c8d8e0");
    rect(c, bx + 2, y - h - 2, 1, 2, P.woodLt);
    px(c, bx + 1, y - h + 4, "#fff");
    bx += 7;
  }
  return bx;
}

export function shelf(c: Ctx, x: number, y: number, w: number, t: number, still: boolean) {
  rect(c, x, y, w, 3, P.woodLt);
  rect(c, x, y + 3, w, 1, P.woodDk);
  rect(c, x + 2, y + 4, 2, 4, P.woodDk);
  rect(c, x + w - 4, y + 4, 2, 4, P.woodDk);
  const bx = potions(c, books(c, x + 3, y, 7, x) + 4, y);
  candle(c, bx + 2, y - 5, t, still);
}

export function plant(c: Ctx, x: number, y: number, big = false) {
  const h = big ? 22 : 10;
  for (let i = 0; i < (big ? 9 : 5); i++) {
    const a = -Math.PI / 2 + (i - (big ? 4 : 2)) * 0.32;
    const lx = x + 4 + Math.cos(a) * h, ly = y - 6 + Math.sin(a) * h;
    line(c, [x + 4, y - 4], [lx, ly], 1, i % 2 ? P.moss : P.forest2);
    rect(c, lx - 1, ly - 1, 3, 2, i % 2 ? P.moss : P.forest2);
  }
  rect(c, x, y - 6, 9, 7, P.ink);
  rect(c, x + 1, y - 5, 7, 5, "#9a5a3a");
  rect(c, x + 1, y - 5, 7, 1, "#b8724a");
}

export function floor(c: Ctx, x0: number, x1: number, y: number, depth: number, stone = false) {
  if (stone) {
    rect(c, x0, y, x1 - x0, depth, P.stoneDk);
    rect(c, x0, y, x1 - x0, 2, P.stoneLt);
    for (let x = x0, i = 0; x < x1; x += 14, i++) rect(c, x + (i % 2) * 7, y + 2, 1, 4, P.stoneDeep);
    return;
  }
  rect(c, x0, y, x1 - x0, depth, P.woodDk);
  rect(c, x0, y, x1 - x0, 2, P.woodLt);
  for (let x = x0, i = 0; x < x1; x += 16, i++) rect(c, x + (i % 2) * 8, y + 2, 1, 3, P.ink);
  rect(c, x0, y + 5, x1 - x0, depth - 5, P.stoneDeep);
}

export function rug(c: Ctx, x: number, y: number, w: number, a = P.roseDk, b = P.gold) {
  rect(c, x, y - 1, w, 2, a);
  for (let i = 2; i < w - 1; i += 6) px(c, x + i, y - 1, b);
}

export function door(c: Ctx, x: number, y: number, w: number, h: number, open = 0) {
  // kemerli ahşap kapı; open 0..1 kanatları içeri çeker
  const r = w / 2;
  c.fillStyle = P.stoneDeep;
  c.beginPath(); c.rect(x, y + r, w, h - r); c.arc(x + r, y + r, r, Math.PI, 0); c.fill();
  const leaf = Math.round(r * (1 - open));
  if (leaf > 0) {
    c.save();
    c.beginPath(); c.rect(x, y + r, w, h - r); c.arc(x + r, y + r, r, Math.PI, 0); c.clip();
    rect(c, x, y, leaf, h, P.wood);
    rect(c, x + w - leaf, y, leaf, h, P.wood);
    for (let i = 3; i < leaf; i += 4) { rect(c, x + i, y, 1, h, P.woodDk); rect(c, x + w - i - 1, y, 1, h, P.woodDk); }
    rect(c, x, y + h * 0.35, leaf, 2, P.ink); rect(c, x + w - leaf, y + h * 0.35, leaf, 2, P.ink);
    rect(c, x, y + h * 0.75, leaf, 2, P.ink); rect(c, x + w - leaf, y + h * 0.75, leaf, 2, P.ink);
    if (leaf > 3) { px(c, x + leaf - 2, y + h * 0.55, P.gold); px(c, x + w - leaf + 1, y + h * 0.55, P.gold); }
    c.restore();
  }
  for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.06) rect(c, x + r + Math.cos(a) * (r + 1) - 1, y + r + Math.sin(a) * (r + 1) - 1, 2, 2, P.stoneLt);
  rect(c, x - 2, y + r, 2, h - r, P.stoneLt);
  rect(c, x + w, y + r, 2, h - r, P.stoneLt);
}

// pikselli küçük kalp (8x7)
const HEART = [".oo..oo.", "orrooRro", "orrrrrro", "orrrrrro", ".orrrro.", "..orro..", "...oo..."];
export function heart(c: Ctx, x: number, y: number, glow = 0) {
  if (glow) lights.push({ x: x + 4, y: y + 3, r: 10 + glow * 4, color: "232,120,150" });
  const pal: Record<string, string> = { o: P.ink, r: "#e2557a", R: "#ffb3c6" };
  for (let r = 0; r < HEART.length; r++) for (let i = 0; i < 8; i++) { const ch = HEART[r][i]; if (pal[ch]) px(c, x + i, y + r, pal[ch]); }
}

export function sparkle(c: Ctx, at: V, k: number, color = "#fff6c8") {
  // k: 0..1 patlama ömrü
  if (k <= 0 || k >= 1) return;
  const r = Math.round(2 + k * 5);
  const col = k < 0.6 ? color : "rgba(255,246,200,0.5)";
  px(c, at[0], at[1], "#fff");
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    px(c, at[0] + dx * r, at[1] + dy * r, col);
    px(c, at[0] + dx * (r - 1), at[1] + dy * (r - 1), col);
  }
  for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) px(c, at[0] + dx * Math.round(r * 0.6), at[1] + dy * Math.round(r * 0.6), col);
}
