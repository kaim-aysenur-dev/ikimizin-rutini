// Gelişim: evin kat planı, bahçenin düzeni, şato ve yerleştirme / yürüme kuralları.
// Hem tarayıcı (önizleme, çarpışma) hem sunucu (doğrulama) kullanır. scope "oda" = kişinin evi.
import { type Scope, isFlat, itemById } from "./room-items";

/** Yürünen yerler: kişinin evi, ortak bahçe ve ortak şato (şatoya eşya konmaz) */
export type Area = Scope | "sato";

export const SIZE: Record<Area, { w: number; d: number }> = { oda: { w: 28, d: 20 }, bahce: { w: 36, d: 40 }, sato: { w: 36, d: 24 } };

/* ------------------------------ kat planları ------------------------------- */

export type RoomId = "hol" | "salon" | "yatak" | "mutfak" | "banyo" | "calisma";
export type HallId = "buyuk-salon" | "kutuphane" | "somine" | "yemek" | "spor" | "hamam";
export type Room<Id extends string = RoomId> = { id: Id; name: string; i0: number; j0: number; i1: number; j1: number };
type Pair = [[number, number], [number, number]];
export type Plan<Id extends string = string> = { w: number; d: number; rooms: Room<Id>[]; doors: Pair[] };

// Odalar dikdörtgen; i1, j1 dahil değil. Evi boşluksuz doldururlar.
// 2 kat büyütmede her oda eski köşesinden genişledi; eski kapı kareleri odalarına göre aynı yerde kaldı
// (014 göçü eşyaları oda köşesine göre aynı konuma taşır, böylece hiçbir eşya kapı önüne düşmez).
export const ROOMS: Room[] = [
  { id: "hol", name: "Giriş holü", i0: 0, j0: 0, i1: 8, j1: 8 },
  { id: "salon", name: "Salon", i0: 8, j0: 0, i1: 20, j1: 11 },
  { id: "yatak", name: "Yatak odası", i0: 20, j0: 0, i1: 28, j1: 11 },
  { id: "mutfak", name: "Mutfak", i0: 0, j0: 8, i1: 8, j1: 20 },
  { id: "banyo", name: "Banyo", i0: 8, j0: 11, i1: 14, j1: 20 },
  { id: "calisma", name: "Çalışma odası", i0: 14, j0: 11, i1: 28, j1: 20 },
];

// odalar arası kapı boşlukları: komşu iki kare
export const DOORS: Pair[] = [
  [[7, 3], [8, 3]], // hol - salon
  [[2, 7], [2, 8]], // hol - mutfak
  [[19, 4], [20, 4]], // salon - yatak
  [[9, 10], [9, 11]], // salon - banyo
  [[15, 10], [15, 11]], // salon - çalışma
  [[20, 10], [20, 11]], // yatak - çalışma
  [[7, 13], [8, 13]], // mutfak - banyo
];

// evin ön kapısı: holün sol duvarında (i = 0 kenarı), j = 2
export const FRONT_DOOR = { i: 0, j: 2 };

export const HOUSE_PLAN: Plan<RoomId> = { ...SIZE.oda, rooms: ROOMS, doors: DOORS };

// Şato: altı salon. Kapılar iki kare geniş; giriş büyük salonun sol duvarında.
export const HALLS: Room<HallId>[] = [
  { id: "buyuk-salon", name: "Büyük salon", i0: 0, j0: 0, i1: 14, j1: 12 },
  { id: "kutuphane", name: "Kütüphane", i0: 14, j0: 0, i1: 26, j1: 12 },
  { id: "somine", name: "Şömine odası", i0: 26, j0: 0, i1: 36, j1: 12 },
  { id: "yemek", name: "Yemek salonu", i0: 0, j0: 12, i1: 12, j1: 24 },
  { id: "spor", name: "Spor salonu", i0: 12, j0: 12, i1: 24, j1: 24 },
  { id: "hamam", name: "Hamam", i0: 24, j0: 12, i1: 36, j1: 24 },
];
const wide = (a: [number, number], b: [number, number], along: "i" | "j"): Pair[] => {
  const [di, dj] = along === "i" ? [1, 0] : [0, 1];
  return [[a, b], [[a[0] + di, a[1] + dj], [b[0] + di, b[1] + dj]]];
};
export const CASTLE_PLAN: Plan<HallId> = {
  ...SIZE.sato,
  rooms: HALLS,
  doors: [
    ...wide([13, 5], [14, 5], "j"), // büyük salon - kütüphane
    ...wide([25, 5], [26, 5], "j"), // kütüphane - şömine
    ...wide([5, 11], [5, 12], "i"), // büyük salon - yemek
    ...wide([11, 17], [12, 17], "j"), // yemek - spor
    ...wide([19, 11], [19, 12], "i"), // kütüphane - spor
    ...wide([23, 17], [24, 17], "j"), // spor - hamam
    ...wide([30, 11], [30, 12], "i"), // şömine - hamam
  ],
};
// şatonun içten kapısı: büyük salonun sol duvarında, j = 5 ve 6
export const CASTLE_ENTRY = { i: 0, j: 5, width: 2 };
export const atEntry = (j: number) => j >= CASTLE_ENTRY.j && j < CASTLE_ENTRY.j + CASTLE_ENTRY.width;

