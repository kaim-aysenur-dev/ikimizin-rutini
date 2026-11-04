// Gelişim bahçesinin çizimi: gökyüzü, zemin (çimen, kaldırım, dere, bataklık), yapılar (şapel, mezarlık, demirci,
// değirmen, kuyu, kamp ateşi, fenerler, surlar) ve üstteki canlılar (kuzgunlar, baykuş, sis). Düzen room.ts'te.
import { lights } from "./env";
import { type Origin, at, box, shade, tile } from "./iso";
import { type Ctx, type V, P, disc, line, poly, px, rect, rnd } from "./pixel";
import {
  ANGEL, BRIDGES, CAMPFIRE, CHAPEL, CASTLE, FORGE, GRAVEYARD, GROVE, LANTERNS, MILL, OWL_TREE, PLAZA, RAVEN_TREES, ROAD,
  SIZE, STREAM, SWAMP, SWAMP_POOLS, TOMBS, WELL, gardenSolid, inRectAt, inStream, isPath,
} from "./room";
import { type Weather } from "./gelisim-weather";

type Kit = {
  archJ: (c: Ctx, o: Origin, j: number, i0: number, i1: number, y0: number, y1: number, color: string, peak?: number) => void;
  archI: (c: Ctx, o: Origin, i: number, j0: number, j1: number, y0: number, y1: number, color: string, peak?: number) => void;
  faceJ: (c: Ctx, o: Origin, j: number, i0: number, i1: number, y0: number, y1: number, color: string) => void;
  faceI: (c: Ctx, o: Origin, i: number, j0: number, j1: number, y0: number, y1: number, color: string) => void;
  torch: (c: Ctx, o: Origin, i: number, j: number, t: number, h?: number) => void;
};
type Push = (key: number, draw: () => void) => void;
type Who = { i: number; j: number; sit?: unknown };
const INK = "#1a1420";
const lift = (p: V, z: number): V => [p[0], p[1] - z];

/* --------------------------------- gökyüzü --------------------------------- */

/** Haritanın ardındaki gök: gece koyu lacivert, yıldızlar ve ay (açık ve karlı havada), fırtınada bulut; kuzgun sürüsü ve kayan yıldız */
export function sky(c: Ctx, W: number, H: number, t: number, night: number, weather: Weather, moment: boolean) {
  const g = c.createLinearGradient(0, 0, 0, H);
  const top = weather === "firtina" ? [24, 28, 40] : weather === "sis" ? [34, 38, 48] : [10, 12, 30];
  const mix = (a: number[], k: number) => a.map((v) => Math.round(v * (1 - k * 0.55)));
  const [r1, g1, b1] = mix(top, night), [r2, g2, b2] = mix([18, 26, 24], night);
  g.addColorStop(0, `rgb(${r1},${g1},${b1})`); g.addColorStop(1, `rgb(${r2},${g2},${b2})`);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const clear = weather === "acik" || weather === "kar";
  if (clear) for (let k = 0; k < 90; k++) {
    const x = Math.floor(rnd(k * 3.3) * W), y = Math.floor(rnd(k * 7.1) * H * 0.7), tw = (Math.sin(t * (1 + rnd(k) * 2) + k) + 1) / 2;
    if (tw < 0.25) continue;
    px(c, x, y, `rgba(230,232,255,${(0.25 + 0.6 * tw * (0.4 + 0.6 * night)).toFixed(2)})`);
    if (k % 17 === 0) { px(c, x - 1, y, "rgba(230,232,255,0.3)"); px(c, x + 1, y, "rgba(230,232,255,0.3)"); }
  }
  // ay: sağ üstte, bulutlu havada soluk
  const mx = Math.round(W * 0.84), my = Math.round(H * 0.11), dim = clear ? 1 : 0.35;
  const halo = c.createRadialGradient(mx, my, 4, mx, my, 34);
  halo.addColorStop(0, `rgba(220,226,255,${(0.25 * dim).toFixed(2)})`); halo.addColorStop(1, "rgba(220,226,255,0)");
  c.fillStyle = halo; c.fillRect(mx - 34, my - 34, 68, 68);
  c.save(); c.globalAlpha = dim;
  disc(c, mx, my, 9, "#e8e8f4"); disc(c, mx + 4, my - 2, 8, `rgb(${r1},${g1},${b1})`); // hilal
  px(c, mx - 4, my + 2, "#c8c8d8"); px(c, mx - 6, my - 2, "#c8c8d8");
  c.restore();
  // fırtınalı ve sisli havada süzülen bulutlar
  if (!clear) for (let k = 0; k < 5; k++) {
    const x = ((t * (4 + k) + k * 140) % (W + 160)) - 80, y = Math.round(H * (0.05 + k * 0.05));
    c.fillStyle = weather === "firtina" ? "rgba(40,44,60,0.55)" : "rgba(120,128,140,0.18)";
    c.beginPath(); c.ellipse(x, y, 60 + k * 8, 9 + k, 0, 0, Math.PI * 2); c.fill();
  }
  // kayan yıldız: açık gecede arada bir; birlikte oturunca sık sık
  const period = moment ? 3.5 : 23, ph = (t % period) / period, seed = Math.floor(t / period);
  if ((clear || moment) && ph < 0.06) {
    const q = ph / 0.06, sx = W * (0.2 + rnd(seed) * 0.5) + q * 70, sy = H * (0.06 + rnd(seed * 2.1) * 0.15) + q * 26;
    for (let k = 0; k < 10; k++) px(c, Math.round(sx - k * 2.6), Math.round(sy - k), `rgba(255,248,220,${((1 - k / 10) * (1 - q * 0.5)).toFixed(2)})`);
  }
  // gece kuzgun sürüsü: V düzeninde gökten geçer
  if (night > 0.4) {
    const cyc = (t % 48) / 48;
    if (cyc < 0.3) {
      const q = cyc / 0.3, bx = W + 30 - q * (W + 120), by = H * 0.16 + Math.sin(q * 6) * 6;
      for (let k = 0; k < 7; k++) {
        const side = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2), x = Math.round(bx + Math.abs(side) * 7), y = Math.round(by + side * 4);
        const up = Math.floor(t * 8 + k) % 2;
        px(c, x, y, "#05040a"); px(c, x - 1, y + (up ? -1 : 1), "#05040a"); px(c, x + 1, y + (up ? -1 : 1), "#05040a"); px(c, x - 2, y + (up ? -2 : 1), "#05040a"); px(c, x + 2, y + (up ? -2 : 1), "#05040a");
      }
    }
  }
}

