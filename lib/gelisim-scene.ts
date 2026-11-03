// Gelişim sahnelerinin çizimi: kişinin izometrik odası ve ortak bahçe. Durum (konumlar, eşyalar) dışarıdan gelir.
import { duldul, parrot } from "./companions";
import { lights } from "./env";
import { type Origin, at, tile } from "./iso";
import { type CharState, type Ctx, P, STAND, drawCharacter, line, poly, px, rect } from "./pixel";
import { GARDEN_DOORS, type Placed, ROOM_DOOR, SIZE, footprint } from "./room";
import { type Scope, itemById } from "./room-items";
import { walkFrame } from "./anim";

// her sahnenin kendi tuval boyutu: oda tuvali doldursun, bahçe geniş olsun
export const VIEW: Record<Scope, [number, number]> = { oda: [160, 120], bahce: [240, 160] };
export const ORIGIN: Record<Scope, Origin> = { oda: { ox: 80, oy: 47 }, bahce: { ox: 108, oy: 56 } };
const WALL_H = 40;

export type Hero = { who: "cengiz" | "aysenur"; i: number; j: number; dir: 1 | -1; dist: number; moving: boolean; outfit: CharState["outfit"]; tint?: CharState["tint"] };
export type Ghost = { itemId: string; tx: number; ty: number; ok: boolean } | null;
export type Cat = { i: number; j: number; dir: 1 | -1; dist: number; moving: boolean };
export type SceneState = {
  scope: Scope;
  placed: Placed[]; // bu sahnede görünenler
  heroes: Hero[];
  ghost: Ghost;
  pick: string | null; // düzenleme modunda üstüne gelinen eşya
  cat: Cat | null;
};
export type Anchor = { key: string; x: number; y: number };

/* --------------------------------- duvarlar -------------------------------- */

function wallLeft(c: Ctx, o: Origin, d: number, h: number, colors: [string, string]) {
  for (let j = 0; j < d; j++) {
    const a = at(o, 0, j), b = at(o, 0, j + 1);
    poly(c, [a, b, [b[0], b[1] - h], [a[0], a[1] - h]], colors[j % 2]);
    for (let y = 6; y < h; y += 7) line(c, [a[0], a[1] - y], [b[0], b[1] - y], 1, "rgba(26,20,38,0.35)");
  }
}
function wallRight(c: Ctx, o: Origin, w: number, h: number, colors: [string, string]) {
  for (let i = 0; i < w; i++) {
    const a = at(o, i, 0), b = at(o, i + 1, 0);
    poly(c, [a, b, [b[0], b[1] - h], [a[0], a[1] - h]], colors[i % 2]);
    for (let y = 6; y < h; y += 7) line(c, [a[0], a[1] - y], [b[0], b[1] - y], 1, "rgba(26,20,38,0.25)");
  }
}
// duvardaki dikdörtgen (pencere, kapı, tablo): sol duvarda j boyunca, sağ duvarda i boyunca eğik
function onLeftWall(c: Ctx, o: Origin, j0: number, j1: number, y0: number, y1: number, color: string) {
  const a = at(o, 0, j0), b = at(o, 0, j1);
  poly(c, [[a[0], a[1] - y0], [b[0], b[1] - y0], [b[0], b[1] - y1], [a[0], a[1] - y1]], color);
}
function onRightWall(c: Ctx, o: Origin, i0: number, i1: number, y0: number, y1: number, color: string) {
  const a = at(o, i0, 0), b = at(o, i1, 0);
  poly(c, [[a[0], a[1] - y0], [b[0], b[1] - y0], [b[0], b[1] - y1], [a[0], a[1] - y1]], color);
}

/* ----------------------------------- oda ----------------------------------- */

