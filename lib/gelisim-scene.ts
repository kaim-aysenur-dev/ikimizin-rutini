// Gelişim sahnelerinin çizimi: kişinin altı odalı evi ve ortak bahçe. Kamera karakteri takip eder;
// durum (konumlar, eşyalar) dışarıdan gelir. Duvarlar "kesit" tarzı: dış arka duvarlar tam, iç duvarlar alçak.
import { duldul, parrot } from "./companions";
import { lights } from "./env";
import { type Origin, at, box, shade, tile } from "./iso";
import { type CharState, type Ctx, type V, P, STAND, drawCharacter, line, poly, px, rect } from "./pixel";
import { FRONT_DOOR, HOUSES, POND, type Placed, ROOMS, type RoomId, SIZE, TREES, footprint, innerWalls, isPath } from "./room";
import { type Scope, isFlat, itemById } from "./room-items";
import { walkFrame } from "./anim";

const WALL_H = 44;
export type Theme = "cengiz" | "aysenur";
export type Hero = { who: Theme; i: number; j: number; dir: 1 | -1; dist: number; moving: boolean; outfit: CharState["outfit"]; tint?: CharState["tint"] };
export type Ghost = { itemId: string; tx: number; ty: number; ok: boolean } | null;
export type Cat = { i: number; j: number; dir: 1 | -1; dist: number; moving: boolean };
export type SceneState = {
  scope: Scope;
  cam: Origin;
  theme: Theme; // evin sahibi
  houseThemes: Theme[]; // bahçedeki evlerin sahipleri, sırayla
  placed: Placed[];
  heroes: Hero[];
  ghost: Ghost;
  pick: string | null;
  cat: Cat | null;
};
export type Anchor = { key: string; x: number; y: number };

/* ------------------------------ duvar yüzleri ------------------------------ */

// j = sabit düzlemde, i boyunca uzanan dikdörtgen (sağ arka duvar, binanın sol-ön yüzü)
function faceJ(c: Ctx, o: Origin, j: number, i0: number, i1: number, y0: number, y1: number, color: string) {
  const a = at(o, i0, j), b = at(o, i1, j);
  poly(c, [[a[0], a[1] - y0], [b[0], b[1] - y0], [b[0], b[1] - y1], [a[0], a[1] - y1]], color);
}
// i = sabit düzlemde, j boyunca uzanan dikdörtgen (sol arka duvar, binanın sağ-ön yüzü)
function faceI(c: Ctx, o: Origin, i: number, j0: number, j1: number, y0: number, y1: number, color: string) {
  const a = at(o, i, j0), b = at(o, i, j1);
  poly(c, [[a[0], a[1] - y0], [b[0], b[1] - y0], [b[0], b[1] - y1], [a[0], a[1] - y1]], color);
}
function windowJ(c: Ctx, o: Origin, j: number, i: number, t: number, w = 1.4) {
  faceJ(c, o, j, i, i + w, 14, 34, P.ink); faceJ(c, o, j, i + 0.1, i + w - 0.1, 16, 32, "#7fb0dc");
  const cl = (t * 0.12 + i) % 1; faceJ(c, o, j, i + 0.15 + cl * (w - 0.6), i + 0.45 + cl * (w - 0.6), 26, 28, "#ffffff");
  faceJ(c, o, j, i + w / 2 - 0.04, i + w / 2 + 0.04, 16, 32, P.ink); faceJ(c, o, j, i + 0.1, i + w - 0.1, 23, 24, P.ink);
  faceJ(c, o, j, i - 0.15, i + w + 0.15, 12, 14, P.woodLt);
  faceJ(c, o, j, i - 0.1, i + 0.12, 15, 35, "#b56b7a"); faceJ(c, o, j, i + w - 0.12, i + w + 0.1, 15, 35, "#b56b7a"); // perde
}
function windowI(c: Ctx, o: Origin, i: number, j: number, t: number, w = 1.4) {
  faceI(c, o, i, j, j + w, 14, 34, P.ink); faceI(c, o, i, j + 0.1, j + w - 0.1, 16, 32, "#7fb0dc");
  const cl = (t * 0.1 + j) % 1; faceI(c, o, i, j + 0.15 + cl * (w - 0.6), j + 0.45 + cl * (w - 0.6), 25, 27, "#ffffff");
  faceI(c, o, i, j + w / 2 - 0.04, j + w / 2 + 0.04, 16, 32, P.ink); faceI(c, o, i, j + 0.1, j + w - 0.1, 23, 24, P.ink);
  faceI(c, o, i, j - 0.15, j + w + 0.15, 12, 14, P.woodLt);
}
function painting(c: Ctx, o: Origin, j: number, i: number, inner: string, art: (x: number, y: number) => void) {
  faceJ(c, o, j, i, i + 1.1, 18, 32, P.ink); faceJ(c, o, j, i + 0.08, i + 1.02, 19, 31, P.gold); faceJ(c, o, j, i + 0.18, i + 0.92, 21, 29, inner);
  const [x, y] = at(o, i + 0.55, j); art(x, y - 25);
}