/* ---------------------------------- zemin ---------------------------------- */

export function ground(c: Ctx, o: Origin, t: number, weather: Weather) {
  const { w, d } = SIZE.bahce;
  const snow = weather === "kar", rainy = weather === "firtina";
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    const n = (i * 13 + j * 7) % 11, h = (i * 7 + j * 3) % 5;
    if (j < CASTLE.j1) { tile(c, o, i, j, h ? "#1e2c24" : "#1a271f"); continue; }
    if (inStream(i, j)) {
      const flow = Math.floor(t * 3 + i * 0.5) % 4;
      tile(c, o, i, j, flow === 0 ? "#2a4a66" : j === STREAM.j0 ? "#1e3850" : "#1a3046");
      if ((i + Math.floor(t * 2)) % 5 === 0) { const [x, y] = at(o, i + 0.5, j + 0.5); px(c, x, y, "rgba(190,215,240,0.5)"); px(c, x + 1, y, "rgba(190,215,240,0.3)"); }
      continue;
    }
    if (j >= STREAM.j0 && j < STREAM.j1) { // köprü kalası
      tile(c, o, i, j, (i + j) % 2 ? "#5a4030" : "#523a2a"); tile(c, o, i, j + 0.45, "#3a281e", 1, 0.08); continue;
    }
    if (SWAMP_POOLS.some((r) => inRectAt(i, j, r))) {
      tile(c, o, i, j, (i + j + Math.floor(t)) % 3 ? "#1c2a22" : "#22342a");
      if (n === 3) { const [x, y] = at(o, i + 0.5, j + 0.5); px(c, x, y - 1, "#4a6a3a"); px(c, x + 1, y - 2, "#4a6a3a"); } // saz
      continue;
    }
    let col: string;
    if (isPath(i, j)) {
      const plaza = inRectAt(i, j, PLAZA), board = j === 49 && i > ROAD.i1;
      col = board ? ((i % 2) ? "#4a3626" : "#423020") : plaza ? ((i + j) % 2 ? "#55525e" : "#4c4956") : (i + j) % 2 ? "#4e4c58" : "#46444f";
      tile(c, o, i, j, col);
      if (!board) { tile(c, o, i + 0.15, j + 0.15, plaza ? "#625f6c" : "#5a5864", 0.3, 0.3); tile(c, o, i + 0.6, j + 0.55, "#3e3c46", 0.25, 0.25); }
    } else {
      if (inRectAt(i, j, GRAVEYARD)) col = h ? "#2a2a26" : "#262622";
      else if (inRectAt(i, j, SWAMP)) col = h ? "#24302a" : "#202a24";
      else if (inRectAt(i, j, GROVE)) col = h ? "#2c2a20" : "#28261c";
      else col = h ? ((i + j) % 2 ? "#2c4535" : "#283f31") : "#243a2d";
      tile(c, o, i, j, col);
      if (n === 0) { const [x, y] = at(o, i + 0.5, j + 0.5); px(c, x, y, inRectAt(i, j, GROVE) ? "#6a4a2a" : "#7a2a3a"); px(c, x + 3, y + 1, "#5a4a7a"); }
      if (n === 5) { const [x, y] = at(o, i + 0.4, j + 0.6); px(c, x, y - 1, "#3a5a40"); px(c, x + 1, y - 2, "#3a5a40"); }
      if (n === 7 && inRectAt(i, j, GRAVEYARD)) { const [x, y] = at(o, i + 0.5, j + 0.5); px(c, x, y, "#4a4a44"); } // çakıl
    }
    if (snow && (i * 5 + j * 11) % 3) { const [x, y] = at(o, i + 0.5, j + 0.5); rect(c, x - 3, y - 1, 6, 2, "rgba(230,236,248,0.28)"); px(c, x + 2, y, "rgba(255,255,255,0.5)"); }
    if (rainy && n === 8 && !gardenSolid(i, j)) { const q = (t * 1.2 + i * 0.37 + j * 0.61) % 1; if (q < 0.3) { const [x, y] = at(o, i + 0.5, j + 0.5); px(c, x - 1, y, "rgba(170,195,230,0.5)"); px(c, x + 1, y, "rgba(170,195,230,0.5)"); } }
  }
  // köprü korkulukları
  for (const b of BRIDGES) for (const jj of [STREAM.j0, STREAM.j1]) line(c, lift(at(o, b.i0, jj), 4), lift(at(o, b.i1, jj), 4), 1, "#2a1c14");
  // mezarlık parmaklığı (kapı i 6-7)
  const g = GRAVEYARD, fenceCol = "#1c1c24";
  const post = (p: V) => { rect(c, p[0], p[1] - 8, 1, 8, fenceCol); px(c, p[0], p[1] - 9, "#4a4a56"); };
  for (let i = g.i0; i <= g.i1; i++) { post(at(o, i, g.j0)); post(at(o, i, g.j1)); }
  for (let j = g.j0; j <= g.j1; j++) { post(at(o, g.i0, j)); post(at(o, g.i1, j)); }
  const rail = (a: V, b: V) => { line(c, lift(a, 6), lift(b, 6), 1, fenceCol); line(c, lift(a, 2), lift(b, 2), 1, fenceCol); };
  rail(at(o, g.i0, g.j0), at(o, 6, g.j0)); rail(at(o, 8, g.j0), at(o, g.i1, g.j0)); rail(at(o, g.i0, g.j0), at(o, g.i0, g.j1));
  rail(at(o, g.i0, g.j1), at(o, g.i1, g.j1)); rail(at(o, g.i1, g.j0), at(o, g.i1, g.j1));
  // arka sur: sol arka kenarda mazgallı taş duvar
  const wf = shade("#3e3a48", 0.12, 0.22);
  for (let j = CASTLE.j1; j < d; j++) { box(c, o, -0.6, j, 0.6, 1, 16, wf, 0, false); if (j % 2) box(c, o, -0.6, j + 0.25, 0.6, 0.5, 4, wf, 16, false); }
}

