// Gelişim: evin kat planı, bahçenin düzeni ve yerleştirme / yürüme kuralları.
// Hem tarayıcı (önizleme, çarpışma) hem sunucu (doğrulama) kullanır. scope "oda" = kişinin evi.
import { type Scope, itemById } from "./room-items";

export const SIZE: Record<Scope, { w: number; d: number }> = { oda: { w: 20, d: 14 }, bahce: { w: 36, d: 26 } };

/* ------------------------------------ ev ------------------------------------ */

export type RoomId = "hol" | "salon" | "yatak" | "mutfak" | "banyo" | "calisma";
export type Room = { id: RoomId; name: string; i0: number; j0: number; i1: number; j1: number };

// odalar dikdörtgen; i1, j1 dahil değil. Evi boşluksuz doldururlar.
export const ROOMS: Room[] = [
  { id: "hol", name: "Giriş holü", i0: 0, j0: 0, i1: 6, j1: 6 },
  { id: "salon", name: "Salon", i0: 6, j0: 0, i1: 14, j1: 8 },
  { id: "yatak", name: "Yatak odası", i0: 14, j0: 0, i1: 20, j1: 8 },
  { id: "mutfak", name: "Mutfak", i0: 0, j0: 6, i1: 6, j1: 14 },
  { id: "banyo", name: "Banyo", i0: 6, j0: 8, i1: 10, j1: 14 },
  { id: "calisma", name: "Çalışma odası", i0: 10, j0: 8, i1: 20, j1: 14 },
];

// odalar arası kapı boşlukları: komşu iki kare
export const DOORS: [[number, number], [number, number]][] = [
  [[5, 3], [6, 3]], // hol - salon
  [[2, 5], [2, 6]], // hol - mutfak
  [[13, 4], [14, 4]], // salon - yatak
  [[7, 7], [7, 8]], // salon - banyo
  [[11, 7], [11, 8]], // salon - çalışma
  [[16, 7], [16, 8]], // yatak - çalışma
  [[5, 10], [6, 10]], // mutfak - banyo
];

// evin ön kapısı: holün sol duvarında (i = 0 kenarı), j = 2
export const FRONT_DOOR = { i: 0, j: 2 };

export const roomAt = (i: number, j: number) => ROOMS.find((r) => i >= r.i0 && i < r.i1 && j >= r.j0 && j < r.j1);

const doorKey = (a: [number, number], b: [number, number]) => [a, b].map((p) => p.join(",")).sort().join("|");
const DOOR_SET = new Set(DOORS.map(([a, b]) => doorKey(a, b)));

/** Evde bir kareden komşu kareye geçilebilir mi: aynı oda ya da aradaki kapı boşluğu */
export function houseStep(a: [number, number], b: [number, number]): boolean {
  const ra = roomAt(a[0], a[1]), rb = roomAt(b[0], b[1]);
  if (!ra || !rb) return false;
  return ra === rb || DOOR_SET.has(doorKey(a, b));
}

/** İç duvarlar: farklı odalar arasındaki kenarlar, kapı boşlukları hariç (çizim için) */
export function innerWalls(): { i: number; j: number; axis: "i" | "j" }[] {
  const out: { i: number; j: number; axis: "i" | "j" }[] = [];
  const { w, d } = SIZE.oda;
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    if (i + 1 < w && roomAt(i, j) !== roomAt(i + 1, j) && !DOOR_SET.has(doorKey([i, j], [i + 1, j]))) out.push({ i: i + 1, j, axis: "j" });
    if (j + 1 < d && roomAt(i, j) !== roomAt(i, j + 1) && !DOOR_SET.has(doorKey([i, j], [i, j + 1]))) out.push({ i, j: j + 1, axis: "i" });
  }
  return out;
}

/* ---------------------------------- bahçe ---------------------------------- */

// iki ev bahçede birer bina; ön kapıları binanın sol-ön yüzünde (j1 kenarı)
export const HOUSES = [
  { i0: 3, j0: 2, i1: 13, j1: 8, door: { i: 7, j: 8 } },
  { i0: 22, j0: 2, i1: 32, j1: 8, door: { i: 26, j: 8 } },
] as const;
export const POND = { i0: 15, j0: 15, i1: 21, j1: 20 };
export const TREES: [number, number][] = [
  [0, 3], [1, 10], [0, 16], [1, 22], [5, 24], [11, 25], [17, 24], [24, 25], [30, 24], [35, 20], [34, 13], [35, 6], [33, 0], [18, 1], [14, 0],
  [21, 14], [13, 18], [27, 18], [9, 14],
];
// yollar: kapılardan aşağı, ortada meydan ve göletin çevresi
export function isPath(i: number, j: number): boolean {
  if (HOUSES.some((h) => i === h.door.i && j >= h.door.j && j <= 12)) return true;
  if (j === 12 && i >= 7 && i <= 26) return true;
  if (i >= 15 && i <= 19 && j >= 10 && j <= 12) return true;
  return false;
}