/* ------------------------------------ ev ------------------------------------ */

const THEME = {
  cengiz: { wall: ["#6e7a8e", "#68748a"], wallHi: "#8e9ab0", trim: "#3a4a6a", accent: "#2f3b6b", bed: "#7a8aa8" },
  aysenur: { wall: ["#b88a98", "#b08292"], wallHi: "#d4a8b6", trim: "#7a4a63", accent: "#8a3a4a", bed: "#c9a3b0" },
} as const;

const FLOOR: Record<RoomId, (i: number, j: number) => string> = {
  hol: (i, j) => ((i + j) % 2 ? "#a8a090" : "#98907f"),
  salon: (i, j) => ((i + j) % 2 ? "#8c6448" : "#84603f"),
  yatak: (i, j) => ((i + j) % 2 ? "#b08458" : "#a67c52"),
  mutfak: (i, j) => ((i + j) % 2 ? "#e8e0d0" : "#3a3346"),
  banyo: (i, j) => ((i + j) % 2 ? "#bfe0ea" : "#a8d0de"),
  calisma: (i, j) => ((i * 3 + j) % 5 ? "#4f7a4f" : "#4a744a"),
};

function house(c: Ctx, o: Origin, t: number, theme: Theme) {
  const { w, d } = SIZE.oda;
  const th = THEME[theme];
  // sol arka duvar (i = 0): holde temanın rengi, mutfakta krem ve fayans
  for (let j = 0; j < d; j++) {
    const kitchen = j >= 6;
    faceI(c, o, 0, j, j + 1, 0, WALL_H, kitchen ? (j % 2 ? "#e6d3a8" : "#e0cca0") : th.wall[j % 2]);
    for (let y = 7; y < WALL_H; y += 8) faceI(c, o, 0, j, j + 1, y, y + 1, "rgba(26,20,38,0.18)");
    if (kitchen) for (let y = 5; y < 19; y += 5) for (let k = 0; k < 2; k++) faceI(c, o, 0, j + k * 0.5, j + k * 0.5 + 0.45, y, y + 4, (j + k + y) % 2 ? "#ffffff" : "#d8e8ef");
  }
  // sağ arka duvar (j = 0): yatak odası kısmı daha yumuşak tonda
  for (let i = 0; i < w; i++) {
    faceJ(c, o, 0, i, i + 1, 0, WALL_H, i >= 14 ? th.bed : th.wall[i % 2]);
    for (let y = 7; y < WALL_H; y += 8) faceJ(c, o, 0, i, i + 1, y, y + 1, "rgba(26,20,38,0.15)");
    faceJ(c, o, 0, i, i + 1, 0, 5, th.trim); // süpürgelik
  }
  for (let j = 0; j < d; j++) faceI(c, o, 0, j, j + 1, 0, 5, th.trim);
  line(c, [at(o, 0, d)[0], at(o, 0, d)[1] - WALL_H], [at(o, 0, 0)[0], at(o, 0, 0)[1] - WALL_H], 2, P.ink);
  line(c, [at(o, 0, 0)[0], at(o, 0, 0)[1] - WALL_H], [at(o, w, 0)[0], at(o, w, 0)[1] - WALL_H], 2, P.ink);
  line(c, at(o, 0, 0), [at(o, 0, 0)[0], at(o, 0, 0)[1] - WALL_H], 1, "rgba(26,20,38,0.5)");

  // pencereler, tablolar, mutfak rafı
  windowJ(c, o, 0, 8, t); windowJ(c, o, 0, 11.2, t); windowJ(c, o, 0, 16.3, t);
  windowI(c, o, 0, 9.3, t);
  painting(c, o, 0, 2.4, th.accent, (x, y) => { px(c, x - 1, y, "#e48aa0"); px(c, x + 1, y, "#e48aa0"); rect(c, x - 1, y + 1, 3, 1, "#e48aa0"); px(c, x, y + 2, "#e48aa0"); });
  painting(c, o, 0, 14.6, "#4f7a4f", (x, y) => { rect(c, x - 2, y + 1, 5, 2, "#2e5240"); px(c, x + 1, y - 2, P.goldLt); });
  faceI(c, o, 0, 6.6, 8.6, 24, 25, P.woodDk);
  for (let k = 0; k < 5; k++) { const [x, y] = at(o, 0, 6.8 + k * 0.38); rect(c, x - 1, y - 29, 2, 4, ["#e48aa0", "#f3d48a", "#5fae6e", "#6f86d6", "#c8463a"][k]); }
  // ön kapı (holde, sol duvar)
  faceI(c, o, 0, FRONT_DOOR.j - 0.05, FRONT_DOOR.j + 1.05, 0, 30, P.ink);
  faceI(c, o, 0, FRONT_DOOR.j + 0.08, FRONT_DOOR.j + 0.92, 0, 28, "#6b4a35");
  faceI(c, o, 0, FRONT_DOOR.j + 0.2, FRONT_DOOR.j + 0.8, 20, 25, "#f3d48a");
  { const [x, y] = at(o, 0, FRONT_DOOR.j + 0.75); px(c, x, y - 13, P.gold); }

  // zeminler: her odanın kendi döşemesi
  for (const r of ROOMS) for (let i = r.i0; i < r.i1; i++) for (let j = r.j0; j < r.j1; j++) tile(c, o, i, j, FLOOR[r.id](i, j));
  for (let i = 6; i <= 14; i++) line(c, at(o, i, 0), at(o, i, 8), 1, "rgba(74,50,36,0.35)");
  tile(c, o, 0, FRONT_DOOR.j, "#c8b088", 0.35, 1);
  // kapı paspası
  tile(c, o, 0.4, FRONT_DOOR.j + 0.1, "#8a3a4a", 0.8, 0.8);
}