/* --------------------------------- yapılar --------------------------------- */

/** Bütün sabit yapılar, derinlik sırasıyla çizilmek üzere listeye eklenir */
export function structures(push: Push, c: Ctx, o: Origin, t: number, k: Kit, heroes: Who[], flash: number) {
  const front = (r: { i0: number; j0: number; i1: number; j1: number }) => Math.min(r.i0 + r.j1, r.i1 + r.j0);
  push(front(CHAPEL), () => chapel(c, o, t, k, flash));
  push(front(FORGE), () => forge(c, o, t));
  push(front(MILL), () => mill(c, o, t));
  push(WELL.i0 + WELL.j0 + 1.5, () => well(c, o));
  const near = heroes.filter((h) => Math.hypot(h.i - (CAMPFIRE.i0 + 1), h.j - (CAMPFIRE.j0 + 1)) < 2.8).length;
  push(CAMPFIRE.i0 + CAMPFIRE.j0 + 1.5, () => campfire(c, o, t, near));
  push(ANGEL.i0 + ANGEL.j0 + 1.5, () => angel(c, o, t));
  for (const [i, j] of TOMBS) push(i + j + 1, () => tomb(c, o, i, j));
  for (const [i, j] of LANTERNS) push(i + j + 1, () => lantern(c, o, i, j, t));
  // ön sur: alçak duvar, güney kapısında kemer
  const { w, d } = SIZE.bahce, wf = shade("#3e3a48", 0.12, 0.22);
  for (let i = 0; i < w; i++) {
    if (i >= ROAD.i0 && i < ROAD.i1) continue;
    push(i + d + 0.55, () => { box(c, o, i, d - 0.2, 1, 0.4, 7, wf, 0, false); if (i % 2) box(c, o, i + 0.25, d - 0.2, 0.5, 0.4, 3, wf, 7, false); });
  }
  for (let j = CASTLE.j1; j < d; j++) push(w + j + 0.55, () => { box(c, o, w - 0.2, j, 0.4, 1, 7, wf, 0, false); if (j % 2) box(c, o, w - 0.2, j + 0.25, 0.4, 0.5, 3, wf, 7, false); });
  push(ROAD.i0 + d + 1.2, () => southGate(c, o, t, k));
}

