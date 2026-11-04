// Gelişim sahnelerinin çizimi: kişinin altı odalı evi, ortak bahçe ve ortak şato. Karanlık fantastik, fırtınalı. Kamera karakteri takip eder;
// durum (konumlar, eşyalar) dışarıdan gelir. Duvarlar "kesit" tarzı: dış arka duvarlar tam, iç duvarlar alçak.
import { duldul, parrot } from "./companions";
import { lights } from "./env";
import { type Origin, type Part, at, box, setFlip, shade, tile } from "./iso";
import { type CharState, type Ctx, type Free, type V, P, STAND, drawCharacter, lerpFree, line, poly, px, rect, rnd, sprite } from "./pixel";
import { type Area, CASTLE, type Floor, FRONT_DOOR, HOUSES, POND, type Placed, ROOMS, type RoomId, SIZE, TREES, deadTree, footprint, gardenSolid, innerWalls, isPath, sizeOf } from "./room";
import { type RoomItem, isFlat, itemById } from "./room-items";
import { BALCONY, GATE_GUARD, TARGETS, castleDecor, castleGuests, castleInterior, castleOutside, castleWallFaces, castleWalls, decorIsFlat, decorSize, drawDecor, drawTarget } from "./castle";
import { screenRain, stormFlash } from "./gelisim-storm";
import { drawEffect, drawHeld } from "./combat-draw";
import { type Effect, shotAt } from "./combat";
import { STAND_F, walkFrame } from "./anim";
import { MATS } from "./gear";

const WALL_H = 44;
export type Theme = "cengiz" | "aysenur";
export type Hero = { who: Theme; i: number; j: number; dir: 1 | -1; dist: number; moving: boolean; outfit: CharState["outfit"]; tint?: CharState["tint"]; sit?: { lift: number; sleep?: boolean; from?: [number, number]; at?: number; blanket?: string; depth?: number }; study?: { reading: boolean; focus: boolean };
  gear?: { weapon: string | null; armor?: string | null; swing?: number }; shield?: boolean; // elde silah, kuşanılan zırh (miğfer, kalkan görünür), savuruş (0..1), kalkan büyüsü
  emote?: { kind: Emote; at: number } }; // başın üstünde kısa bir kalp ya da el sallama
export type Emote = "kalp" | "el";
export type Ghost = { itemId: string; tx: number; ty: number; ok: boolean; rot?: number } | null;
export type Cat = { i: number; j: number; dir: 1 | -1; dist: number; moving: boolean; sleep?: boolean };
export type SceneState = {
  scope: Area;
  cam: Origin;
  theme: Theme; // evin sahibi
  houseThemes: Theme[]; // bahçedeki evlerin sahipleri, sırayla
  placed: Placed[];
  heroes: Hero[];
  ghost: Ghost;
  pick: string | null;
  cat: Cat | null;
  night: number; // 0 gündüz, 1 gece (İstanbul saatine göre)
  floor?: Floor; // şatoda hangi kat
  targetState?: Record<string, { hit: number; hp: number }>; // talim hedeflerinin sarsıntısı ve canı (0..1)
  effects?: Effect[]; // vuruşlar, mermiler, büyüler, hasar sayıları
  now?: number; // efektlerin zaman tabanı (sn)
  mailHeart: number | null; // okunmamış not: bu evin posta kutusunda kalp
  music: { i: number; j: number; t0: number } | null; // piyanodan yükselen notalar
};

// oturuş: kalça alçakta, dizler önde (yatak, koltuk, bank)
const SEAT: Free = { ...STAND_F, hip: [-1, -6], neck: [0, -13], eB: [1, -9], hB: [3, -7], eF: [2, -9], hF: [4, -7], kB: [3, -6], fB: [4, 0], kF: [3, -6], fF: [4, 0] };
// uzanış: sırt üstü, baş yastıkta (yön başın tarafı: dir 1 iken baş solda), bacaklar düz, kollar yanda
const LIE: Free = { hip: [1, -3], neck: [-6, -3], eB: [-3, -2], hB: [0, -2], eF: [-3, -4], hF: [1, -4], kB: [5, -3], fB: [9, -3], kF: [5, -4], fF: [9, -4], rot: -1 };
const ease = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const SMALL_HEART = [".o.o.", "oxoxo", "oxxxo", ".oxo.", "..o.."];
let nightNow = 0; // pencerelerin gökyüzü rengi için (drawScene başında ayarlanır)
let flashNow = 0; // şimşek parlaklığı (drawScene başında ayarlanır)
export type Anchor = { key: string; x: number; y: number };

/* ------------------------------ duvar yüzleri ------------------------------ */

// j = sabit düzlemde, i boyunca uzanan dikdörtgen (sağ arka duvar, binanın sol-ön yüzü)
export function faceJ(c: Ctx, o: Origin, j: number, i0: number, i1: number, y0: number, y1: number, color: string) {
  const a = at(o, i0, j), b = at(o, i1, j);
  poly(c, [[a[0], a[1] - y0], [b[0], b[1] - y0], [b[0], b[1] - y1], [a[0], a[1] - y1]], color);
}
// i = sabit düzlemde, j boyunca uzanan dikdörtgen (sol arka duvar, binanın sağ-ön yüzü)
export function faceI(c: Ctx, o: Origin, i: number, j0: number, j1: number, y0: number, y1: number, color: string) {
  const a = at(o, i, j0), b = at(o, i, j1);
  poly(c, [[a[0], a[1] - y0], [b[0], b[1] - y0], [b[0], b[1] - y1], [a[0], a[1] - y1]], color);
}
// sivri kemerli (gotik) yüz: üst kenarın ortası `peak` piksel yukarı çıkar
export function archJ(c: Ctx, o: Origin, j: number, i0: number, i1: number, y0: number, y1: number, color: string, peak = 5) {
  const a = at(o, i0, j), b = at(o, i1, j), m = at(o, (i0 + i1) / 2, j);
  poly(c, [[a[0], a[1] - y0], [b[0], b[1] - y0], [b[0], b[1] - y1], [m[0], m[1] - y1 - peak], [a[0], a[1] - y1]], color);
}
export function archI(c: Ctx, o: Origin, i: number, j0: number, j1: number, y0: number, y1: number, color: string, peak = 5) {
  const a = at(o, i, j0), b = at(o, i, j1), m = at(o, i, (j0 + j1) / 2);
  poly(c, [[a[0], a[1] - y0], [b[0], b[1] - y0], [b[0], b[1] - y1], [m[0], m[1] - y1 - peak], [a[0], a[1] - y1]], color);
}

/** Fırtınalı gökyüzü: şimşekte bembeyaz */
export const stormSky = () => (flashNow > 0.15 ? "#dfe6ff" : nightNow > 0.55 ? "#141a33" : "#2c3350");

/**
 * Gotik pencere: kemerli çerçeve, fırtınalı gök, camdan süzülen yağmur, kurşunlu vitray tepesi, kızıl perde.
 * axis "j": sağ arka duvarda (j sabit, i boyunca); "i": sol arka duvarda.
 */