export const planOf = (area: "oda" | "sato"): Plan => (area === "oda" ? HOUSE_PLAN : CASTLE_PLAN);
export const roomIn = <Id extends string>(plan: Plan<Id>, i: number, j: number) => plan.rooms.find((r) => i >= r.i0 && i < r.i1 && j >= r.j0 && j < r.j1);
export const roomAt = (i: number, j: number) => roomIn(HOUSE_PLAN, i, j);

const doorKey = (a: [number, number], b: [number, number]) => [a, b].map((p) => p.join(",")).sort().join("|");
const doorSets = new WeakMap<Plan, Set<string>>();
const doorSet = (plan: Plan) => {
  let s = doorSets.get(plan);
  if (!s) { s = new Set(plan.doors.map(([a, b]) => doorKey(a, b))); doorSets.set(plan, s); }
  return s;
};

/** Planda bir kareden komşu kareye geçilebilir mi: aynı oda ya da aradaki kapı boşluğu */
export function stepIn(plan: Plan, a: [number, number], b: [number, number]): boolean {
  const ra = roomIn(plan, a[0], a[1]), rb = roomIn(plan, b[0], b[1]);
  if (!ra || !rb) return false;
  return ra === rb || doorSet(plan).has(doorKey(a, b));
}
export const houseStep = (a: [number, number], b: [number, number]) => stepIn(HOUSE_PLAN, a, b);

/** İç duvarlar: farklı odalar arasındaki kenarlar, kapı boşlukları hariç (çizim için) */
export function wallsOf(plan: Plan): { i: number; j: number; axis: "i" | "j" }[] {
  const out: { i: number; j: number; axis: "i" | "j" }[] = [];
  const ds = doorSet(plan), rm = (i: number, j: number) => roomIn(plan, i, j);
  for (let i = 0; i < plan.w; i++) for (let j = 0; j < plan.d; j++) {
    if (i + 1 < plan.w && rm(i, j) !== rm(i + 1, j) && !ds.has(doorKey([i, j], [i + 1, j]))) out.push({ i: i + 1, j, axis: "j" });
    if (j + 1 < plan.d && rm(i, j) !== rm(i, j + 1) && !ds.has(doorKey([i, j], [i, j + 1]))) out.push({ i, j: j + 1, axis: "i" });
  }
  return out;
}
export const innerWalls = () => wallsOf(HOUSE_PLAN);

/* ---------------------------------- bahçe ---------------------------------- */

// Bahçenin kuzeyinde şato: ön yüzü (j1) bahçeye bakar, kapısı ortada. Kuzeydeki şerit yalnız manzara.
// (014 göçü eski bahçeyi 14 kare güneye kaydırdı.)
export const CASTLE = { i0: 8, j0: 1, i1: 28, j1: 11, gate: { i: 17, width: 2 } } as const;
const GJ = 14;