function chapel(c: Ctx, o: Origin, t: number, k: Kit, flash: number) {
  const r = CHAPEL, w = r.i1 - r.i0, dd = r.j1 - r.j0, H = 30;
  const f = shade("#4a4652", 0.12, 0.26);
  box(c, o, r.i0, r.j0, w, dd, H, f);
  // yıkık köşe: ön sağ üst kırık, taşlar yerde
  poly(c, [lift(at(o, r.i1, r.j1 - 2.2), H), lift(at(o, r.i1, r.j1), H), lift(at(o, r.i1, r.j1), H - 12)], "#141018");
  for (const [a, b] of [[r.i1 + 0.4, r.j1 - 0.6], [r.i1 + 0.9, r.j1 - 1.4], [r.i1 + 0.3, r.j1 - 2.1]] as V[]) box(c, o, a, b, 0.35, 0.3, 3, f);
  // gotik pencereler: soluk mor ışık, biri kırık
  const glass = flash > 0.15 ? "#dfe6ff" : "#5a4a8a";
  for (const i of [r.i0 + 1, r.i0 + 4.2]) { k.archJ(c, o, r.j1, i, i + 1.3, 10, 26, INK, 5); k.archJ(c, o, r.j1, i + 0.1, i + 1.2, 11, 25, glass, 5); }
  for (const j of [r.j0 + 1, r.j0 + 4.5]) { k.archI(c, o, r.i1, j, j + 1.2, 10, 26, INK, 5); k.archI(c, o, r.i1, j + 0.1, j + 1.1, 11, 25, j > r.j0 + 4 ? "#141018" : glass, 5); }
  // kapı: şapelin sağ yüzünde, yola bakar
  k.archI(c, o, r.i1, 27.1, 28.9, 0, 22, INK, 5); k.archI(c, o, r.i1, 27.25, 28.75, 0, 21, "#2a1c16", 4);
  // kırık çatı: kirişler açıkta
  const jm = r.j0 + dd / 2;
  poly(c, [lift(at(o, r.i0, r.j0), H), lift(at(o, r.i1 - 2, r.j0), H), lift(at(o, r.i1 - 2, jm), H + 18), lift(at(o, r.i0, jm), H + 18)], "#2a2236");
  poly(c, [lift(at(o, r.i0, r.j1), H), lift(at(o, r.i1 - 3, r.j1), H), lift(at(o, r.i1 - 3, jm), H + 18), lift(at(o, r.i0, jm), H + 18)], "#2e2638");
  for (let q = 0; q < 4; q++) { const i = r.i1 - 2.6 + q * 0.6; line(c, lift(at(o, i, r.j1), H), lift(at(o, i, jm), H + 18), 1, "#3a2a20"); }
  // çan kulesi ve çan
  box(c, o, r.i0 + 0.6, r.j0 + 2.6, 1.6, 1.6, 22, shade("#3e3a46", 0.12, 0.26), H + 10);
  const [bx, by] = lift(at(o, r.i0 + 1.4, r.j0 + 4.2), H + 20);
  const sw = Math.round(Math.sin(t * 1.4) * 1.5);
  rect(c, bx - 3 + sw, by - 4, 6, 5, "#8a6a2a"); rect(c, bx - 4 + sw, by + 1, 8, 1, "#6a4a1a"); px(c, bx + sw, by + 2, "#4a3a1a");
  // haç
  const [cx, cy] = lift(at(o, r.i0 + 1.4, r.j0 + 3.4), H + 46);
  rect(c, cx, cy - 7, 1, 8, INK); rect(c, cx - 2, cy - 5, 5, 1, INK);
  for (const i of [r.i0 + 1.6, r.i0 + 4.8]) { const [x, y] = at(o, i, r.j1); lights.push({ x, y: y - 18, r: 12, color: "140,110,220" }); }
}

function tomb(c: Ctx, o: Origin, i: number, j: number) {
  const [x, y] = at(o, i + 0.5, j + 0.5), v = (i * 3 + j) % 3;
  rect(c, x - 5, y - 1, 10, 2, "rgba(0,0,0,0.3)");
  if (v === 0) { rect(c, x - 3, y - 12, 7, 12, INK); rect(c, x - 2, y - 11, 5, 11, "#6a6a72"); rect(c, x - 1, y - 12, 3, 1, INK); rect(c, x - 1, y - 9, 3, 1, "#4a4a52"); px(c, x, y - 10, "#4a4a52"); px(c, x - 2, y - 3, "#3a5a40"); }
  else if (v === 1) { rect(c, x, y - 14, 1, 14, INK); rect(c, x - 3, y - 11, 7, 1, INK); rect(c, x, y - 13, 1, 12, "#5a5a62"); rect(c, x - 2, y - 11, 5, 1, "#5a5a62"); }
  else { rect(c, x - 4, y - 8, 9, 8, INK); rect(c, x - 3, y - 7, 7, 7, "#5e5a64"); rect(c, x - 2, y - 9, 5, 1, INK); px(c, x - 1, y - 5, "#3e3a44"); px(c, x + 1, y - 5, "#3e3a44"); px(c, x + 2, y - 2, "#3a5a40"); px(c, x + 3, y - 3, "#3a5a40"); }
}