function room(c: Ctx, t: number) {
  const o = ORIGIN.oda, { w, d } = SIZE.oda;
  c.fillStyle = "#141a33"; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  wallLeft(c, o, d, WALL_H, ["#6e5f62", "#685a5e"]);
  wallRight(c, o, w, WALL_H, ["#7a6a6c", "#746466"]);
  // duvar üst pervazı ve köşe
  line(c, [at(o, 0, d)[0], at(o, 0, d)[1] - WALL_H], [at(o, 0, 0)[0], at(o, 0, 0)[1] - WALL_H], 2, P.woodDk);
  line(c, [at(o, 0, 0)[0], at(o, 0, 0)[1] - WALL_H], [at(o, w, 0)[0], at(o, w, 0)[1] - WALL_H], 2, P.woodDk);
  line(c, at(o, 0, 0), [at(o, 0, 0)[0], at(o, 0, 0)[1] - WALL_H], 1, "#4f4249");
  // pencere (sağ duvar): gökyüzü, bulut, haç kayıt
  onRightWall(c, o, 2, 3.6, 12, 32, P.ink);
  onRightWall(c, o, 2.12, 3.48, 14, 30, "#7fb0dc");
  const cl = (t * 1.5) % 14;
  onRightWall(c, o, 2.2 + cl / 14, 2.6 + cl / 14, 24, 26, "#ffffff");
  onRightWall(c, o, 2.76, 2.84, 14, 30, P.ink);
  onRightWall(c, o, 2.12, 3.48, 21, 22, P.ink);
  onRightWall(c, o, 1.9, 3.7, 10, 12, P.woodLt);
  // pencereden düşen ışık
  poly(c, [at(o, 2.2, 0.2), at(o, 3.6, 0.2), at(o, 4.6, 2.4), at(o, 3.2, 2.4)], "rgba(255,240,200,0.10)");
  // tablo (sağ duvar)
  onRightWall(c, o, 5.2, 6.4, 16, 30, P.ink); onRightWall(c, o, 5.28, 6.32, 17, 29, P.gold); onRightWall(c, o, 5.4, 6.2, 19, 27, "#2f3b6b");
  { const [x, y] = at(o, 5.8, 0); px(c, x - 1, y - 24, "#e48aa0"); px(c, x + 1, y - 24, "#e48aa0"); rect(c, x - 1, y - 23, 3, 1, "#e48aa0"); px(c, x, y - 22, "#e48aa0"); }
  // kapı (sol duvar)
  onLeftWall(c, o, ROOM_DOOR.j - 0.05, ROOM_DOOR.j + 1.05, 0, 28, P.ink);
  onLeftWall(c, o, ROOM_DOOR.j + 0.08, ROOM_DOOR.j + 0.92, 0, 26, "#6b4a35");
  onLeftWall(c, o, ROOM_DOOR.j + 0.08, ROOM_DOOR.j + 0.92, 13, 14, "#4a3224");
  { const [x, y] = at(o, 0, ROOM_DOOR.j + 0.75); px(c, x, y - 12, P.gold); }
  // zemin: tahta döşeme
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) tile(c, o, i, j, (i + j) % 2 ? "#8c6448" : "#84603f");
  for (let i = 0; i <= w; i++) line(c, at(o, i, 0), at(o, i, d), 1, "rgba(74,50,36,0.45)");
  // kapı eşiği
  tile(c, o, 0, ROOM_DOOR.j, "#a87a50", 0.35, 1);
}

/* ---------------------------------- bahçe ---------------------------------- */

function house(c: Ctx, o: Origin, i0: number, i1: number, wall: string, roof: string) {
  onRightWall(c, o, i0, i1, 0, 34, P.ink);
  onRightWall(c, o, i0 + 0.05, i1 - 0.05, 0, 33, wall);
  for (let y = 5; y < 33; y += 7) onRightWall(c, o, i0 + 0.05, i1 - 0.05, y, y + 1, "rgba(26,20,38,0.18)");
  onRightWall(c, o, i0 - 0.25, i1 + 0.25, 33, 46, P.ink);
  onRightWall(c, o, i0 - 0.2, i1 + 0.2, 34, 45, roof);
  for (let y = 36; y < 45; y += 3) onRightWall(c, o, i0 - 0.2, i1 + 0.2, y, y + 1, "rgba(26,20,38,0.25)");
}
function window2(c: Ctx, o: Origin, i: number) {
  onRightWall(c, o, i, i + 1, 14, 26, P.ink); onRightWall(c, o, i + 0.1, i + 0.9, 15, 25, "#a9cce6");
  onRightWall(c, o, i + 0.47, i + 0.53, 15, 25, P.ink);
  onRightWall(c, o, i - 0.05, i + 1.05, 11, 14, "#6b4a35");
  for (let k = 0; k < 4; k++) { const [x, y] = at(o, i + 0.15 + k * 0.23, 0); px(c, x, y - 15, k % 2 ? "#e48aa0" : "#f3d48a"); }
}