// iç duvar parçası (alçak): kare kare çizilir ki derinlik sırası doğru olsun; dış hat yok, parçalar kesintisiz birleşir
function innerWall(c: Ctx, o: Origin, wl: { i: number; j: number; axis: "i" | "j" }, th: (typeof THEME)[Theme]) {
  const f = { top: th.wallHi, left: th.wall[0], right: th.wall[1] };
  if (wl.axis === "j") {
    box(c, o, wl.i - 0.08, wl.j, 0.16, 1, 14, f, 0, false);
    line(c, [at(o, wl.i - 0.08, wl.j)[0], at(o, wl.i - 0.08, wl.j)[1] - 14], [at(o, wl.i - 0.08, wl.j + 1)[0], at(o, wl.i - 0.08, wl.j + 1)[1] - 14], 1, P.ink);
  } else {
    box(c, o, wl.i, wl.j - 0.08, 1, 0.16, 14, f, 0, false);
    line(c, [at(o, wl.i, wl.j - 0.08)[0], at(o, wl.i, wl.j - 0.08)[1] - 14], [at(o, wl.i + 1, wl.j - 0.08)[0], at(o, wl.i + 1, wl.j - 0.08)[1] - 14], 1, P.ink);
  }
}

/* ---------------------------------- bahçe ---------------------------------- */