function angel(c: Ctx, o: Origin, t: number) {
  const r = ANGEL;
  box(c, o, r.i0 + 0.3, r.j0 + 0.3, 1.4, 1.4, 6, shade("#5a5864", 0.14, 0.26));
  const [x, y] = lift(at(o, r.i0 + 1, r.j0 + 1), 6);
  rect(c, x - 2, y - 16, 5, 16, INK); rect(c, x - 1, y - 15, 3, 15, "#8a8a94"); // gövde ve etek
  disc(c, x, y - 18, 3, INK); disc(c, x, y - 18, 2, "#9a9aa4"); // baş
  for (const s of [-1, 1]) { poly(c, [[x + s * 2, y - 14], [x + s * 8, y - 20], [x + s * 7, y - 8], [x + s * 2, y - 6]], INK, 1); poly(c, [[x + s * 2, y - 14], [x + s * 8, y - 20], [x + s * 7, y - 8], [x + s * 2, y - 6]], "#7a7a84"); }
  if (Math.floor(t * 0.5) % 6 === 0) px(c, x - 1, y - 17, "#a0c8ff"); // gözyaşı parıltısı
}

function forge(c: Ctx, o: Origin, t: number) {
  const r = FORGE, H = 24;
  // taş ocak (arka sol), örs, fıçı, silah rafı; dört direkli ahşap saçak
  box(c, o, r.i0 + 0.3, r.j0 + 0.3, 2, 1.6, 14, shade("#4a3e3a", 0.12, 0.26));
  box(c, o, r.i0 + 1, r.j0 + 0.6, 0.6, 0.6, 22, shade("#3a302e"), 14); // baca
  const [fx, fy] = lift(at(o, r.i0 + 1.3, r.j0 + 1.9), 6);
  const fl = Math.sin(t * 9) > 0 ? 1 : 0;
  rect(c, fx - 5, fy - 3, 10, 4, INK); rect(c, fx - 4, fy - 2, 8, 2, fl ? "#ffb040" : "#f08030"); px(c, fx - 1, fy - 3, "#ffe08a");
  lights.push({ x: fx, y: fy - 2, r: 30 + fl * 3, color: "255,140,60" });
  for (let q = 0; q < 4; q++) { const ph = (t * 1.6 + q / 4) % 1; px(c, fx - 3 + Math.round(rnd(q + Math.floor(t * 1.6)) * 6), fy - 4 - Math.round(ph * 14), `rgba(255,200,90,${(1 - ph).toFixed(2)})`); }
  for (let q = 0; q < 4; q++) { const ph = (t * 0.3 + q / 4) % 1; const [sx, sy] = lift(at(o, r.i0 + 1.3, r.j0 + 0.9), 36); px(c, sx + Math.round(Math.sin(ph * 6 + q) * 2), sy - Math.round(ph * 18), `rgba(150,150,160,${(0.6 * (1 - ph)).toFixed(2)})`); }
  // örs
  const [ax, ay] = at(o, r.i0 + 3.5, r.j0 + 2.6);
  rect(c, ax - 2, ay - 5, 4, 5, INK); rect(c, ax - 5, ay - 8, 10, 3, INK); rect(c, ax - 4, ay - 7, 8, 1, "#6a6e7a"); rect(c, ax - 1, ay - 4, 2, 3, "#4a4e5a");
  if (Math.floor(t * 1.2) % 3 === 0) for (let q = 0; q < 3; q++) px(c, ax - 2 + q * 2, ay - 10 - q, "#ffe08a"); // çekiç kıvılcımı
  // fıçı ve raf
  const [bx, by] = at(o, r.i0 + 4.8, r.j0 + 1.2);
  rect(c, bx - 3, by - 8, 6, 8, INK); rect(c, bx - 2, by - 7, 4, 6, "#6a4a30"); rect(c, bx - 3, by - 6, 6, 1, "#2a2a2e"); rect(c, bx - 3, by - 3, 6, 1, "#2a2a2e");
  const [wx, wy] = at(o, r.i0 + 5.5, r.j0 + 3.6);
  rect(c, wx - 4, wy - 14, 8, 1, P.woodDk); rect(c, wx - 4, wy - 6, 8, 1, P.woodDk);
  for (let q = 0; q < 3; q++) { rect(c, wx - 3 + q * 3, wy - 16, 1, 12, "#9aa0ae"); px(c, wx - 3 + q * 3, wy - 17, "#e8ecf4"); }
  // saçak
  for (const [a, b] of [[r.i0, r.j0], [r.i1, r.j0], [r.i0, r.j1], [r.i1, r.j1]] as V[]) { const p = at(o, a, b); rect(c, p[0] - 1, p[1] - H, 2, H, P.woodDk); }
  poly(c, [lift(at(o, r.i0, r.j0), H + 6), lift(at(o, r.i1, r.j0), H + 6), lift(at(o, r.i1, r.j1), H), lift(at(o, r.i0, r.j1), H)], INK, 1);
  poly(c, [lift(at(o, r.i0, r.j0), H + 6), lift(at(o, r.i1, r.j0), H + 6), lift(at(o, r.i1, r.j1), H), lift(at(o, r.i0, r.j1), H)], "#4a2a22");
  for (let q = 1; q < 5; q++) { const jj = r.j0 + (q / 5) * (r.j1 - r.j0); line(c, lift(at(o, r.i0, jj), H + 6 - (q / 5) * 6), lift(at(o, r.i1, jj), H + 6 - (q / 5) * 6), 1, "rgba(0,0,0,0.3)"); }
}

