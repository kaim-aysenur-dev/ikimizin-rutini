// Gelişim: evin kat planı, bahçenin düzeni, şato ve yerleştirme / yürüme kuralları.
// Hem tarayıcı (önizleme, çarpışma) hem sunucu (doğrulama) kullanır. scope "oda" = kişinin evi.
import { type Scope, isFlat, itemById } from "./room-items";

/** Yürünen yerler: kişinin evi, ortak bahçe ve ortak şato (şatoya eşya konmaz) */
export type Area = Scope | "sato";

export const SIZE: Record<Area, { w: number; d: number }> = { oda: { w: 28, d: 20 }, bahce: { w: 56, d: 54 }, sato: { w: 36, d: 24 } };

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

/* ------------------------- şatonun üst katları ve merdiven ------------------------ */

export type Floor = 1 | 2 | 3;
export type TrainingId = "arena" | "okculuk" | "buyu-odasi" | "balkon";
export type ArmoryId = "cengiz-odasi" | "koridor" | "aysenur-odasi";

// 2. kat: talim katı
export const TRAINING_HALLS: Room<TrainingId>[] = [
  { id: "arena", name: "Talim arenası", i0: 0, j0: 0, i1: 18, j1: 14 },
  { id: "okculuk", name: "Okçuluk alanı", i0: 18, j0: 0, i1: 36, j1: 10 },
  { id: "buyu-odasi", name: "Büyü odası", i0: 18, j0: 10, i1: 36, j1: 24 },
  { id: "balkon", name: "Fırtına balkonu", i0: 0, j0: 14, i1: 18, j1: 24 },
];
// 3. kat: iki zırh odası ve aradaki merdivenli koridor
export const ARMORY_HALLS: Room<ArmoryId>[] = [
  { id: "cengiz-odasi", name: "Cengiz'in zırh odası", i0: 0, j0: 0, i1: 12, j1: 24 },
  { id: "koridor", name: "Kule koridoru", i0: 12, j0: 0, i1: 24, j1: 24 },
  { id: "aysenur-odasi", name: "Ayşenur'un zırh odası", i0: 24, j0: 0, i1: 36, j1: 24 },
];
const TRAINING_PLAN: Plan<TrainingId> = {
  ...SIZE.sato, rooms: TRAINING_HALLS,
  doors: [
    ...wide([17, 4], [18, 4], "j"), // arena - okçuluk
    ...wide([17, 11], [18, 11], "j"), // arena - büyü odası
    ...wide([27, 9], [27, 10], "i"), // okçuluk - büyü odası
    ...wide([8, 13], [8, 14], "i"), // arena - balkon
    ...wide([17, 19], [18, 19], "j"), // balkon - büyü odası
  ],
};
const ARMORY_PLAN: Plan<ArmoryId> = {
  ...SIZE.sato, rooms: ARMORY_HALLS,
  doors: [...wide([11, 8], [12, 8], "j"), ...wide([11, 17], [12, 17], "j"), ...wide([23, 8], [24, 8], "j"), ...wide([23, 17], [24, 17], "j")],
};
export const castlePlan = (floor: Floor): Plan => (floor === 1 ? CASTLE_PLAN : floor === 2 ? TRAINING_PLAN : ARMORY_PLAN);

/**
 * Sarmal taş merdivenler: çıkan merdiven (12,1) ve inen merdiven (14,1), 2x2 kare.
 * Çıkınca üst katın inen merdiveninin önünde, inince alt katın çıkan merdiveninin önünde doğulur.
 */
export type Stair = { floor: Floor; dir: "up" | "down"; i: number; j: number; spawn: [number, number] };
export const STAIRS: Stair[] = [
  { floor: 1, dir: "up", i: 12, j: 1, spawn: [13, 3.6] },
  { floor: 2, dir: "up", i: 12, j: 1, spawn: [13, 3.6] },
  { floor: 2, dir: "down", i: 14, j: 1, spawn: [15, 3.6] },
  { floor: 3, dir: "down", i: 14, j: 1, spawn: [15, 3.6] },
];
export function stairsTarget(floor: Floor, dir: "up" | "down"): Floor | null {
  if (!STAIRS.some((s) => s.floor === floor && s.dir === dir)) return null;
  return (dir === "up" ? floor + 1 : floor - 1) as Floor;
}
/** Kat değiştirince doğulan nokta: çıkınca üst katın inen, inince alt katın çıkan merdiveninin önü */
export function arrivalAt(to: Floor, cameUp: boolean): [number, number] {
  return STAIRS.find((s) => s.floor === to && s.dir === (cameUp ? "down" : "up"))!.spawn;
}

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