export function gothicWindow(c: Ctx, o: Origin, axis: "i" | "j", wall: number, s: number, t: number, w = 1.4, y0 = 14, y1 = 34) {
  const arch = axis === "j" ? archJ : archI, face = axis === "j" ? faceJ : faceI;
  const pt = (k: number): V => (axis === "j" ? at(o, k, wall) : at(o, wall, k));
  arch(c, o, wall, s - 0.08, s + w + 0.08, y0 - 2, y1 + 1, P.ink, 7);
  arch(c, o, wall, s + 0.08, s + w - 0.08, y0, y1 - 1, stormSky(), 6);
  if (flashNow < 0.15) {
    // uzak çatallı şimşek izi bazen camda belirir
    const [x, y] = pt(s + w * 0.6); px(c, x, y - y1 + 6, "rgba(200,210,255,0.35)");
  }
  // camda süzülen damlalar
  for (let k = 0; k < 4; k++) {
    const q = (t * (0.35 + k * 0.07) + rnd(s * 3 + k)) % 1;
    const [x, y] = pt(s + 0.2 + k * (w - 0.4) / 3);
    rect(c, x, Math.round(y - y1 + 3 + q * (y1 - y0 - 6)), 1, 2, "rgba(190,205,240,0.55)");
  }
  // vitray tepe: kızıl ve mor camlar
  { const [x, y] = pt(s + w / 2); px(c, x, y - y1 - 2, "#b8344a"); px(c, x - 1, y - y1, "#6a3a8a"); px(c, x + 1, y - y1, "#6a3a8a"); }
  face(c, o, wall, s + w / 2 - 0.04, s + w / 2 + 0.04, y0, y1 + 3, P.ink); // kayıt
  face(c, o, wall, s + 0.08, s + w - 0.08, y0 + Math.round((y1 - y0) * 0.55), y0 + Math.round((y1 - y0) * 0.55) + 1, P.ink);
  face(c, o, wall, s - 0.15, s + w + 0.15, y0 - 3, y0 - 1, "#3a3440"); // taş denizlik
  face(c, o, wall, s - 0.12, s + 0.1, y0 - 1, y1 + 2, "#5a1a2a"); face(c, o, wall, s + w - 0.1, s + w + 0.12, y0 - 1, y1 + 2, "#5a1a2a"); // perde
  if (flashNow > 0.15) { const [x, y] = pt(s + w / 2); lights.push({ x, y: y - (y0 + y1) / 2, r: 40, color: "200,215,255" }); }
}

/** Duvar meşalesi: demir kol, titrek alev, sıcak ışık halkası */
export function torch(c: Ctx, o: Origin, i: number, j: number, t: number, h = 26) {
  const [x, y] = at(o, i, j);
  rect(c, x - 1, y - h + 2, 2, 6, P.ink); rect(c, x - 2, y - h, 4, 2, "#4a3a30"); rect(c, x - 1, y - h - 1, 2, 1, "#2a2026");
  const f = Math.round(Math.sin(t * 11 + x) * 0.8 + Math.sin(t * 17 + y) * 0.5);
  rect(c, x - 1, y - h - 4 - (f > 0 ? 1 : 0), 2, 3, "#e8742a"); px(c, x, y - h - 5 - (f > 0 ? 1 : 0), P.goldLt); px(c, x - 1, y - h - 2, P.amber);
  lights.push({ x, y: y - h - 3, r: 24 + f * 2, color: "240,130,60" });
}

/** Asılı sancak: armasında altın kalp ve kılıç */
export function banner(c: Ctx, o: Origin, axis: "i" | "j", wall: number, s: number, color: string, y0 = 16, y1 = 40, w = 0.7) {
  const face = axis === "j" ? faceJ : faceI;
  const pt = (k: number): V => (axis === "j" ? at(o, k, wall) : at(o, wall, k));
  face(c, o, wall, s - 0.12, s + w + 0.12, y1, y1 + 2, P.woodDk); // direk
  face(c, o, wall, s, s + w, y0, y1, color);
  face(c, o, wall, s, s + 0.06, y0, y1, "rgba(255,255,255,0.12)");
  const [mx, my] = pt(s + w / 2);
  rect(c, mx - 1, my - y0 + 1, 2, 3, color); // uç sivri
  const ey = my - (y0 + y1) / 2;
  rect(c, mx, ey - 6, 1, 11, P.goldLt); rect(c, mx - 2, ey - 3, 5, 1, P.goldLt); // kılıç
  px(c, mx - 1, ey + 1, "#e48aa0"); px(c, mx + 1, ey + 1, "#e48aa0"); rect(c, mx - 1, ey + 2, 3, 1, "#e48aa0"); px(c, mx, ey + 3, "#e48aa0"); // kalp
}

/** Köşede örümcek ağı */
export function cobweb(c: Ctx, o: Origin, i: number, j: number, h: number) {
  const [x, y] = at(o, i, j); const top = y - h;
  const col = "rgba(210,210,225,0.28)";
  for (let k = 0; k < 5; k++) line(c, [x, top], [x - 8 + k * 4, top + 6 + (k % 2) * 2], 1, col);
  for (const r of [3, 6]) { line(c, [x - r, top + r * 0.6], [x, top + r], 1, col); line(c, [x, top + r], [x + r, top + r * 0.6], 1, col); }
}

/** Taş blok derzleri: yatay sıralar ve şaşırtmalı dikey derzler */
function stoneJ(c: Ctx, o: Origin, j: number, i0: number, i1: number, h: number, mortar: string) {
  for (let y = 7, row = 0; y < h; y += 7, row++) {
    faceJ(c, o, j, i0, i1, y, y + 1, mortar);
    for (let k = i0 + (row % 2 ? 0.5 : 0); k < i1; k += 1) faceJ(c, o, j, k, k + 0.06, y - 7, y, mortar);
  }
}
function stoneI(c: Ctx, o: Origin, i: number, j0: number, j1: number, h: number, mortar: string) {
  for (let y = 7, row = 0; y < h; y += 7, row++) {
    faceI(c, o, i, j0, j1, y, y + 1, mortar);
    for (let k = j0 + (row % 2 ? 0.5 : 0); k < j1; k += 1) faceI(c, o, i, k, k + 0.06, y - 7, y, mortar);
  }
}
export { stoneI, stoneJ };

function painting(c: Ctx, o: Origin, j: number, i: number, inner: string, art: (x: number, y: number) => void) {
  faceJ(c, o, j, i, i + 1.1, 18, 32, P.ink); faceJ(c, o, j, i + 0.08, i + 1.02, 19, 31, P.gold); faceJ(c, o, j, i + 0.18, i + 0.92, 21, 29, inner);
  const [x, y] = at(o, i + 0.55, j); art(x, y - 25);
}

/* ------------------------------------ ev ------------------------------------ */

// Karanlık taş ev: Cengiz soğuk mavi-gri taş ve gece mavisi sancaklar, Ayşenur koyu mor taş ve kızıl sancaklar
const THEME = {
  cengiz: { wall: ["#3e4558", "#3a4154"], wallHi: "#59627a", trim: "#1c2234", accent: "#2a3466", bed: "#434b66", banner: "#24306a" },
  aysenur: { wall: ["#4d3949", "#493545"], wallHi: "#6e5568", trim: "#26161f", accent: "#6e1f34", bed: "#574052", banner: "#7a1f36" },
} as const;

const FLOOR: Record<RoomId, (i: number, j: number) => string> = {
  hol: (i, j) => ((i + j) % 2 ? "#4c4856" : "#45414f"),
  salon: (i, j) => ((i + j) % 2 ? "#4c362a" : "#463126"),
  yatak: (i, j) => ((i + j) % 2 ? "#563c30" : "#50372b"),
  mutfak: (i, j) => ((i + j) % 2 ? "#5a5562" : "#2e2a36"),
  banyo: (i, j) => ((i + j) % 2 ? "#3e5866" : "#38525e"),
  calisma: (i, j) => ((i * 3 + j) % 5 ? "#2f4637" : "#2b4133"),
};
const room = (id: RoomId) => ROOMS.find((r) => r.id === id)!;