function mill(c: Ctx, o: Origin, t: number) {
  const r = MILL, H = 34, ci = r.i0 + 2, cj = r.j0 + 2;
  box(c, o, r.i0 + 0.5, r.j0 + 0.5, 3, 3, H, shade("#5a5260", 0.12, 0.26));
  box(c, o, r.i0 + 0.3, r.j0 + 0.3, 3.4, 3.4, 4, shade("#3a2a22"), H);
  poly(c, [lift(at(o, r.i0 + 0.3, r.j1 - 0.3), H + 4), lift(at(o, r.i1 - 0.3, r.j1 - 0.3), H + 4), lift(at(o, ci, cj), H + 20)], "#3a2230");
  poly(c, [lift(at(o, r.i1 - 0.3, r.j1 - 0.3), H + 4), lift(at(o, r.i1 - 0.3, r.j0 + 0.3), H + 4), lift(at(o, ci, cj), H + 20)], "#2a1824");
  // kapı ve pencere
  const [dx, dy] = at(o, ci, r.j1 - 0.5); rect(c, dx - 3, dy - 12, 6, 12, INK); rect(c, dx - 2, dy - 11, 4, 11, "#3a2418");
  const [wx, wy] = at(o, r.i1 - 0.5, cj); rect(c, wx - 2, wy - 26, 4, 5, INK); rect(c, wx - 1, wy - 25, 2, 3, "#f0b860");
  lights.push({ x: wx, y: wy - 24, r: 12, color: "255,190,110" });
  // dönen kanatlar (ön yüzde)
  const [hx, hy] = lift(at(o, ci, r.j1 - 0.4), H - 4), a0 = t * 0.6;
  for (let q = 0; q < 4; q++) {
    const a = a0 + (q * Math.PI) / 2, ex = hx + Math.cos(a) * 22, ey = hy + Math.sin(a) * 22;
    line(c, [hx, hy], [ex, ey], 2, INK); line(c, [hx, hy], [ex, ey], 1, P.woodLt);
    const nx = -Math.sin(a), ny = Math.cos(a);
    poly(c, [[hx + Math.cos(a) * 6, hy + Math.sin(a) * 6], [ex, ey], [ex + nx * 5, ey + ny * 5], [hx + Math.cos(a) * 6 + nx * 5, hy + Math.sin(a) * 6 + ny * 5]], "rgba(200,190,170,0.85)");
  }
  disc(c, hx, hy, 2, INK);
}

function well(c: Ctx, o: Origin) {
  const r = WELL, ci = r.i0 + 1, cj = r.j0 + 1;
  box(c, o, r.i0 + 0.2, r.j0 + 0.2, 1.6, 1.6, 8, shade("#5a5864", 0.14, 0.26));
  tile(c, o, r.i0 + 0.45, r.j0 + 0.45, "#0e1420", 1.1, 1.1);
  const top = (i: number, j: number) => lift(at(o, i, j), 8);
  for (const p of [top(r.i0 + 0.3, cj), top(r.i1 - 0.3, cj)]) rect(c, p[0] - 1, p[1] - 14, 2, 14, P.woodDk);
  const [lx, ly] = top(r.i0 + 0.3, cj), [rx, ry] = top(r.i1 - 0.3, cj);
  line(c, [lx, ly - 12], [rx, ry - 12], 1, P.woodLt);
  poly(c, [[lx - 3, ly - 14], [rx + 3, ry - 14], [Math.round((lx + rx) / 2), Math.round((ly + ry) / 2) - 22]], "#4a2a22");
  const [bx, by] = top(ci, cj); line(c, [bx, by - 12], [bx, by - 5], 1, "#8a7a6a"); rect(c, bx - 2, by - 5, 4, 3, "#5a3a26");
}