// iki ev bahçede birer bina; ön kapıları binanın sol-ön yüzünde (j1 kenarı)
export const HOUSES = [
  { i0: 3, j0: 2 + GJ, i1: 13, j1: 8 + GJ, door: { i: 7, j: 8 + GJ } },
  { i0: 22, j0: 2 + GJ, i1: 32, j1: 8 + GJ, door: { i: 26, j: 8 + GJ } },
] as const;
export const POND = { i0: 15, j0: 15 + GJ, i1: 21, j1: 20 + GJ };
export const TREES: [number, number][] = [
  // güney bahçe
  [0, 3 + GJ], [1, 10 + GJ], [0, 16 + GJ], [1, 22 + GJ], [5, 24 + GJ], [11, 25 + GJ], [17, 24 + GJ], [24, 25 + GJ], [30, 24 + GJ], [35, 20 + GJ],
  [34, 13 + GJ], [35, 6 + GJ], [33, 0 + GJ], [14, 0 + GJ], [21, 14 + GJ], [13, 18 + GJ], [27, 18 + GJ], [9, 14 + GJ],
  // şatonun çevresi (kuzey şerit)
  [1, 1], [3, 5], [1, 9], [5, 10], [31, 2], [34, 6], [32, 10], [35, 12], [6, 2], [30, 7],
];
/** Ölü (yapraksız) ağaçlar: karanlık bahçenin havası */
export const deadTree = (i: number, j: number) => (i * 7 + j * 3) % 4 === 0;

const inRect = (i: number, j: number, r: { i0: number; j0: number; i1: number; j1: number }) => i >= r.i0 && i < r.i1 && j >= r.j0 && j < r.j1;
export const atGate = (i: number) => i >= CASTLE.gate.i && i < CASTLE.gate.i + CASTLE.gate.width;

// yollar: kapılardan aşağı, ortada meydan, göletin çevresi ve şato kapısına çıkan taş yol
export function isPath(i: number, j: number): boolean {
  if (HOUSES.some((h) => i === h.door.i && j >= h.door.j && j <= 12 + GJ)) return true;
  if (j === 12 + GJ && i >= 7 && i <= 26) return true;
  if (i >= 15 && i <= 19 && j >= 10 + GJ && j <= 12 + GJ) return true;
  if (atGate(i) && j >= CASTLE.j1 && j < 10 + GJ) return true;
  if (j >= CASTLE.j1 && j <= CASTLE.j1 + 1 && i >= CASTLE.gate.i - 2 && i < CASTLE.gate.i + CASTLE.gate.width + 2) return true; // kapı önü
  return false;
}

/** Bahçede sabit engeller: evler, gölet, ağaçlar, şato ve arkasındaki şerit */
export function gardenSolid(i: number, j: number): boolean {
  return j < CASTLE.j1 || HOUSES.some((h) => inRect(i, j, h)) || inRect(i, j, POND) || TREES.some(([a, b]) => a === i && b === j);
}

/* -------------------------------- yerleştirme ------------------------------- */

// rot: 1 ise eşya döndürülmüş (eni ve boyu yer değiştirir)
export type Placed = { id: string; itemId: string; scope: Scope; tx: number; ty: number; userId: string; rot?: number };

/** Döndürmeye göre eşyanın kapladığı en ve boy */
export function sizeOf(itemId: string, rot = 0): [number, number] {
  const it = itemById.get(itemId);
  if (!it) return [1, 1];
  return rot ? [it.size[1], it.size[0]] : it.size;
}

/** Bir eşyadan en çok kaç tane konabilir: halı 10, sandalye ve çiçek gibi küçükler daha çok, büyük mobilya az */
export function maxCopies(itemId: string): number {
  const it = itemById.get(itemId);
  if (!it) return 1;
  if (isFlat(itemId) && !itemId.startsWith("piknik-")) return 10;
  if (/^(sandalye-|cit-|lale-|cicek|lavanta|aycicegi|mantar|bahce-feneri-|fener)/.test(itemId)) return 12;
  if (/^(puf-|berjer-|calisma-sandalyesi-|bitki-|saksi|cali-|meyve-agaci-|agac|sebze-|kus-evi-)/.test(itemId) || it.cat === "Bitki") return 6;
  if (/^(lambader-|samdan-|vazo-|sehpa-|kitaplik|komodin|bahce-banki-|bank|kedi-yatagi-)/.test(itemId)) return 4;
  return 2;
}

/** Eşyanın kapladığı kareler */
export function footprint(itemId: string, tx: number, ty: number, rot = 0): [number, number][] {
  if (!itemById.get(itemId)) return [];
  const [w, d] = sizeOf(itemId, rot);
  const out: [number, number][] = [];
  for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) out.push([tx + a, ty + b]);
  return out;
}