function house(c: Ctx, o: Origin, t: number, theme: Theme) {
  const { w, d } = SIZE.oda;
  const th = THEME[theme];
  const kitchen = room("mutfak"), bed = room("yatak"), salon = room("salon"), hol = room("hol");
  // sol arka duvar (i = 0): holde temanın taşı, mutfakta koyu fayans
  for (let j = 0; j < d; j++) faceI(c, o, 0, j, j + 1, 0, WALL_H, j >= kitchen.j0 ? (j % 2 ? "#47414d" : "#433d49") : th.wall[j % 2]);
  stoneI(c, o, 0, 0, d, WALL_H, "rgba(10,8,18,0.35)");
  for (let j = kitchen.j0; j < d; j++) for (let y = 5; y < 19; y += 5) for (let k = 0; k < 2; k++) faceI(c, o, 0, j + k * 0.5, j + k * 0.5 + 0.45, y, y + 4, (j + k + y) % 2 ? "#5d5866" : "#3f3a46");
  // sağ arka duvar (j = 0): yatak odası kısmı ayrı tonda
  for (let i = 0; i < w; i++) faceJ(c, o, 0, i, i + 1, 0, WALL_H, i >= bed.i0 ? th.bed : th.wall[i % 2]);
  stoneJ(c, o, 0, 0, w, WALL_H, "rgba(10,8,18,0.32)");
  faceJ(c, o, 0, 0, w, 0, 5, th.trim); faceI(c, o, 0, 0, d, 0, 5, th.trim); // süpürgelik
  line(c, [at(o, 0, d)[0], at(o, 0, d)[1] - WALL_H], [at(o, 0, 0)[0], at(o, 0, 0)[1] - WALL_H], 2, P.ink);
  line(c, [at(o, 0, 0)[0], at(o, 0, 0)[1] - WALL_H], [at(o, w, 0)[0], at(o, w, 0)[1] - WALL_H], 2, P.ink);
  line(c, at(o, 0, 0), [at(o, 0, 0)[0], at(o, 0, 0)[1] - WALL_H], 1, "rgba(0,0,0,0.5)");

  // gotik pencereler, sancaklar, tablolar, meşaleler
  for (const s of [salon.i0 + 2, salon.i0 + 6.3, bed.i0 + 2.6]) gothicWindow(c, o, "j", 0, s, t);
  for (const s of [kitchen.j0 + 3.5, kitchen.j0 + 8]) gothicWindow(c, o, "i", 0, s, t);
  banner(c, o, "j", 0, salon.i0 + 4.6, th.banner); banner(c, o, "j", 0, salon.i0 + 9, th.banner);
  banner(c, o, "i", 0, 5.3, th.banner, 16, 40);
  painting(c, o, 0, 2.4, th.accent, (x, y) => { px(c, x - 1, y, "#e48aa0"); px(c, x + 1, y, "#e48aa0"); rect(c, x - 1, y + 1, 3, 1, "#e48aa0"); px(c, x, y + 2, "#e48aa0"); });
  painting(c, o, 0, bed.i0 + 5.5, "#2e3a4a", (x, y) => { rect(c, x - 2, y + 1, 5, 2, "#1e2a30"); px(c, x + 1, y - 2, "#e8e0c0"); }); // ay ışığında dağ
  for (const i of [hol.i1 - 2.2, salon.i0 + 1, salon.i1 - 1.2, bed.i0 + 1, bed.i1 - 1.2]) torch(c, o, i, 0, t);
  for (const j of [hol.j1 - 1.5, kitchen.j0 + 6.3, d - 1.5]) torch(c, o, 0, j, t);
  // mutfak rafında iksir şişeleri
  faceI(c, o, 0, kitchen.j0 + 0.6, kitchen.j0 + 2.8, 24, 25, P.woodDk);
  for (let k = 0; k < 5; k++) { const [x, y] = at(o, 0, kitchen.j0 + 0.8 + k * 0.4); rect(c, x - 1, y - 29, 2, 4, ["#7fd1b9", "#b8344a", "#c9a6f0", "#e8a33a", "#5fae6e"][k]); }
  cobweb(c, o, 0, 0, WALL_H); cobweb(c, o, w - 0.6, 0, WALL_H); cobweb(c, o, 0, d - 0.6, WALL_H);

  // ön kapı (holde, sol duvar): kemerli, demir kuşaklı
  archI(c, o, 0, FRONT_DOOR.j - 0.05, FRONT_DOOR.j + 1.05, 0, 30, P.ink, 5);
  archI(c, o, 0, FRONT_DOOR.j + 0.08, FRONT_DOOR.j + 0.92, 0, 28, "#3e2a20", 4);
  faceI(c, o, 0, FRONT_DOOR.j + 0.08, FRONT_DOOR.j + 0.92, 9, 10, "#1a1418"); faceI(c, o, 0, FRONT_DOOR.j + 0.08, FRONT_DOOR.j + 0.92, 20, 21, "#1a1418");
  { const [x, y] = at(o, 0, FRONT_DOOR.j + 0.75); px(c, x, y - 13, P.gold); px(c, x, y - 14, P.goldLt); }

  // zeminler: her odanın kendi döşemesi
  for (const r of ROOMS) for (let i = r.i0; i < r.i1; i++) for (let j = r.j0; j < r.j1; j++) tile(c, o, i, j, FLOOR[r.id](i, j));
  for (let i = salon.i0; i <= salon.i1; i++) line(c, at(o, i, salon.j0), at(o, i, salon.j1), 1, "rgba(20,12,8,0.4)");
  tile(c, o, 0, FRONT_DOOR.j, "#5a4a3a", 0.35, 1);
  tile(c, o, 0.4, FRONT_DOOR.j + 0.1, "#5a1a2a", 0.8, 0.8); // paspas
}

// iç duvar parçası (alçak): kare kare çizilir ki derinlik sırası doğru olsun; dış hat yok, parçalar kesintisiz birleşir
function innerWall(c: Ctx, o: Origin, wl: { i: number; j: number; axis: "i" | "j" }, f: { top: string; left: string; right: string }, h = 14) {
  if (wl.axis === "j") {
    box(c, o, wl.i - 0.08, wl.j, 0.16, 1, h, f, 0, false);
    line(c, [at(o, wl.i - 0.08, wl.j)[0], at(o, wl.i - 0.08, wl.j)[1] - h], [at(o, wl.i - 0.08, wl.j + 1)[0], at(o, wl.i - 0.08, wl.j + 1)[1] - h], 1, P.ink);
  } else {
    box(c, o, wl.i, wl.j - 0.08, 1, 0.16, h, f, 0, false);
    line(c, [at(o, wl.i, wl.j - 0.08)[0], at(o, wl.i, wl.j - 0.08)[1] - h], [at(o, wl.i + 1, wl.j - 0.08)[0], at(o, wl.i + 1, wl.j - 0.08)[1] - h], 1, P.ink);
  }
}
export { innerWall };

/* ---------------------------------- bahçe ---------------------------------- */

function gardenGround(c: Ctx, o: Origin, t: number) {
  const { w, d } = SIZE.bahce;
  c.fillStyle = "#121a16"; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    if (isPath(i, j)) { tile(c, o, i, j, (i + j) % 2 ? "#4e4c58" : "#46444f"); tile(c, o, i + 0.25, j + 0.25, "#5a5864", 0.2, 0.2); continue; }
    tile(c, o, i, j, (i * 7 + j * 3) % 5 ? ((i + j) % 2 ? "#2c4535" : "#283f31") : "#243a2d");
    const n = (i * 13 + j * 7) % 11;
    if (n === 0) { const [x, y] = at(o, i + 0.5, j + 0.5); px(c, x, y, "#7a2a3a"); px(c, x + 3, y + 1, "#5a4a7a"); } // koyu güller
    if (n === 5) { const [x, y] = at(o, i + 0.4, j + 0.6); px(c, x, y - 1, "#3a5a40"); px(c, x + 1, y - 2, "#3a5a40"); }
    if (n === 8 && !gardenSolid(i, j)) { const q = (t * 1.2 + i * 0.37 + j * 0.61) % 1; if (q < 0.3) { const [x, y] = at(o, i + 0.5, j + 0.5); px(c, x - 1, y, "rgba(170,195,230,0.5)"); px(c, x + 1, y, "rgba(170,195,230,0.5)"); } } // yağmur sıçraması
  }
  // gölet: koyu su, yağmur halkaları, nilüfer
  for (let i = POND.i0; i < POND.i1; i++) for (let j = POND.j0; j < POND.j1; j++) {
    const edge = i === POND.i0 || j === POND.j0 || i === POND.i1 - 1 || j === POND.j1 - 1;
    tile(c, o, i, j, edge ? "#4a4c58" : (i + j + Math.floor(t * 1.5)) % 3 ? "#1e3448" : "#24405a");
  }
  for (let k = 0; k < 8; k++) {
    const q = (t * 0.9 + rnd(k * 2.3)) % 1, ri = POND.i0 + 1.3 + rnd(k * 5.1 + Math.floor(t * 0.9 + rnd(k * 2.3))) * (POND.i1 - POND.i0 - 2.6), rj = POND.j0 + 1.3 + rnd(k * 3.7 + Math.floor(t * 0.9 + rnd(k * 2.3))) * (POND.j1 - POND.j0 - 2.6);
    const [x, y] = at(o, ri, rj), r = Math.round(1 + q * 4);
    const col = `rgba(170,200,235,${(0.6 * (1 - q)).toFixed(2)})`;
    rect(c, x - r, y, 1, 1, col); rect(c, x + r, y, 1, 1, col); rect(c, x, y - Math.ceil(r / 2), 1, 1, col); rect(c, x, y + Math.ceil(r / 2), 1, 1, col);
  }
  for (const [a, b] of [[17, POND.j0 + 1], [19, POND.j0 + 3]] as V[]) { const [x, y] = at(o, a + 0.5, b + 0.5); rect(c, x - 2, y - 1, 5, 2, "#2f4a37"); px(c, x, y - 2, "#b8344a"); }
  // dış demir parmaklık (arka kenarlar): sivri uçlu
  const fence = (a: V, b: V) => { rect(c, a[0] - 1, a[1] - 10, 2, 10, "#24242c"); px(c, a[0], a[1] - 11, "#4a4a56"); line(c, [a[0], a[1] - 8], [b[0], b[1] - 8], 1, "#24242c"); line(c, [a[0], a[1] - 3], [b[0], b[1] - 3], 1, "#24242c"); };
  for (let j = 0; j < d; j++) fence(at(o, 0, j), at(o, 0, j + 1));
  for (let i = 0; i < w; i++) fence(at(o, i, 0), at(o, i + 1, 0));
}