function campfire(c: Ctx, o: Origin, t: number, near: number) {
  const r = CAMPFIRE, [x, y] = at(o, r.i0 + 1, r.j0 + 1);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; const sx = Math.round(x + Math.cos(a) * 9), sy = Math.round(y + Math.sin(a) * 4.5); rect(c, sx - 2, sy - 2, 4, 3, INK); rect(c, sx - 1, sy - 2, 2, 2, "#6a6874"); }
  line(c, [x - 7, y + 1], [x + 6, y - 2], 3, INK); line(c, [x - 6, y + 1], [x + 5, y - 2], 1, "#5a3a26");
  line(c, [x - 6, y - 2], [x + 7, y + 1], 3, INK); line(c, [x - 5, y - 2], [x + 6, y + 1], 1, "#6a4430");
  for (let i = -4; i <= 4; i++) {
    const h = Math.max(2, Math.round(10 - Math.abs(i) * 1.8 + Math.sin(t * 11 + i * 1.7) * 2.5));
    for (let q = 0; q < h; q++) px(c, x + i, y - 2 - q, q < h * 0.35 ? "#ffe08a" : q < h * 0.7 ? "#f0a24a" : "#c8463a");
  }
  for (let q = 0; q < 6; q++) { const ph = (t * 0.9 + q / 6) % 1; px(c, x - 4 + Math.round(rnd(q * 3 + Math.floor(t * 0.9 + q / 6)) * 8) + Math.round(Math.sin(ph * 5) * 2), y - 10 - Math.round(ph * 22), `rgba(255,190,80,${(1 - ph).toFixed(2)})`); }
  lights.push({ x, y: y - 6, r: 46 + Math.round(Math.sin(t * 7) * 3), color: "255,150,70" });
  // ikiniz de ateşin başındaysanız aranızda kalpler
  if (near >= 2) for (let k = 0; k < 3; k++) {
    const q = (t * 0.5 + k / 3) % 1, hx = Math.round(x - 6 + k * 6 + Math.sin(q * 6 + k) * 2), hy = Math.round(y - 24 - q * 16);
    c.save(); c.globalAlpha = 1 - q; px(c, hx, hy, "#d8485a"); px(c, hx + 2, hy, "#d8485a"); rect(c, hx - 1, hy + 1, 5, 1, "#d8485a"); rect(c, hx, hy + 2, 3, 1, "#d8485a"); px(c, hx + 1, hy + 3, "#d8485a"); c.restore();
  }
}

function lantern(c: Ctx, o: Origin, i: number, j: number, t: number) {
  const [x, y] = at(o, i + 0.5, j + 0.5), fl = Math.sin(t * 8 + i * 1.3 + j) > 0.2 ? 1 : 0;
  rect(c, x - 3, y - 1, 6, 2, "rgba(0,0,0,0.3)");
  rect(c, x - 1, y - 22, 2, 22, INK); rect(c, x - 2, y - 2, 4, 2, INK);
  rect(c, x, y - 22, 4, 1, INK); rect(c, x + 3, y - 22, 1, 3, INK);
  rect(c, x + 1, y - 19, 5, 6, INK); rect(c, x + 2, y - 18, 3, 4, fl ? "#ffd070" : "#f0a24a"); px(c, x + 3, y - 20, INK);
  lights.push({ x: x + 3, y: y - 16, r: 22 + fl * 2, color: "255,190,110" });
}

function southGate(c: Ctx, o: Origin, t: number, k: Kit) {
  const { d } = SIZE.bahce, i0 = ROAD.i0 - 0.6, i1 = ROAD.i1 + 0.6, tf = shade("#3e3a48", 0.12, 0.22);
  box(c, o, i0 - 0.6, d - 0.4, 0.8, 0.8, 34, tf); box(c, o, i1 - 0.2, d - 0.4, 0.8, 0.8, 34, tf);
  const lj = d + 0.4;
  k.faceJ(c, o, lj, i0 + 0.2, i1 - 0.2, 26, 34, "#3a3644");
  k.archJ(c, o, lj, i0 + 0.2, i1 - 0.2, 0, 26, "rgba(0,0,0,0)", 6);
  for (let q = 0; q < 5; q++) { const p = at(o, i0 + 0.5 + q * 0.6, lj); rect(c, p[0], p[1] - 24, 1, 10, "#24242c"); px(c, p[0], p[1] - 14, "#4a4a56"); } // yarı inik parmaklık
  k.torch(c, o, i0 - 0.2, lj, t, 22); k.torch(c, o, i1 + 0.2, lj, t, 22);
}

/* ---------------------------- kuzgunlar, baykuş, sis ---------------------------- */