const inRect = (i: number, j: number, r: { i0: number; j0: number; i1: number; j1: number }) => i >= r.i0 && i < r.i1 && j >= r.j0 && j < r.j1;

/** Bahçede sabit engeller: evler, gölet, ağaçlar */
export function gardenSolid(i: number, j: number): boolean {
  return HOUSES.some((h) => inRect(i, j, h)) || inRect(i, j, POND) || TREES.some(([a, b]) => a === i && b === j);
}

/* -------------------------------- yerleştirme ------------------------------- */

export type Placed = { id: string; itemId: string; scope: Scope; tx: number; ty: number; userId: string };

/** Eşyanın kapladığı kareler */
export function footprint(itemId: string, tx: number, ty: number): [number, number][] {
  const it = itemById.get(itemId);
  if (!it) return [];
  const out: [number, number][] = [];
  for (let a = 0; a < it.size[0]; a++) for (let b = 0; b < it.size[1]; b++) out.push([tx + a, ty + b]);
  return out;
}

// kapıların önü ve boşlukları boş kalmalı ki geçilebilsin
function keepClear(scope: Scope): [number, number][] {
  if (scope === "oda") return [[FRONT_DOOR.i, FRONT_DOOR.j], [FRONT_DOOR.i + 1, FRONT_DOOR.j], ...DOORS.flat()];
  return HOUSES.flatMap((h) => [[h.door.i, h.door.j], [h.door.i, h.door.j + 1]] as [number, number][]);
}

/** Bu kareye konabilir mi: sahne içinde, tek odada, engel ve kapı önünde değil, başka eşyayla çakışmıyor */
export function canPlace(scope: Scope, itemId: string, tx: number, ty: number, placed: Placed[]): boolean {
  const it = itemById.get(itemId);
  if (!it || it.scope !== scope || !Number.isInteger(tx) || !Number.isInteger(ty)) return false;
  const { w, d } = SIZE[scope];
  const cells = footprint(itemId, tx, ty);
  if (cells.some(([a, b]) => a < 0 || b < 0 || a >= w || b >= d)) return false;
  if (scope === "oda" && new Set(cells.map(([a, b]) => roomAt(a, b)?.id)).size !== 1) return false;
  if (scope === "bahce" && cells.some(([a, b]) => gardenSolid(a, b))) return false;
  const busy = new Set(placed.filter((p) => p.scope === scope).flatMap((p) => footprint(p.itemId, p.tx, p.ty).map(([a, b]) => `${a},${b}`)));
  keepClear(scope).forEach(([a, b]) => busy.add(`${a},${b}`));
  return cells.every(([a, b]) => !busy.has(`${a},${b}`));
}

/** Yürürken çarpılan kareler (eşyalar; halı gibi düz olanlar hariç) */
export function blockedSet(scope: Scope, placed: Placed[]): Set<string> {
  return new Set(placed.filter((p) => p.scope === scope && p.itemId !== "hali").flatMap((p) => footprint(p.itemId, p.tx, p.ty).map(([a, b]) => `${a},${b}`)));
}

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  const cover = ROOMS.reduce((n, r) => n + (r.i1 - r.i0) * (r.j1 - r.j0), 0);
  console.assert(cover === SIZE.oda.w * SIZE.oda.d, "odalar evi boşluksuz doldurmalı");
  console.assert(houseStep([5, 3], [6, 3]) && !houseStep([5, 2], [6, 2]) && houseStep([3, 3], [4, 3]), "kapı boşlukları");
  console.assert(canPlace("oda", "yatak", 15, 1, []) && !canPlace("oda", "yatak", 13, 1, []), "eşya iki odaya taşmaz");
  console.assert(!canPlace("oda", "komodin", 0, 2, []) && !canPlace("oda", "komodin", 6, 3, []), "kapı önü");
  console.assert(!canPlace("bahce", "agac", 4, 3, []) && canPlace("bahce", "agac", 10, 20, []), "bahçe engelleri");
}