// Karanlık orta çağ bahçesi. Kuzeyde şato, ortada iki ev ve kuyulu, kamp ateşli meydan; batıda yıkık şapel ve mezarlık,
// doğuda demirci ve yel değirmeni, güneyde köprülü dere, ölü koru ve sisli bataklık. Ana yol şato kapısından güneye iner.
// (017 göçü eski bahçeyi 10 kare doğuya kaydırdı: şato ve evler eski yerlerine göre aynı.)
type Rect = { i0: number; j0: number; i1: number; j1: number };
export const CASTLE = { i0: 18, j0: 1, i1: 38, j1: 11, gate: { i: 27, width: 2 } } as const;
export const HOUSES = [
  { i0: 13, j0: 16, i1: 23, j1: 22, door: { i: 17, j: 22 } },
  { i0: 32, j0: 16, i1: 42, j1: 22, door: { i: 36, j: 22 } },
] as const;
export const ROAD = { i0: 27, i1: 29 }; // şato kapısından güney kapısına
export const PLAZA: Rect = { i0: 23, j0: 25, i1: 33, j1: 39 };
export const WELL: Rect = { i0: 31, j0: 26, i1: 33, j1: 28 };
export const CAMPFIRE: Rect = { i0: 27, j0: 33, i1: 29, j1: 35 };
export const CHAPEL: Rect = { i0: 3, j0: 24, i1: 10, j1: 31 };
export const GRAVEYARD: Rect = { i0: 2, j0: 33, i1: 12, j1: 43 };
export const ANGEL: Rect = { i0: 6, j0: 39, i1: 8, j1: 41 }; // mezarlığın ortasında melek heykeli
export const TOMBS: [number, number][] = [3, 4, 9, 10].flatMap((i) => [35, 37, 41].map((j) => [i, j] as [number, number]));
export const FORGE: Rect = { i0: 44, j0: 23, i1: 50, j1: 28 };
export const MILL: Rect = { i0: 46, j0: 32, i1: 50, j1: 36 };
export const STREAM = { j0: 44, j1: 46 };
export const BRIDGES = [{ i0: 26, i1: 30 }, { i0: 6, i1: 8 }];
export const GROVE: Rect = { i0: 1, j0: 47, i1: 23, j1: 54 };
export const SWAMP: Rect = { i0: 36, j0: 47, i1: 55, j1: 54 };
export const SWAMP_POOLS: Rect[] = [{ i0: 38, j0: 50, i1: 41, j1: 52 }, { i0: 44, j0: 51, i1: 47, j1: 53 }, { i0: 50, j0: 47, i1: 53, j1: 49 }];
export const LANTERNS: [number, number][] = [
  ...[14, 18, 22, 40, 48, 52].flatMap((j) => [[26, j], [29, j]] as [number, number][]),
  [22, 25], [33, 25], [22, 38], [33, 38],
];
export const OWL_TREE: [number, number] = [13, 43];
export const PERCH: [number, number] = [10.5, 19.5]; // papağanın tüneği
export const RAVEN_TREES: [number, number][] = [[8, 47], [16, 51], [42, 48]];
export const TREES: [number, number][] = [
  // şatonun çevresi (kuzey şerit)
  [2, 2], [5, 6], [3, 9], [9, 3], [12, 7], [15, 2], [8, 9], [14, 9], [41, 3], [44, 7], [48, 2], [51, 6], [54, 3], [46, 10], [52, 9],
  // kenar ormanı ve çayır
  [1, 13], [0, 17], [1, 21], [0, 36], [1, 41], [54, 13], [55, 18], [54, 22], [55, 31], [54, 40],
  [9, 14], [6, 18], [3, 21], [11, 23], [24, 14], [31, 14], [45, 15], [49, 19], [51, 26], [40, 31], [42, 40], [35, 41], [20, 41], [15, 36], [17, 31], [14, 26],
  // ölü koru ve bataklık
  [2, 48], [5, 51], [8, 47], [11, 52], [14, 47], [16, 51], [19, 48], [21, 52], [37, 52], [42, 48], [48, 53], [53, 51],
  OWL_TREE,
];
const inRect = (i: number, j: number, r: Rect) => i >= r.i0 && i < r.i1 && j >= r.j0 && j < r.j1;
/** Ölü (yapraksız) ağaçlar: koruda, bataklıkta ve mezarlık yanında hepsi; başka yerde arada bir */
export const deadTree = (i: number, j: number) => inRect(i, j, GROVE) || inRect(i, j, SWAMP) || (i === OWL_TREE[0] && j === OWL_TREE[1]) || (i * 7 + j * 3) % 5 === 0;

export const atGate = (i: number) => i >= CASTLE.gate.i && i < CASTLE.gate.i + CASTLE.gate.width;
const onBridge = (i: number) => BRIDGES.some((b) => i >= b.i0 && i < b.i1);
export const inStream = (i: number, j: number) => j >= STREAM.j0 && j < STREAM.j1 && !onBridge(i);
export const inRectAt = inRect;