const HOUSE_LOOK: Record<Theme, { wall: string; roof: string; door: string }> = {
  cengiz: { wall: "#626676", roof: "#1f2747", door: "#3e2a20" },
  aysenur: { wall: "#6e5c66", roof: "#4a1828", door: "#4a2430" },
};

function houseOutside(c: Ctx, o: Origin, h: (typeof HOUSES)[number], theme: Theme, t: number): V {
  const L = HOUSE_LOOK[theme], H = 36, R = 24;
  const w = h.i1 - h.i0, d = h.j1 - h.j0, jm = h.j0 + d / 2;
  const faces = shade(L.wall, 0.12, 0.25);
  box(c, o, h.i0, h.j0, w, d, H, faces);
  stoneJ(c, o, h.j1, h.i0, h.i1, H, "rgba(10,8,18,0.3)"); stoneI(c, o, h.i1, h.j0, h.j1, H, "rgba(10,8,18,0.3)");
  // aydınlık gotik pencereler ve sarmaşık
  const glass = flashNow > 0.15 ? "#dfe6ff" : "#f0b860";
  for (const i of [h.i0 + 1, h.i0 + 6.5]) {
    archJ(c, o, h.j1, i, i + 1.4, 13, 28, P.ink, 4); archJ(c, o, h.j1, i + 0.1, i + 1.3, 14, 27, glass, 4); faceJ(c, o, h.j1, i + 0.66, i + 0.74, 14, 30, P.ink);
    faceJ(c, o, h.j1, i - 0.1, i + 1.5, 11, 13, "#2a2632");
    for (let k = 0; k < 6; k++) { const [x, y] = at(o, i - 0.3 + k * 0.1, h.j1); px(c, x, y - 12 - k * 3, "#2f4a37"); px(c, x + 1, y - 13 - k * 3, "#3a5a40"); }
  }
  for (const j of [h.j0 + 1.2, h.j0 + 3.6]) { archI(c, o, h.i1, j, j + 1.2, 13, 28, P.ink, 4); archI(c, o, h.i1, j + 0.1, j + 1.1, 14, 27, glass, 4); }
  // kemerli kapı, üstünde kalpli tepe penceresi
  archJ(c, o, h.j1, h.door.i - 0.05, h.door.i + 1.05, 0, 28, P.ink, 4);
  archJ(c, o, h.j1, h.door.i + 0.08, h.door.i + 0.92, 0, 27, L.door, 3);
  faceJ(c, o, h.j1, h.door.i + 0.08, h.door.i + 0.92, 8, 9, "#16100c"); faceJ(c, o, h.j1, h.door.i + 0.08, h.door.i + 0.92, 19, 20, "#16100c");
  { const [x, y] = at(o, h.door.i + 0.8, h.j1); px(c, x, y - 12, P.gold); }
  { const [x, y] = at(o, h.door.i + 0.5, h.j1); px(c, x - 1, y - 33, "#e48aa0"); px(c, x + 1, y - 33, "#e48aa0"); rect(c, x - 1, y - 32, 3, 1, "#e48aa0"); px(c, x, y - 31, "#e48aa0"); }
  torch(c, o, h.door.i - 0.35, h.j1, t, 22);
  // dik arduvaz çatı: arka eğim, sağ alınlık, ön eğim
  const lift = (p: V, z: number): V => [p[0], p[1] - z];
  poly(c, [lift(at(o, h.i0, h.j0), H), lift(at(o, h.i1, h.j0), H), lift(at(o, h.i1, jm), H + R), lift(at(o, h.i0, jm), H + R)], P.ink, 1);
  poly(c, [lift(at(o, h.i1, h.j0), H), lift(at(o, h.i1, h.j1), H), lift(at(o, h.i1, jm), H + R)], faces.right);
  const front: V[] = [lift(at(o, h.i0, h.j1), H), lift(at(o, h.i1, h.j1), H), lift(at(o, h.i1, jm), H + R), lift(at(o, h.i0, jm), H + R)];
  poly(c, front, P.ink, 1);
  poly(c, front, L.roof);
  for (let k = 1; k < 7; k++) { const jj = h.j1 - (k / 7) * (d / 2), z = H + (k / 7) * R; line(c, lift(at(o, h.i0, jj), z), lift(at(o, h.i1, jj), z), 1, "rgba(0,0,0,0.35)"); }
  // baca ve duman
  box(c, o, h.i0 + 2, h.j0 + 1.2, 0.8, 0.8, 16, shade("#4a4450"), H + R * 0.45);
  for (let k = 0; k < 4; k++) {
    const q = (t * 0.3 + k / 4) % 1; const [x, y] = at(o, h.i0 + 2.4, h.j0 + 1.6);
    px(c, x + Math.round(Math.sin(q * 6 + k) * 2), y - H - R - 8 - Math.round(q * 18), `rgba(160,160,175,${(0.6 * (1 - q)).toFixed(2)})`);
  }
  for (const i of [h.i0 + 1, h.i0 + 6.5]) { const [x, y] = at(o, i + 0.7, h.j1); lights.push({ x, y: y - 21, r: 18, color: "255,190,110" }); }
  for (const j of [h.j0 + 1.2, h.j0 + 3.6]) { const [x, y] = at(o, h.i1, j + 0.6); lights.push({ x, y: y - 21, r: 15, color: "255,190,110" }); }
  const [dx, dy] = at(o, h.door.i + 0.5, h.j1);
  return [dx, dy - 40];
}

function tree(c: Ctx, o: Origin, i: number, j: number, t: number) {
  const [x, y] = at(o, i + 0.5, j + 0.5);
  rect(c, x - 6, y - 1, 12, 2, "rgba(0,0,0,0.3)");
  const sw = Math.round(Math.sin(t * 1.6 + i) * 1.1); // fırtınada daha çok sallanır
  if (deadTree(i, j)) {
    // yapraksız, çarpık kara ağaç
    rect(c, x - 2, y - 20, 4, 19, P.ink); rect(c, x - 1, y - 20, 2, 18, "#3a2e2a");
    line(c, [x, y - 16], [x - 7 + sw, y - 26], 1, "#3a2e2a"); line(c, [x - 5 + sw, y - 23], [x - 9 + sw, y - 24], 1, "#3a2e2a");
    line(c, [x, y - 19], [x + 6 + sw, y - 30], 1, "#3a2e2a"); line(c, [x + 4 + sw, y - 27], [x + 8 + sw, y - 27], 1, "#3a2e2a");
    line(c, [x, y - 20], [x + sw, y - 33], 1, "#3a2e2a");
    return;
  }
  rect(c, x - 2, y - 16, 4, 15, P.ink); rect(c, x - 1, y - 16, 2, 14, "#3a2e2a");
  const ring = (cx: number, cy: number, r: number, col: string) => { for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy)); rect(c, cx - hw, cy + dy, hw * 2 + 1, 1, col); } };
  ring(x + sw, y - 26, 11, P.ink); ring(x + sw, y - 26, 10, "#1c3226"); ring(x - 3 + sw, y - 29, 6, "#24402e"); ring(x + 4 + sw, y - 23, 5, "#21392a"); px(c, x - 5 + sw, y - 31, "#3a5a40");
}