function gardenGround(c: Ctx, o: Origin, t: number) {
  const { w, d } = SIZE.bahce;
  c.fillStyle = "#2a4a36"; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    if (isPath(i, j)) { tile(c, o, i, j, (i + j) % 2 ? "#c0b8a6" : "#b0a896"); tile(c, o, i + 0.25, j + 0.25, "#d0c8b6", 0.2, 0.2); continue; }
    tile(c, o, i, j, (i * 7 + j * 3) % 5 ? ((i + j) % 2 ? "#5f9e6e" : "#579464") : "#4f8a5c");
    const n = (i * 13 + j * 7) % 11;
    if (n === 0) { const [x, y] = at(o, i + 0.5, j + 0.5); px(c, x, y, "#e48aa0"); px(c, x + 3, y + 1, "#f3d48a"); }
    if (n === 5) { const [x, y] = at(o, i + 0.4, j + 0.6); px(c, x, y - 1, "#7fbf7a"); px(c, x + 1, y - 2, "#7fbf7a"); }
  }
  // gölet: kıyı taşları, kıpırdayan su, nilüfer, balık
  for (let i = POND.i0; i < POND.i1; i++) for (let j = POND.j0; j < POND.j1; j++) {
    const edge = i === POND.i0 || j === POND.j0 || i === POND.i1 - 1 || j === POND.j1 - 1;
    tile(c, o, i, j, edge ? "#8e95a3" : (i + j + Math.floor(t * 1.5)) % 3 ? "#4a8ab8" : "#5a9ac8");
  }
  for (const [a, b] of [[17, 16], [19, 18]] as V[]) { const [x, y] = at(o, a + 0.5, b + 0.5); rect(c, x - 2, y - 1, 5, 2, "#4f7a4f"); px(c, x, y - 2, "#e48aa0"); }
  const fy = Math.round(Math.sin(t * 2)); { const [x, y] = at(o, 18.2, 17.4); rect(c, x, y + fy, 3, 1, "#f0a24a"); }
  // dış çit (arka kenarlar)
  for (let j = 0; j < d; j++) { const a = at(o, 0, j), b = at(o, 0, j + 1); rect(c, a[0] - 1, a[1] - 8, 2, 8, "#e6d3a8"); line(c, [a[0], a[1] - 6], [b[0], b[1] - 6], 1, "#e6d3a8"); }
  for (let i = 0; i < w; i++) { const a = at(o, i, 0), b = at(o, i + 1, 0); rect(c, a[0] - 1, a[1] - 8, 2, 8, "#e6d3a8"); line(c, [a[0], a[1] - 6], [b[0], b[1] - 6], 1, "#e6d3a8"); }
}

const HOUSE_LOOK: Record<Theme, { wall: string; roof: string; door: string }> = {
  cengiz: { wall: "#e6d3a8", roof: "#2f3b6b", door: "#6b4a35" },
  aysenur: { wall: "#e8cfd8", roof: "#8a3a4a", door: "#7a4a63" },
};