// yollar: ana yol, kapı önü, evlerden meydana, meydan, şapele, mezarlığa, demirciye, değirmene, koruya ve bataklık iskelesine
export function isPath(i: number, j: number): boolean {
  if (i >= ROAD.i0 && i < ROAD.i1 && j >= CASTLE.j1) return true;
  if (j >= CASTLE.j1 && j <= CASTLE.j1 + 1 && i >= CASTLE.gate.i - 2 && i < CASTLE.gate.i + CASTLE.gate.width + 2) return true;
  if (HOUSES.some((h) => i === h.door.i && j >= h.door.j && j <= 24)) return true;
  if (j === 24 && i >= 17 && i <= 36) return true;
  if (inRect(i, j, PLAZA)) return true;
  if (j === 28 && i >= 10 && i < PLAZA.i0) return true; // şapele
  if (i >= 6 && i <= 7 && j >= CHAPEL.j1 && j < ANGEL.j0) return true; // mezarlık kapısından heykele
  if (j === 26 && i >= PLAZA.i1 && i < FORGE.i0) return true; // demirciye
  if (j === 35 && i >= PLAZA.i1 && i < MILL.i0) return true; // değirmene
  if (j === 49 && ((i >= 8 && i < ROAD.i0) || (i >= ROAD.i1 && i <= 40))) return true; // koru yolu ve bataklık iskelesi
  if (j >= STREAM.j0 && j < STREAM.j1 && onBridge(i)) return true;
  return false;
}

/** Bahçede sabit engeller: şato şeridi, binalar, su, mezar taşları, ağaçlar, fenerler */
export function gardenSolid(i: number, j: number): boolean {
  if (j < CASTLE.j1) return true;
  if (HOUSES.some((h) => inRect(i, j, h)) || [CHAPEL, FORGE, MILL, WELL, CAMPFIRE, ANGEL].some((r) => inRect(i, j, r))) return true;
  if (inStream(i, j) || SWAMP_POOLS.some((r) => inRect(i, j, r))) return true;
  if (GARDEN_SEATS.some((p) => footprint(p.itemId, p.tx, p.ty, p.rot).some(([a, b]) => a === i && b === j))) return true;
  return [TOMBS, TREES, LANTERNS].some((list) => list.some(([a, b]) => a === i && b === j));
}

/* -------------------------------- yerleştirme ------------------------------- */

// rot: 0-3; tek sayılarda eşya yan döner (eni ve boyu yer değiştirir), 2 ve 3 tersidir
export type Placed = { id: string; itemId: string; scope: Scope; tx: number; ty: number; userId: string; rot?: number };

/** Döndürmeye göre eşyanın kapladığı en ve boy */
export function sizeOf(itemId: string, rot = 0): [number, number] {
  const it = itemById.get(itemId);
  if (!it) return [1, 1];
  return rot & 1 ? [it.size[1], it.size[0]] : it.size;
}

// kamp ateşinin dört yanında, ateşe bakan banklar (oturulur; ikiniz oturunca "birlikte an")
const seat = (id: string, tx: number, ty: number, rot: number): Placed => ({ id, itemId: "bank", scope: "bahce", tx, ty, userId: "", rot });
export const GARDEN_SEATS: Placed[] = [seat("bank-kuzey", 27, 31, 0), seat("bank-guney", 27, 36, 2), seat("bank-bati", 25, 33, 1), seat("bank-dogu", 30, 33, 3)];

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
  console.assert(!canPlace("bahce", "agac", 14, 17, []) && canPlace("bahce", "agac", 20, 34, []) && !canPlace("bahce", "agac", 27, 11, []) && !canPlace("bahce", "agac", 30, 5, []) && !canPlace("bahce", "agac", 10, 44, []), "bahçe engelleri");
  console.assert(!canPlace("oda", "yatak", 27, 1, []) && canPlace("oda", "yatak", 27, 1, [], 1), "döndürünce sığar");
  console.assert(canPlace("oda", "koltuk-kırmızı", 10, 2, [{ id: "h", itemId: "hali", scope: "oda", tx: 10, ty: 2, userId: "u" }]), "halının üstüne mobilya");
  {
    // bahçe: her yapının ve kapının önüne yürünebilir, köprüler açık
    const open = (i: number, j: number) => !gardenSolid(i, j);
    console.assert(HOUSES.every((h) => open(h.door.i, h.door.j)) && open(CASTLE.gate.i, CASTLE.j1) && open(27, 45) && open(6, 45) && !open(20, 45), "bahçe kapıları ve köprüler");
    console.assert(TREES.every(([a, b]) => !isPath(a, b) || b < CASTLE.j1) && LANTERNS.every(([a, b]) => !isPath(a, b)), "ağaç ve fener yolda değil");
  }
  console.assert(maxCopies("hali") === 10 && maxCopies("sandalye-meşe") === 12 && maxCopies("piyano-siyah") === 2, "adet sınırı");
}