// kapıların önü ve boşlukları boş kalmalı ki geçilebilsin
function keepClear(scope: Scope): [number, number][] {
  if (scope === "oda") return [[FRONT_DOOR.i, FRONT_DOOR.j], [FRONT_DOOR.i + 1, FRONT_DOOR.j], ...DOORS.flat()];
  const gate: [number, number][] = [];
  for (let k = 0; k < CASTLE.gate.width; k++) gate.push([CASTLE.gate.i + k, CASTLE.j1], [CASTLE.gate.i + k, CASTLE.j1 + 1]);
  return [...HOUSES.flatMap((h) => [[h.door.i, h.door.j], [h.door.i, h.door.j + 1]] as [number, number][]), ...gate];
}

/** Bu kareye konabilir mi: sahne içinde, tek odada, engel ve kapı önünde değil, başka eşyayla çakışmıyor */
export function canPlace(scope: Scope, itemId: string, tx: number, ty: number, placed: Placed[], rot = 0): boolean {
  const it = itemById.get(itemId);
  if (!it || it.scope !== scope || !Number.isInteger(tx) || !Number.isInteger(ty)) return false;
  const { w, d } = SIZE[scope];
  const cells = footprint(itemId, tx, ty, rot);
  if (cells.some(([a, b]) => a < 0 || b < 0 || a >= w || b >= d)) return false;
  if (scope === "oda" && new Set(cells.map(([a, b]) => roomAt(a, b)?.id)).size !== 1) return false;
  if (scope === "bahce" && cells.some(([a, b]) => gardenSolid(a, b))) return false;
  // halının üstüne mobilya konabilir; halı da halıyla değil yalnız kendi gibilerle çakışır
  const busy = new Set(placed.filter((p) => p.scope === scope && isFlat(p.itemId) === isFlat(itemId)).flatMap((p) => footprint(p.itemId, p.tx, p.ty, p.rot).map(([a, b]) => `${a},${b}`)));
  keepClear(scope).forEach(([a, b]) => busy.add(`${a},${b}`));
  return cells.every(([a, b]) => !busy.has(`${a},${b}`));
}

/** Yürürken çarpılan kareler (eşyalar; halı gibi düz olanlar hariç) */
export function blockedSet(scope: Scope, placed: Placed[]): Set<string> {
  return new Set(placed.filter((p) => p.scope === scope && !isFlat(p.itemId)).flatMap((p) => footprint(p.itemId, p.tx, p.ty, p.rot).map(([a, b]) => `${a},${b}`)));
}

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  for (const plan of [HOUSE_PLAN, CASTLE_PLAN] as Plan[]) {
    const cover = plan.rooms.reduce((n, r) => n + (r.i1 - r.i0) * (r.j1 - r.j0), 0);
    console.assert(cover === plan.w * plan.d, "odalar planı boşluksuz doldurmalı");
    console.assert(plan.doors.every(([a, b]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1 && roomIn(plan, ...a) !== roomIn(plan, ...b)), "kapılar iki odayı birleştirir");
  }
  console.assert(houseStep([7, 3], [8, 3]) && !houseStep([7, 2], [8, 2]) && houseStep([3, 3], [4, 3]), "kapı boşlukları");
  console.assert(canPlace("oda", "yatak", 21, 1, []) && !canPlace("oda", "yatak", 19, 1, []), "eşya iki odaya taşmaz");
  console.assert(!canPlace("oda", "komodin", 0, 2, []) && !canPlace("oda", "komodin", 8, 3, []), "kapı önü");
  console.assert(!canPlace("bahce", "agac", 4, 17, []) && canPlace("bahce", "agac", 10, 34, []) && !canPlace("bahce", "agac", 17, 11, []) && !canPlace("bahce", "agac", 20, 5, []), "bahçe engelleri");
  console.assert(!canPlace("oda", "yatak", 27, 1, []) && canPlace("oda", "yatak", 27, 1, [], 1), "döndürünce sığar");
  console.assert(canPlace("oda", "koltuk-kırmızı", 10, 2, [{ id: "h", itemId: "hali", scope: "oda", tx: 10, ty: 2, userId: "u" }]), "halının üstüne mobilya");
  console.assert(maxCopies("hali") === 10 && maxCopies("sandalye-meşe") === 12 && maxCopies("piyano-siyah") === 2, "adet sınırı");
}