function houseOutside(c: Ctx, o: Origin, h: (typeof HOUSES)[number], theme: Theme, t: number): V {
  const L = HOUSE_LOOK[theme], H = 36, R = 22;
  const w = h.i1 - h.i0, d = h.j1 - h.j0, jm = h.j0 + d / 2;
  const faces = shade(L.wall, 0.15, 0.18);
  box(c, o, h.i0, h.j0, w, d, H, faces);
  for (let y = 8; y < H; y += 8) { faceJ(c, o, h.j1, h.i0, h.i1, y, y + 1, "rgba(26,20,38,0.12)"); faceI(c, o, h.i1, h.j0, h.j1, y, y + 1, "rgba(26,20,38,0.12)"); }
  // pencereler ve çiçek kutuları
  for (const i of [h.i0 + 1, h.i0 + 6.5]) {
    faceJ(c, o, h.j1, i, i + 1.4, 14, 28, P.ink); faceJ(c, o, h.j1, i + 0.1, i + 1.3, 15, 27, "#a9cce6"); faceJ(c, o, h.j1, i + 0.66, i + 0.74, 15, 27, P.ink);
    faceJ(c, o, h.j1, i - 0.1, i + 1.5, 11, 14, "#6b4a35");
    for (let k = 0; k < 5; k++) { const [x, y] = at(o, i + 0.1 + k * 0.28, h.j1); px(c, x, y - 15, k % 2 ? "#e48aa0" : "#f3d48a"); }
  }
  for (const j of [h.j0 + 1.2, h.j0 + 3.6]) { faceI(c, o, h.i1, j, j + 1.2, 14, 28, P.ink); faceI(c, o, h.i1, j + 0.1, j + 1.1, 15, 27, "#a9cce6"); }
  // kapı ve üstündeki kalpli pencere
  faceJ(c, o, h.j1, h.door.i - 0.05, h.door.i + 1.05, 0, 28, P.ink);
  faceJ(c, o, h.j1, h.door.i + 0.08, h.door.i + 0.92, 0, 27, L.door);
  faceJ(c, o, h.j1, h.door.i + 0.25, h.door.i + 0.75, 20, 24, "#f3d48a");
  { const [x, y] = at(o, h.door.i + 0.8, h.j1); px(c, x, y - 12, P.gold); }
  { const [x, y] = at(o, h.door.i + 0.5, h.j1); px(c, x - 1, y - 32, "#e48aa0"); px(c, x + 1, y - 32, "#e48aa0"); rect(c, x - 1, y - 31, 3, 1, "#e48aa0"); px(c, x, y - 30, "#e48aa0"); }
  // çatı: arka eğim, sağ alınlık, ön eğim
  const lift = (p: V, z: number): V => [p[0], p[1] - z];
  poly(c, [lift(at(o, h.i0, h.j0), H), lift(at(o, h.i1, h.j0), H), lift(at(o, h.i1, jm), H + R), lift(at(o, h.i0, jm), H + R)], P.ink, 1);
  poly(c, [lift(at(o, h.i1, h.j0), H), lift(at(o, h.i1, h.j1), H), lift(at(o, h.i1, jm), H + R)], faces.right);
  const front: V[] = [lift(at(o, h.i0, h.j1), H), lift(at(o, h.i1, h.j1), H), lift(at(o, h.i1, jm), H + R), lift(at(o, h.i0, jm), H + R)];
  poly(c, front, P.ink, 1);
  poly(c, front, L.roof);
  for (let k = 1; k < 6; k++) { const jj = h.j1 - (k / 6) * (d / 2), z = H + (k / 6) * R; line(c, lift(at(o, h.i0, jj), z), lift(at(o, h.i1, jj), z), 1, "rgba(26,20,38,0.3)"); }
  // baca ve duman
  box(c, o, h.i0 + 2, h.j0 + 1.2, 0.8, 0.8, 16, shade("#8e5a48"), H + R * 0.45); // çatının üstünden çıkar
  for (let k = 0; k < 4; k++) {
    const q = (t * 0.3 + k / 4) % 1; const [x, y] = at(o, h.i0 + 2.4, h.j0 + 1.6);
    px(c, x + Math.round(Math.sin(q * 6 + k) * 2), y - H - R - 8 - Math.round(q * 18), `rgba(230,230,240,${(0.7 * (1 - q)).toFixed(2)})`);
  }
  const [dx, dy] = at(o, h.door.i + 0.5, h.j1);
  return [dx, dy - 38];
}

function tree(c: Ctx, o: Origin, i: number, j: number, t: number) {
  const [x, y] = at(o, i + 0.5, j + 0.5);
  rect(c, x - 6, y - 1, 12, 2, "rgba(26,20,38,0.25)");
  rect(c, x - 2, y - 16, 4, 15, P.ink); rect(c, x - 1, y - 16, 2, 14, P.wood);
  const sw = Math.round(Math.sin(t * 1.2 + i) * 0.7);
  const ring = (cx: number, cy: number, r: number, col: string) => { for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy)); rect(c, cx - hw, cy + dy, hw * 2 + 1, 1, col); } };
  ring(x + sw, y - 26, 11, P.ink); ring(x + sw, y - 26, 10, "#2e5240"); ring(x - 3 + sw, y - 29, 6, "#3f6a44"); ring(x + 4 + sw, y - 23, 5, "#3a6040"); px(c, x - 5 + sw, y - 31, "#5f9e6e");
}