function garden(c: Ctx, t: number) {
  const o = ORIGIN.bahce, { w, d } = SIZE.bahce;
  // gökyüzü ve uzak tepeler
  const g = c.createLinearGradient(0, 0, 0, 70);
  g.addColorStop(0, "#7fb0dc"); g.addColorStop(1, "#d8e8ef");
  const W = c.canvas.width, H = c.canvas.height;
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const cl = (t * 3) % (W + 40) - 40;
  rect(c, cl, 10, 22, 4, "#ffffff"); rect(c, cl + 5, 7, 12, 3, "#ffffff"); rect(c, (cl + 130) % (W + 40) - 40, 18, 16, 3, "#f4f8fa");
  for (let x = 0; x < W; x++) { const y = 46 + Math.round(Math.sin(x * 0.05) * 4 + Math.sin(x * 0.13) * 2); rect(c, x, y, 1, H - y, "#6f9a6a"); }
  // evler arka duvar boyunca: Cengiz'in (sol) ve Ayşenur'un (sağ) kapısı
  house(c, o, 0.6, 6.4, "#e6d3a8", "#8a3a4a");
  house(c, o, 7.6, 13.4, "#d8c8e0", "#2f3b6b");
  for (const k of [1.4, 4.6]) window2(c, o, k);
  for (const k of [8.4, 11.6]) window2(c, o, k);
  GARDEN_DOORS.forEach((dr) => {
    onRightWall(c, o, dr.i - 0.05, dr.i + 1.05, 0, 26, P.ink);
    onRightWall(c, o, dr.i + 0.08, dr.i + 0.92, 0, 25, "#6b4a35");
    onRightWall(c, o, dr.i + 0.08, dr.i + 0.92, 12, 13, "#4a3224");
    const [x, y] = at(o, dr.i + 0.78, 0); px(c, x, y - 11, P.gold);
  });
  // evler arasında çit ve sol kenarda çalı
  for (let i = 6.5; i < 7.6; i += 0.25) { const [x, y] = at(o, i, 0); rect(c, x, y - 10, 1, 10, "#f2e4c2"); }
  for (let j = 0; j < d; j++) { const a = at(o, 0, j), b = at(o, 0, j + 1); poly(c, [a, b, [b[0], b[1] - 9], [a[0], a[1] - 9]], j % 2 ? "#3f6a44" : "#4f7a4f"); }
  // çimen ve taş yollar
  const path = (i: number, j: number) => GARDEN_DOORS.some((dr) => i === dr.i && j <= 6) || j === 6;
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    if (path(i, j)) { tile(c, o, i, j, (i + j) % 2 ? "#b8b0a0" : "#a8a090"); tile(c, o, i + 0.2, j + 0.2, "#c8c0b0", 0.25, 0.25); }
    else {
      tile(c, o, i, j, (i * 7 + j * 3) % 5 ? ((i + j) % 2 ? "#5f9e6e" : "#579464") : "#4f8a5c");
      if ((i * 13 + j * 7) % 9 === 0) { const [x, y] = at(o, i + 0.5, j + 0.5); px(c, x, y, "#e48aa0"); px(c, x + 3, y + 1, "#f3d48a"); }
    }
  }
}

/* -------------------------------- sahne çizimi ------------------------------- */

const hasHeight = (id: string) => id !== "hali";