function mailbox(c: Ctx, o: Origin, i: number, j: number) {
  const [x, y] = at(o, i, j);
  rect(c, x - 1, y - 12, 2, 12, P.woodDk);
  rect(c, x - 4, y - 18, 8, 6, P.ink); rect(c, x - 3, y - 17, 6, 4, "#6a1f30"); rect(c, x + 3, y - 21, 1, 4, P.ink); px(c, x + 4, y - 21, "#d8485a");
  px(c, x - 1, y - 16, "#e48aa0"); px(c, x + 1, y - 16, "#e48aa0"); px(c, x, y - 15, "#e48aa0");
}

/** Gökte süzülen yarasalar (tuval pikseli) */
function bats(c: Ctx, w: number, h: number, t: number) {
  for (let k = 0; k < 5; k++) {
    const q = (t * (0.03 + rnd(k) * 0.02) + rnd(k * 3.1)) % 1;
    const x = Math.round(q * (w + 40) - 20), y = Math.round(h * (0.08 + rnd(k * 1.7) * 0.25) + Math.sin(t * 2 + k) * 6);
    const flap = Math.floor(t * 9 + k) % 2;
    px(c, x, y, "#0a0810"); rect(c, x - 1, y, 3, 1, "#0a0810");
    if (flap) { px(c, x - 2, y - 1, "#0a0810"); px(c, x + 2, y - 1, "#0a0810"); px(c, x - 3, y - 2, "#0a0810"); px(c, x + 3, y - 2, "#0a0810"); }
    else { px(c, x - 2, y + 1, "#0a0810"); px(c, x + 2, y + 1, "#0a0810"); }
  }
}

/** Yerden yükselen sis şeritleri */
function fog(c: Ctx, w: number, h: number, t: number) {
  for (let k = 0; k < 4; k++) {
    const y = Math.round(h * (0.3 + k * 0.18) + Math.sin(t * 0.2 + k) * 8), off = ((t * (6 + k * 3) + k * 90) % (w + 200)) - 200;
    const g = c.createLinearGradient(off, 0, off + 200, 0);
    g.addColorStop(0, "rgba(150,160,180,0)"); g.addColorStop(0.5, "rgba(150,160,180,0.05)"); g.addColorStop(1, "rgba(150,160,180,0)");
    c.fillStyle = g; c.fillRect(off, y, 200, 14 + k * 4);
  }
}

const KIT = { faceI, faceJ, archI, archJ, stoneI, stoneJ, gothicWindow, torch, banner, cobweb };

/* -------------------------------- sahne çizimi ------------------------------- */

// Döndürülmüş eşya: (ty, tx) konumunda düz çizilip ekranda ox ekseni etrafında aynalanır.
// İzometride yatay aynalama i ile j'yi yer değiştirir; eşya tam döndürülmüş yerine oturur.
// rot: 0 düz, 1 aynalı, 2 ters (180°), 3 ters ve aynalı. Ters çizimde eşyanın parçaları yeni önüne göre sıralanır.
function drawItem(c: Ctx, o: Origin, p: { itemId: string; tx: number; ty: number; rot?: number }, t: number) {
  const it = itemById.get(p.itemId); if (!it) return;
  const r = (p.rot ?? 0) & 3;
  if (!r) { it.draw(c, o, p.tx, p.ty, t); return; }
  const mirror = (r & 1) === 1, n = lights.length;
  const i0 = mirror ? p.ty : p.tx, j0 = mirror ? p.tx : p.ty;
  c.save();
  if (mirror) { c.translate(2 * o.ox, 0); c.scale(-1, 1); }
  if (r & 2) drawTurned(c, o, it, i0, j0, t); else it.draw(c, o, i0, j0, t);
  c.restore();
  if (mirror) for (let k = n; k < lights.length; k++) lights[k] = { ...lights[k], x: 2 * o.ox - lights[k].x };
}

type Seg = { p: Part; ops: (() => void)[] };
const overlaps = (a: Part, b: Part) => a.i0 < b.i1 && b.i0 < a.i1 && a.j0 < b.j1 && b.j0 < a.j1;
const E = 1e-6;
// a, b'den önce çizilir mi: üst üste binenlerde alttaki, ayrık olanlarda arkadaki önce
function behind(a: Part, b: Part): boolean {
  if (overlaps(a, b)) return a.z1 <= b.z0 + E && b.z1 > a.z0 + E;
  const aBack = a.i1 <= b.i0 + E || a.j1 <= b.j0 + E, bBack = b.i1 <= a.i0 + E || b.j1 <= a.j0 + E;
  if (aBack !== bBack) return aBack;
  return a.i0 + a.i1 + a.j0 + a.j1 < b.i0 + b.i1 + b.j0 + b.j1 - E;
}
// eşyayı ters çizer: çizim komutları parça parça kaydedilir, parçalar önden arkaya yeniden dizilip oynatılır
function drawTurned(c: Ctx, o: Origin, it: RoomItem, i0: number, j0: number, t: number) {
  const [W, D] = it.size;
  let cur: Seg = { p: { i0, i1: i0 + W, j0, j1: j0 + D, z0: 0, z1: 0 }, ops: [] };
  const segs: Seg[] = [cur];
  const rec = new Proxy(c, {
    get(tg, k) {
      if (k === "fillRect") return (x: number, y: number, w: number, h: number) => { cur.ops.push(() => tg.fillRect(x, y, w, h)); };
      const v = Reflect.get(tg, k);
      return typeof v === "function" ? v.bind(tg) : v;
    },
    set(tg, k, v) {
      if (k === "fillStyle") { cur.ops.push(() => { tg.fillStyle = v; }); return true; }
      return Reflect.set(tg, k, v);
    },
  });
  setFlip({ si: 2 * i0 + W, sj: 2 * j0 + D, part: (pt) => { if (cur.ops.length) { cur = { p: pt, ops: [] }; segs.push(cur); } else cur.p = pt; } });
  try { it.draw(rec, o, i0, j0, t); } finally { setFlip(null); }
  const left = segs.filter((g) => g.ops.length);
  while (left.length) {
    let k = left.findIndex((a) => !left.some((b) => b !== a && behind(b.p, a.p)));
    if (k < 0) k = 0;
    for (const op of left.splice(k, 1)[0].ops) op();
  }
}
// derinlik: eşyanın en öndeki karesinin merkezi (iç duvarlar kenar + 0.5, karakter i + j ile aynı ölçek)
const depthOf = (p: { itemId: string; tx: number; ty: number; rot?: number }) => { const [w, d] = sizeOf(p.itemId, p.rot); return p.tx + w - 0.5 + p.ty + d - 0.5; };

const flat = isFlat;

type D = { key: number; draw: () => void; box?: Part };
// kutular: eşya alanı, karakter ve efekt noktası, duvar (kalınlıksız çizgi); z ile üstte oturan öne geçer
const area = (i: number, j: number, w: number, d: number, z0 = 0, z1 = 1): Part => ({ i0: i, i1: i + w, j0: j, j1: j + d, z0, z1 });
const dot = (i: number, j: number, z0 = 0, z1 = 1): Part => area(i, j, 0, 0, z0, z1);
const wallBox = (wl: { i: number; j: number; axis: "i" | "j" }): Part => (wl.axis === "j" ? area(wl.i, wl.j, 0, 1) : area(wl.i, wl.j, 1, 0));

/**
 * Çizim sırası. Tek sayılık derinlik çok kareli eşyada yetmez (duvarın arkasındaki uzun eşya duvarın önüne taşar);
 * kutusu olan sahnede ekranda yan yana gelen her çift kutudan hangisinin arkada olduğuna bakılıp sıralanır.
 */