function mailbox(c: Ctx, o: Origin, i: number, j: number) {
  const [x, y] = at(o, i, j);
  rect(c, x - 1, y - 12, 2, 12, P.woodDk);
  rect(c, x - 4, y - 18, 8, 6, P.ink); rect(c, x - 3, y - 17, 6, 4, "#8a3a4a"); rect(c, x + 3, y - 21, 1, 4, P.ink); px(c, x + 4, y - 21, "#d8485a");
  px(c, x - 1, y - 16, "#e48aa0"); px(c, x + 1, y - 16, "#e48aa0"); px(c, x, y - 15, "#e48aa0");
}

/* -------------------------------- sahne çizimi ------------------------------- */

const flat = isFlat;

/** Bütün sahne. Dönen değer: isim etiketlerinin ekran noktaları (dünya pikseli). */
export function drawScene(c: Ctx, t: number, s: SceneState): Anchor[] {
  lights.length = 0;
  const o = s.cam;
  if (s.scope === "oda") { c.fillStyle = "#141a33"; c.fillRect(0, 0, c.canvas.width, c.canvas.height); house(c, o, t, s.theme); }
  else gardenGround(c, o, t);

  for (const p of s.placed) if (flat(p.itemId)) itemById.get(p.itemId)?.draw(c, o, p.tx, p.ty, t);
  type D = { key: number; draw: () => void };
  const list: D[] = [];
  const anchors: Anchor[] = [];
  for (const p of s.placed) {
    if (flat(p.itemId)) continue;
    const it = itemById.get(p.itemId); if (!it) continue;
    list.push({ key: p.tx + it.size[0] / 2 + p.ty + it.size[1] / 2, draw: () => it.draw(c, o, p.tx, p.ty, t) });
  }
  if (s.scope === "oda") {
    const th = THEME[s.theme];
    const faces = { top: th.wallHi, left: th.wall[0], right: th.wall[1] };
    for (const wl of innerWalls()) list.push({ key: wl.i + wl.j + 0.5, draw: () => innerWall(c, o, wl, th) });
    const { w, d } = SIZE.oda;
    for (let j = 0; j < d; j++) list.push({ key: w + j + 0.55, draw: () => box(c, o, w - 0.1, j, 0.2, 1, 6, faces, 0, false) });
    for (let i = 0; i < w; i++) list.push({ key: i + d + 0.55, draw: () => box(c, o, i, d - 0.1, 1, 0.2, 6, faces, 0, false) });
  } else {
    // bina: önündekiler (sol ön ya da sağ ön yüzün önü) ondan sonra çizilsin
    HOUSES.forEach((h, k) => list.push({ key: Math.min(h.i0 + h.j1, h.i1 + h.j0), draw: () => { const a = houseOutside(c, o, h, s.houseThemes[k] ?? "cengiz", t); anchors.push({ key: `ev${k}`, x: a[0], y: a[1] }); } }));
    HOUSES.forEach((h) => list.push({ key: h.door.i + 1.6 + h.door.j + 0.6, draw: () => mailbox(c, o, h.door.i + 1.6, h.door.j + 0.6) }));
    for (const [a, b] of TREES) list.push({ key: a + b + 1, draw: () => tree(c, o, a, b, t) });
    list.push({ key: 2.5 + 12.5, draw: () => {
      const [x, y] = at(o, 2.5, 12.5);
      rect(c, x - 1, y - 18, 2, 18, P.woodDk); rect(c, x - 5, y - 19, 10, 2, P.woodLt);
      const a = parrot(c, [x + 1, y - 19], 1, "perch", t, false);
      anchors.push({ key: "parrot", x: a.head[0], y: a.head[1] });
    } });
  }
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
  list.sort((a, b) => a.key - b.key).forEach((d) => d.draw());

  if (s.pick) {
    const p = s.placed.find((q) => q.id === s.pick);
    if (p) for (const [a, b] of footprint(p.itemId, p.tx, p.ty)) tile(c, o, a, b, "rgba(232,96,96,0.35)");
  }
  if (s.ghost) {
    const g = s.ghost;
    for (const [a, b] of footprint(g.itemId, g.tx, g.ty)) tile(c, o, a, b, g.ok ? "rgba(120,220,140,0.45)" : "rgba(232,96,96,0.45)");
    c.save(); c.globalAlpha = 0.7; itemById.get(g.itemId)?.draw(c, o, g.tx, g.ty, t); c.restore();
  }

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