const ravenState = new Map<number, number>(); // ağaç → kaçtığı an
/** Ölü ağaçlarda tüneyen kuzgunlar (yaklaşınca havalanır, sonra döner), mezarlık ağacında baykuş, bataklıkta sis. Dönen: bu karede kuzgun kaçtı mı */
export function above(c: Ctx, o: Origin, t: number, heroes: Who[], night: number, weather: Weather): boolean {
  let fled = false;
  RAVEN_TREES.forEach(([i, j], k) => {
    const [x, y] = at(o, i + 0.5, j + 0.5), since = t - (ravenState.get(k) ?? -99);
    const close = heroes.some((h) => Math.hypot(h.i - i - 0.5, h.j - j - 0.5) < 3);
    if (close && since > 14) { ravenState.set(k, t); fled = true; }
    const birds: V[] = [[x - 6, y - 26], [x + 5, y - 30], [x, y - 33]];
    birds.forEach(([bx, by], q) => {
      if (since < 14) {
        const f = since * (1.2 + q * 0.2);
        if (since > 12) { // geri dönüş
          const back = (14 - since) / 2; drawRaven(c, Math.round(bx + back * 40), Math.round(by - back * 30), t, true); return;
        }
        if (f > 6) return;
        drawRaven(c, Math.round(bx - f * 20 + q * 6), Math.round(by - f * 14 - q * 3), t + q, true);
      } else drawRaven(c, bx, by, t + q * 2.1, false);
    });
  });
  // baykuş: mezarlık ağacının dalında; gece gözleri parlar, arada kırpar
  const [ox, oy] = at(o, OWL_TREE[0] + 0.5, OWL_TREE[1] + 0.5), bx = ox + 4, by = oy - 26;
  rect(c, bx - 3, by - 6, 7, 8, INK); rect(c, bx - 2, by - 5, 5, 6, "#6a5040"); rect(c, bx - 2, by - 7, 1, 1, INK); rect(c, bx + 2, by - 7, 1, 1, INK);
  rect(c, bx - 1, by - 1, 3, 2, "#8a7058");
  const blink = (t % 5) < 0.15, eye = night > 0.4 ? "#ffd84a" : "#e8c860";
  if (!blink) { px(c, bx - 1, by - 4, eye); px(c, bx + 1, by - 4, eye); } else { px(c, bx - 1, by - 4, INK); px(c, bx + 1, by - 4, INK); }
  px(c, bx, by - 3, "#c8a040");
  if (night > 0.4) { lights.push({ x: bx, y: by - 4, r: 5, color: "255,220,90" }); }
  // bataklık ve mezarlık sisi
  const mist = weather === "sis" ? 0.16 : 0.08;
  for (const [r, n] of [[SWAMP, 7], [GRAVEYARD, 4]] as const) for (let q = 0; q < n; q++) {
    const i = r.i0 + 1 + rnd(q * 3.7 + r.i0) * (r.i1 - r.i0 - 2) + Math.sin(t * 0.3 + q) * 1.2, j = r.j0 + 1 + rnd(q * 5.3 + r.j0) * (r.j1 - r.j0 - 2);
    const [x, y] = at(o, i, j);
    const g = c.createRadialGradient(x, y - 3, 0, x, y - 3, 34);
    g.addColorStop(0, `rgba(170,186,190,${mist})`); g.addColorStop(1, "rgba(170,186,190,0)");
    c.fillStyle = g; c.fillRect(x - 34, y - 37, 68, 68);
  }
  return fled;
}

function drawRaven(c: Ctx, x: number, y: number, t: number, flying: boolean) {
  const up = flying && Math.floor(t * 10) % 2;
  rect(c, x - 2, y - 2, 4, 3, "#08060c"); px(c, x + 2, y - 2, "#08060c"); px(c, x + 3, y - 1, "#3a3a44"); // gövde, baş, gaga
  px(c, x + 2, y - 3, "#a8a8b8"); // göz
  if (flying) { rect(c, x - 4, y - (up ? 4 : 0), 3, 1, "#08060c"); rect(c, x + 1, y - (up ? 4 : 0), 3, 1, "#08060c"); }
  else { px(c, x - 3, y, "#08060c"); px(c, x - 1, y + 1, "#2a2a30"); px(c, x + 1, y + 1, "#2a2a30"); }
}

/** Kar taneleri (ekran pikseli, yavaş ve salınarak) */
export function snowfall(c: Ctx, w: number, h: number, t: number) {
  for (let k = 0; k < 140; k++) {
    const sp = 12 + rnd(k) * 18, x = (rnd(k * 2.3) * w + Math.sin(t * 0.8 + k) * 6 + t * 4) % w, y = (rnd(k * 5.1) * h + t * sp) % h;
    px(c, Math.round(x), Math.round(y), k % 5 ? "rgba(235,240,255,0.7)" : "rgba(255,255,255,0.95)");
    if (k % 9 === 0) px(c, Math.round(x) + 1, Math.round(y), "rgba(235,240,255,0.5)");
  }
}