/** Bütün sahne. Dönen değer: isim etiketlerinin ekran noktaları (dünya pikseli). */
export function drawScene(c: Ctx, t: number, s: SceneState): Anchor[] {
  lights.length = 0;
  const o = ORIGIN[s.scope];
  if (s.scope === "oda") room(c, t); else garden(c, t);

  // önce düz eşyalar (halı), sonra derinlik sırasıyla eşyalar ve karakterler
  for (const p of s.placed) if (!hasHeight(p.itemId)) itemById.get(p.itemId)?.draw(c, o, p.tx, p.ty, t);
  type D = { key: number; draw: () => void };
  const list: D[] = [];
  for (const p of s.placed) {
    if (!hasHeight(p.itemId)) continue;
    const it = itemById.get(p.itemId); if (!it) continue;
    list.push({ key: p.tx + it.size[0] / 2 + p.ty + it.size[1] / 2, draw: () => it.draw(c, o, p.tx, p.ty, t) });
  }
  const anchors: Anchor[] = [];
  for (const h of s.heroes) {
    list.push({ key: h.i + h.j, draw: () => {
      const [x, y] = at(o, h.i, h.j);
      rect(c, x - 5, y - 1, 10, 2, "rgba(26,20,38,0.28)");
      const a = drawCharacter(c, { who: h.who, x, y, dir: h.dir, pose: h.moving ? walkFrame(h.dist) : STAND, outfit: h.outfit, tint: h.tint, blink: (t + (h.who === "cengiz" ? 0 : 1.7)) % 4 < 0.12 });
      anchors.push({ key: h.who, x: a.head[0], y: a.head[1] - 2 });
    } });
  }
  if (s.cat) {
    const k = s.cat;
    list.push({ key: k.i + k.j, draw: () => {
      const [x, y] = at(o, k.i, k.j);
      const a = duldul(c, x, y, k.dir, k.moving ? "walk" : "sit", k.dist, t, false);
      anchors.push({ key: "duldul", x: a.head[0], y: a.head[1] + 2 });
    } });
  }
  if (s.scope === "bahce") {
    // papağan: sol çalının köşesindeki tünekte
    list.push({ key: 0.6 + 8.6, draw: () => {
      const [x, y] = at(o, 0.6, 8.6);
      rect(c, x - 1, y - 18, 2, 18, P.woodDk); rect(c, x - 5, y - 19, 10, 2, P.woodLt);
      const a = parrot(c, [x + 1, y - 19], 1, "perch", t, false);
      anchors.push({ key: "parrot", x: a.head[0], y: a.head[1] });
    } });
  }
  list.sort((a, b) => a.key - b.key).forEach((d) => d.draw());

  // düzenleme: üstüne gelinen eşyanın kareleri
  if (s.pick) {
    const p = s.placed.find((q) => q.id === s.pick);
    if (p) for (const [a, b] of footprint(p.itemId, p.tx, p.ty)) tile(c, o, a, b, "rgba(232,96,96,0.35)");
  }
  // yerleştirme önizlemesi
  if (s.ghost) {
    const g = s.ghost;
    for (const [a, b] of footprint(g.itemId, g.tx, g.ty)) tile(c, o, a, b, g.ok ? "rgba(120,220,140,0.45)" : "rgba(232,96,96,0.45)");
    c.save(); c.globalAlpha = 0.7; itemById.get(g.itemId)?.draw(c, o, g.tx, g.ty, t); c.restore();
  }

  // mum, fener, ateş ışıkları
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const l of lights) {
    const gr = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    gr.addColorStop(0, `rgba(${l.color},0.22)`); gr.addColorStop(1, `rgba(${l.color},0)`);
    c.fillStyle = gr; c.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  c.restore();
  return anchors;
}

/** Envanter kartındaki küçük önizleme: eşyayı ortalayarak çizer */
export function drawItemPreview(c: Ctx, w: number, h: number, itemId: string, t: number) {
  const it = itemById.get(itemId); if (!it) return;
  c.clearRect(0, 0, w, h);
  lights.length = 0;
  const [sw, sd] = it.size;
  const o: Origin = { ox: w / 2 - (sw - sd) * 4, oy: h - 6 - (sw + sd) * 4 };
  it.draw(c, o, 0, 0, t);
}