function depthOrder(list: D[]): D[] {
  if (list.some((d) => !d.box)) return list.sort((a, b) => a.key - b.key);
  const n = list.length, todo = list.map((_, k) => k).sort((a, b) => list[a].key - list[b].key);
  const xs = list.map(({ box: b }) => [(b!.i0 - b!.j1) * 8 - 12, (b!.i1 - b!.j0) * 8 + 12]);
  const next: number[][] = list.map(() => []), need = new Array<number>(n).fill(0);
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    if (xs[a][1] <= xs[b][0] || xs[b][1] <= xs[a][0]) continue; // ekranda örtüşmüyor
    const A = list[a].box!, B = list[b].box!;
    if (behind(A, B)) { next[a].push(b); need[b]++; } else if (behind(B, A)) { next[b].push(a); need[a]++; }
  }
  const out: D[] = [];
  while (todo.length) {
    let k = todo.findIndex((q) => need[q] === 0);
    if (k < 0) k = 0; // döngü olursa derinliği en küçük olan
    const q = todo.splice(k, 1)[0];
    out.push(list[q]);
    for (const x of next[q]) need[x]--;
  }
  return out;
}

/** Bütün sahne. Dönen değer: isim etiketlerinin ekran noktaları (dünya pikseli). */
export function drawScene(c: Ctx, t: number, s: SceneState): Anchor[] {
  lights.length = 0;
  nightNow = s.night;
  flashNow = stormFlash(t);
  const o = s.cam;
  const W = c.canvas.width, Hc = c.canvas.height;
  const list: D[] = [];
  const anchors: Anchor[] = [];
  const person = (key: string, who: "wizard" | "dwarf" | "elf" | "jon", i: number, j: number, dir: 1 | -1) =>
    list.push({ key: i + j, box: dot(i, j), draw: () => {
      const [x, y] = at(o, i, j);
      rect(c, x - 5, y - 1, 10, 2, "rgba(0,0,0,0.3)");
      const a = drawCharacter(c, { who, x, y, dir, pose: STAND, outfit: "home", blink: (t + i) % 5 < 0.12 });
      anchors.push({ key, x: a.head[0], y: a.head[1] - 2 });
    } });

  if (s.scope === "oda") {
    c.fillStyle = "#0c0e1c"; c.fillRect(0, 0, W, Hc); house(c, o, t, s.theme);
    for (const p of s.placed) if (flat(p.itemId)) drawItem(c, o, p, t);
    const th = THEME[s.theme];
    const faces = { top: th.wallHi, left: th.wall[0], right: th.wall[1] };
    for (const wl of innerWalls()) list.push({ key: wl.i + wl.j + 0.5, box: wallBox(wl), draw: () => innerWall(c, o, wl, faces) });
    const { w, d } = SIZE.oda;
    for (let j = 0; j < d; j++) list.push({ key: w + j + 0.55, box: area(w, j, 0, 1), draw: () => box(c, o, w - 0.1, j, 0.2, 1, 6, faces, 0, false) });
    for (let i = 0; i < w; i++) list.push({ key: i + d + 0.55, box: area(i, d, 1, 0), draw: () => box(c, o, i, d - 0.1, 1, 0.2, 6, faces, 0, false) });
  } else if (s.scope === "sato") {
    c.fillStyle = "#0a0a14"; c.fillRect(0, 0, W, Hc);
    const floor = s.floor ?? 1;
    castleInterior(c, o, t, KIT, floor);
    const di = (p: { itemId: string; tx: number; ty: number; rot?: number }) => drawItem(c, o, p, t);
    const decor = castleDecor(floor);
    for (const d of decor) if (decorIsFlat(d)) drawDecor(c, o, d, t, di);
    for (const d of decor) {
      if (decorIsFlat(d)) continue;
      const [w, dd] = decorSize(d);
      list.push({ key: d.tx + w - 0.5 + d.ty + dd - 0.5, box: area(d.tx, d.ty, w, dd), draw: () => drawDecor(c, o, d, t, di) });
    }
    for (const wl of castleWalls(floor)) list.push({ key: wl.i + wl.j + 0.5, box: wallBox(wl), draw: () => innerWall(c, o, wl, castleWallFaces(wl.hall), 18) });
    if (floor === 2) for (const tg of TARGETS) {
      const st = s.targetState?.[tg.id];
      list.push({ key: tg.i + tg.j, box: dot(tg.i, tg.j), draw: () => drawTarget(c, o, tg, t, st?.hit ?? 0, st?.hp ?? 1) });
    }
    const { w, d } = SIZE.sato, fr = castleWallFaces("buyuk-salon");
    for (let j = 0; j < d; j++) list.push({ key: w + j + 0.55, box: area(w, j, 0, 1), draw: () => box(c, o, w - 0.1, j, 0.2, 1, 8, fr, 0, false) });
    for (let i = 0; i < w; i++) list.push({ key: i + d + 0.55, box: area(i, d, 1, 0), draw: () => box(c, o, i, d - 0.1, 1, 0.2, 8, fr, 0, false) });
    for (const g of castleGuests(floor)) person(g.key, g.who, g.i, g.j, g.dir);
    if (floor === 1) list.push({ key: 12.5 + 3.5 + 0.1, box: dot(12.5, 3.5, 1, 2), draw: () => {
      const [x, y] = at(o, 12.5, 3.5);
      const a = parrot(c, [x + 1, y - 21], -1, "perch", t, false);
      anchors.push({ key: "parrot", x: a.head[0], y: a.head[1] });
    } });
  } else {
    gardenGround(c, o, t);
    for (const p of s.placed) if (flat(p.itemId)) drawItem(c, o, p, t);
    list.push({ key: Math.min(CASTLE.i0 + CASTLE.j1, CASTLE.i1 + CASTLE.j0), draw: () => { const a = castleOutside(c, o, t, KIT, flashNow); anchors.push({ key: "sato", x: a[0], y: a[1] }); } });
    person(GATE_GUARD.key, GATE_GUARD.who, GATE_GUARD.i, GATE_GUARD.j, GATE_GUARD.dir);
    // bina: önündekiler (sol ön ya da sağ ön yüzün önü) ondan sonra çizilsin
    // karakter binanın arkasındaysa (şatoya giden yolda) bina yarı saydam çizilir ki kaybolmasın
    const behind = (h: (typeof HOUSES)[number]) => s.heroes.some((p) => {
      const x = at(o, p.i, p.j)[0];
      return p.i < h.i1 && p.j < h.j1 && x > at(o, h.i0, h.j1)[0] - 4 && x < at(o, h.i1, h.j0)[0] + 4 && p.i + p.j > h.i0 + h.j0 - 12;
    });
    HOUSES.forEach((h, k) => list.push({ key: Math.min(h.i0 + h.j1, h.i1 + h.j0), draw: () => {
      c.save(); if (behind(h)) c.globalAlpha = 0.42;
      const a = houseOutside(c, o, h, s.houseThemes[k] ?? "cengiz", t);
      c.restore();
      anchors.push({ key: `ev${k}`, x: a[0], y: a[1] });
    } }));
    HOUSES.forEach((h) => list.push({ key: h.door.i + 1.6 + h.door.j + 0.6, draw: () => mailbox(c, o, h.door.i + 1.6, h.door.j + 0.6) }));
    for (const [a, b] of TREES) list.push({ key: a + b + 1, draw: () => tree(c, o, a, b, t) });
    const perch: V = [2.5, HOUSES[0].j1 + 4.5];
    list.push({ key: perch[0] + perch[1], draw: () => {
      const [x, y] = at(o, perch[0], perch[1]);
      rect(c, x - 1, y - 18, 2, 18, P.woodDk); rect(c, x - 5, y - 19, 10, 2, P.woodLt);
      const a = parrot(c, [x + 1, y - 19], 1, "perch", t, false);
      anchors.push({ key: "parrot", x: a.head[0], y: a.head[1] });
    } });
  }
  for (const p of s.placed) {
    if (flat(p.itemId) || !itemById.get(p.itemId)) continue;
    const [w, d] = sizeOf(p.itemId, p.rot);
    list.push({ key: depthOf(p), box: area(p.tx, p.ty, w, d), draw: () => drawItem(c, o, p, t) });
  }
  for (const h of s.heroes) {
    // oturan, oturduğu eşyanın hemen önünde çizilir (yoksa koltuk ya da yatak üstünü örter)
    list.push({ key: Math.max(h.i + h.j, h.sit?.depth ?? 0), box: h.sit ? dot(h.i, h.j, 1, 2) : dot(h.i, h.j), draw: () => {
      const [x, y] = at(o, h.i, h.j);
      if (!h.sit) rect(c, x - 5, y - 1, 10, 2, "rgba(0,0,0,0.3)");
      // oturur ve uzanırken ayaktan pozuna yumuşakça geçer
      const k = h.sit ? (h.sit.at === undefined ? 1 : ease((t - h.sit.at) / (h.sit.sleep ? 0.45 : 0.28))) : 0;
      const lift = Math.round((h.sit?.lift ?? 0) * k);
      let pose: CharState["pose"] = h.moving ? walkFrame(h.dist) : STAND;
      if (h.sit) {
        let target = h.sit.sleep ? LIE : SEAT;
        if (h.sit.sleep && k >= 1 && Math.sin(t * 1.6) > 0.55) target = { ...LIE, neck: [LIE.neck[0], LIE.neck[1] - 1], eF: [LIE.eF[0], LIE.eF[1] - 1], hF: [LIE.hF[0], LIE.hF[1] - 1] }; // nefes
        pose = k >= 1 ? target : lerpFree(STAND_F, target, k);
      }
      const a = drawCharacter(c, { who: h.who, x, y: y - lift, dir: h.dir, pose, outfit: h.outfit, tint: h.tint, blink: (h.sit?.sleep && k >= 1) || (t + (h.who === "cengiz" ? 0 : 1.7)) % 4 < 0.12 });
      if (h.sit?.sleep && k >= 1) {
        // battaniye: kalçadan ayaklara
        const d = h.dir, bx = d > 0 ? a.hip[0] - 2 : a.hip[0] - 11;
        rect(c, bx - 1, a.hip[1] - 5, 15, 7, P.ink);
        rect(c, bx, a.hip[1] - 4, 13, 5, h.sit.blanket ?? "#b56b7a");
        rect(c, d > 0 ? bx : bx + 11, a.hip[1] - 4, 2, 5, "#f2e4c2"); // kıvrılan çarşaf
        for (let q = 0; q < 3; q++) px(c, bx + 3 + q * 4, a.hip[1] - 3 + (q % 2), "rgba(255,255,255,0.35)");
      }
      wornGear(c, a, h.dir, h.gear?.armor, !!h.sit);
      if (!h.sit && h.gear?.weapon) drawHeld(c, h.gear.weapon, a.hand, h.dir, h.gear.swing ?? 0);
      if (h.emote && t - h.emote.at < 2.2) emoteAbove(c, a.head, h.emote.kind, t - h.emote.at);
      if (h.shield) for (let k = 0; k < 20; k++) { const ang = t * 2 + (k / 20) * Math.PI * 2; px(c, Math.round(x + Math.cos(ang) * 10), Math.round(y - 10 + Math.sin(ang) * 6), k % 2 ? "#f3d48a" : "rgba(255,255,255,0.5)"); }
      if (h.sit?.sleep && k >= 1) for (let k = 0; k < 3; k++) {
        const q = (t * 0.5 + k / 3) % 1; const zx = a.head[0] + 4 + Math.round(q * 8), zy = a.head[1] - 2 - Math.round(q * 12);
        rect(c, zx, zy, 3, 1, `rgba(243,212,138,${(1 - q).toFixed(2)})`); px(c, zx + 1, zy + 1, `rgba(243,212,138,${(1 - q).toFixed(2)})`); rect(c, zx, zy + 2, 3, 1, `rgba(243,212,138,${(1 - q).toFixed(2)})`);
      }
      if (h.study) studyProps(c, x, y - lift, h.dir, h.study, t);
      anchors.push({ key: h.who, x: a.head[0], y: a.head[1] - 2 });
    } });
  }
  if (s.cat) {
    const k = s.cat;
    list.push({ key: k.i + k.j, box: dot(k.i, k.j, k.sleep ? 1 : 0, k.sleep ? 2 : 1), draw: () => {
      const [x, y] = at(o, k.i, k.j);
      const a = duldul(c, x, y, k.dir, k.sleep ? "rest" : k.moving ? "walk" : "sit", k.dist, t, false);
      anchors.push({ key: "duldul", x: a.head[0], y: a.head[1] + 2 });
    } });
  }
  const now = s.now ?? t;
  for (const e of s.effects ?? []) {
    if (e.kind === "hasar" || e.kind === "sifa-sayi") continue;
    const [ei, ej] = shotAt(e, now);
    list.push({ key: ei + ej + 0.6, box: dot(ei, ej, 1, 2), draw: () => drawEffect(c, o, e, now) });
  }
  depthOrder(list).forEach((d) => d.draw());

  // yan yana gelince aranızdan kalpler yükselir
  if (s.heroes.length >= 2) {
    const [h1, h2] = s.heroes;
    if (Math.hypot(h1.i - h2.i, h1.j - h2.j) < 1.6) {
      const [x, y] = at(o, (h1.i + h2.i) / 2, (h1.j + h2.j) / 2);
      for (let k = 0; k < 3; k++) {
        const q = (t * 0.6 + k / 3) % 1;
        c.save(); c.globalAlpha = 1 - q;
        sprite(c, SMALL_HEART, Math.round(x - 2 + Math.sin(q * 6 + k) * 4), Math.round(y - 30 - q * 18), { o: P.ink, x: k % 2 ? "#e48aa0" : "#d8485a" });
        c.restore();
      }
    }
  }
  // okunmamış not: posta kutusunun üstünde zıplayan kalp
  if (s.scope === "bahce" && s.mailHeart !== null && HOUSES[s.mailHeart]) {
    const h = HOUSES[s.mailHeart]; const [x, y] = at(o, h.door.i + 1.6, h.door.j + 0.6);
    sprite(c, SMALL_HEART, x - 2, y - 30 - Math.round(Math.abs(Math.sin(t * 3)) * 3), { o: P.ink, x: "#d8485a" });
  }
  // piyano: notalar yükselir
  if (s.music && t - s.music.t0 < 3.5) {
    const [x, y] = at(o, s.music.i, s.music.j);
    for (let k = 0; k < 4; k++) {
      const q = ((t - s.music.t0) * 0.6 + k / 4) % 1;
      const nx = Math.round(x - 6 + k * 4 + Math.sin(q * 6 + k) * 3), ny = Math.round(y - 22 - q * 22);
      const col = `rgba(${k % 2 ? "228,138,160" : "243,212,138"},${(1 - q).toFixed(2)})`;
      rect(c, nx, ny, 2, 2, col); rect(c, nx + 1, ny - 4, 1, 4, col); px(c, nx + 2, ny - 4, col);
    }
  }

  // karanlık: içeride loş, dışarıda fırtınalı alacakaranlık; gece daha da koyu
  const outside = s.scope === "bahce";
  c.fillStyle = outside ? `rgba(12,16,38,${(0.42 + 0.3 * s.night).toFixed(3)})` : `rgba(8,6,20,${(0.32 + 0.2 * s.night).toFixed(3)})`;
  c.fillRect(0, 0, W, Hc);
  if (outside) {
    const { w, d } = SIZE.bahce;
    for (let k = 0; k < 26; k++) {
      const fi = 1 + rnd(k * 3.1) * (w - 2) + Math.sin(t * 0.4 + k) * 0.8, fj = CASTLE.j1 + 2 + rnd(k * 7.7) * (d - CASTLE.j1 - 3) + Math.cos(t * 0.5 + k * 1.3) * 0.8;
      const glow = (Math.sin(t * 2 + k * 2.3) + 1) / 2;
      if (glow < 0.3) continue;
      const [x, y] = at(o, fi, fj); const fy = y - 10 - Math.round(Math.sin(t + k) * 4);
      px(c, x, fy, `rgba(200,255,140,${glow.toFixed(2)})`);
      lights.push({ x, y: fy, r: 6, color: "180,255,120" });
    }
    fog(c, W, Hc, t);
    bats(c, W, Hc, t);
  }

  if (s.pick) {
    const p = s.placed.find((q) => q.id === s.pick);
    if (p) for (const [a, b] of footprint(p.itemId, p.tx, p.ty, p.rot)) tile(c, o, a, b, "rgba(232,96,96,0.35)");
  }
  if (s.ghost) {
    const g = s.ghost;
    for (const [a, b] of footprint(g.itemId, g.tx, g.ty, g.rot)) tile(c, o, a, b, g.ok ? "rgba(120,220,140,0.45)" : "rgba(232,96,96,0.45)");
    c.save(); c.globalAlpha = 0.7; drawItem(c, o, g, t); c.restore();
    facingArrow(c, o, g, g.ok ? "#9fe8ae" : "#f09090");
  }

  // ışıklar: meşale, mum, pencere, ateş böceği
  const glow = Math.max(s.night, 0.7);
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const l of lights) {
    const gr = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    gr.addColorStop(0, `rgba(${l.color},${(0.16 + 0.24 * glow).toFixed(3)})`); gr.addColorStop(1, `rgba(${l.color},0)`);
    c.fillStyle = gr; c.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  c.restore();

  // fırtına: dışarıda yağmur perdesi; şimşekte her yer bir an ağarır
  if (outside) screenRain(c, W, Hc, t, 1);
  else if (s.scope === "sato" && s.floor === 2) {
    // açık balkon: yağmur yalnız balkonun üstüne düşer
    const lift = (p: V): V => [p[0], p[1] - 80];
    const b = BALCONY, q = [at(o, b.i0, b.j0), at(o, b.i1, b.j0), at(o, b.i1, b.j1), at(o, b.i0, b.j1)];
    c.save(); c.beginPath();
    for (const [x, y] of [lift(q[0]), lift(q[1]), q[1], q[2], q[3], lift(q[3])]) c.lineTo(x, y);
    c.closePath(); c.clip(); screenRain(c, W, Hc, t, 1); c.restore();
  }
  if (flashNow > 0) { c.fillStyle = `rgba(220,228,255,${(flashNow * (outside ? 0.5 : 0.16)).toFixed(3)})`; c.fillRect(0, 0, W, Hc); }
  // hasar ve şifa sayıları her şeyin üstünde
  for (const e of s.effects ?? []) drawEffect(c, o, e, now, true);
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

// masa başında çalışan: önünde açık defter ya da kitap, sayfası arada çevrilir; sayaç açıkken başında odak ışığı ve yükselen kıvılcımlar
function studyProps(c: Ctx, x: number, y: number, dir: 1 | -1, st: { reading: boolean; focus: boolean }, t: number) {
  const bx = x + dir * 4 - 4, by = y - 9;
  if (st.reading) {
    rect(c, bx, by, 9, 5, "#3b2f4a"); rect(c, bx + 1, by + 1, 3, 3, "#f4ead2"); rect(c, bx + 5, by + 1, 3, 3, "#f4ead2");
    if ((t % 5) < 0.35) rect(c, bx + 4, by - 1, 2, 4, "#fff8e6"); // sayfa çevriliyor
  } else {
    rect(c, bx, by + 1, 9, 4, "#f4ead2"); rect(c, bx, by + 1, 9, 1, "#9b7cc4");
    const k = Math.floor(t * 3) % 3; rect(c, bx + 2 + k * 2, by + 3, 1, 1, "#3b2f4a"); // kalem yazıyor
  }
  if (!st.focus) return;
  for (let k = 0; k < 3; k++) {
    const q = (t * 0.4 + k / 3) % 1;
    const a = (1 - q).toFixed(2);
    px(c, Math.round(x - 6 + k * 6 + Math.sin(q * 5 + k) * 2), Math.round(y - 30 - q * 14), `rgba(243,212,138,${a})`);
  }
  const g = 0.5 + 0.5 * Math.sin(t * 2);
  rect(c, x - 1, y - 33, 3, 1, `rgba(255,236,170,${(0.45 + 0.4 * g).toFixed(2)})`);
}

// ------------------------------- kuşanılanlar ve emote -------------------------------

const INK_C = "#1a1420";
/** Kuşanılan miğfer başın üstünde, kalkan arka kolda; renkler zırhın malzemesinden */
function wornGear(c: Ctx, a: { head: V; hip: V }, dir: 1 | -1, armor: string | null | undefined, seated: boolean) {
  if (!armor) return;
  const m = MATS.find((x) => armor.endsWith(`-${x.id}`));
  if (!m) return;
  if (armor.startsWith("migfer-")) {
    const [hx, hy] = a.head;
    rect(c, hx - 4, hy, 9, 1, INK_C); rect(c, hx - 5, hy + 1, 11, 4, INK_C);
    rect(c, hx - 3, hy + 1, 7, 1, m.base); rect(c, hx - 4, hy + 2, 9, 1, m.base);
    rect(c, hx - 3, hy + 2, 2, 1, m.lt); rect(c, hx - 4, hy + 3, 9, 1, m.dk);
    rect(c, hx + (dir > 0 ? 1 : -2), hy + 4, 1, 2, m.dk); // burun koruması
    rect(c, hx, hy - 3, 1, 3, m.gem); rect(c, hx - 1, hy - 4, 3, 1, m.gem); // sorguç
  } else if (armor.startsWith("kalkan-") && !seated) {
    // kalkan gövdenin arka yanında, kolda taşınır gibi
    const x = a.hip[0] - dir * 5 - 3, y = a.hip[1] - 9;
    rect(c, x - 1, y - 1, 8, 7, INK_C); rect(c, x, y + 6, 6, 1, INK_C); rect(c, x + 1, y + 7, 4, 1, INK_C); rect(c, x + 2, y + 8, 2, 1, INK_C);
    rect(c, x, y, 6, 6, m.base); rect(c, x + 1, y + 6, 4, 1, m.base); rect(c, x + 2, y + 7, 2, 1, m.dk);
    rect(c, x + 2, y, 2, 7, m.dk); px(c, x + 2, y + 2, m.gem); px(c, x + 3, y + 2, m.gem); px(c, x, y, m.lt);
  }
}

/** Başın üstünde: yükselen kalpler ya da sallanan el */
function emoteAbove(c: Ctx, [hx, hy]: V, kind: Emote, age: number) {
  const fade = age > 1.7 ? Math.max(0, (2.2 - age) / 0.5) : 1;
  c.save(); c.globalAlpha = fade;
  if (kind === "kalp") {
    for (let k = 0; k < 3; k++) {
      const q = (age * 0.8 + k / 3) % 1;
      sprite(c, SMALL_HEART, Math.round(hx - 2 + Math.sin(q * 6 + k) * 4), Math.round(hy - 6 - q * 16), { o: P.ink, x: k % 2 ? "#e48aa0" : "#d8485a" });
    }
  } else {
    const sw = Math.round(Math.sin(age * 14) * 2), x = hx + 6 + sw, y = hy - 8;
    rect(c, x - 1, y - 1, 6, 7, INK_C); rect(c, x, y, 4, 5, "#f0c8a0"); // avuç
    for (let f = 0; f < 3; f++) { rect(c, x + f + (f > 0 ? f - 1 : 0), y - 3, 1, 3, INK_C); }
    rect(c, x, y - 2, 1, 2, "#f0c8a0"); rect(c, x + 2, y - 3, 1, 3, "#f0c8a0"); rect(c, x + 4, y - 2, 1, 2, INK_C);
    rect(c, x - 2, y + 2, 1, 2, "#f0c8a0"); // başparmak
  }
  c.restore();
}

/** Yerleştirme önizlemesi: eşyanın önünün baktığı yöne zeminde bir ok (0 +j, 1 +i, 2 -j, 3 -i) */
function facingArrow(c: Ctx, o: Origin, g: { itemId: string; tx: number; ty: number; rot?: number }, color: string) {
  const r = (g.rot ?? 0) & 3, [w, d] = sizeOf(g.itemId, r);
  const [di, dj] = ([[0, 1], [1, 0], [0, -1], [-1, 0]] as const)[r];
  const ci = g.tx + w / 2, cj = g.ty + d / 2, reach = (di ? w : d) / 2 + 0.7;
  const p0 = at(o, ci + di * (reach - 0.6), cj + dj * (reach - 0.6)), p1 = at(o, ci + di * reach, cj + dj * reach);
  const vx = p1[0] - p0[0], vy = p1[1] - p0[1], l = Math.hypot(vx, vy) || 1, ux = vx / l, uy = vy / l;
  const tip: V = [p1[0] + ux * 3, p1[1] + uy * 3], back: V = [p1[0] - ux * 3, p1[1] - uy * 3];
  line(c, p0, back, 2, color);
  poly(c, [tip, [back[0] - uy * 4, back[1] + ux * 4], [back[0] + uy * 4, back[1] - ux * 4]], color);
}
