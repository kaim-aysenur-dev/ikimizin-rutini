// Yoldaşlar: Cengiz'in sarı kedisi Düldül ve Ayşenur'un papağanı.
// Konumları sahneden gelir; burada yalnızca çizim, bekleme hareketleri ve dokunma tepkileri var.
import { type Anchors, type Ctx, type V, P, drawCat, rect, sprite } from "./pixel";
import { heart, px } from "./env";

// papağanın adı sonradan düzenlenebilir; boşken etiket gösterilmez
export const PARROT_NAME = "";

// son dokunma zamanları (performance.now saniyesi)
export const pets = { duldul: -99, parrot: -99 };
export function tapPet(who: "duldul" | "parrot") { pets[who] = performance.now() / 1000; }

export const pt = (v: V): Anchors => ({ head: v, hand: v, handB: v, hip: v, mouth: v, shoulder: v });

export type CatMode = "walk" | "run" | "rest" | "rub" | "sit" | "crouch";

// Düldül: dist yürüyüş karesini seçer (kaydırmaya bağlı); rest = kıvrılmış, sit = oturuyor
export function duldul(c: Ctx, x: number, y: number, dir: 1 | -1, mode: CatMode, dist: number, t: number, still: boolean): Anchors {
  const tap = t - pets.duldul;
  const reacting = tap >= 0 && tap < 2.2;
  const blink = !still && (t * 0.9) % 4.3 < 0.12;
  if (mode === "rest") {
    // arada gerinir; dokununca başını kaldırıp gözlerini yavaşça kapatır
    const stretch = !still && !reacting && (t % 13) < 1.3;
    if (stretch) drawCat(c, x, y, dir, "stretch", t, 0, 1);
    else if (reacting) drawCat(c, x, y, dir, "sit", t, 0, Math.max(0, 1 - tap / 1.2));
    else drawCat(c, x, y, dir, "curl", still ? 0 : t, 0, (t * 0.5) % 6 < 3 ? 0 : 0.2);
  } else if (mode === "crouch") {
    drawCat(c, x, y, dir, "stretch", still ? 0 : t * 3, 0, blink ? 0 : 1);
  } else if (mode === "sit") {
    drawCat(c, x, y, dir, "sit", still ? 0 : t, 0, blink || reacting ? 0 : 1);
  } else {
    const frame = Math.floor(Math.abs(dist) / (mode === "run" ? 2 : 3));
    // başını sürtme: Cengiz'in bacağına yaslanıp hafifçe ileri geri
    const rub = mode === "rub" && !still ? Math.round(Math.sin(t * 5)) : 0;
    drawCat(c, x + rub, y, dir, "walk", still ? 0 : t, mode === "rub" ? 1 : frame, blink || reacting ? 0 : 1);
  }
  if (reacting) heart(c, Math.round(x) - 4, Math.round(y) - 24 - Math.round(tap * 4), 1);
  return pt([Math.round(x), Math.round(y) - 12]);
}

/* -------------------------------- papağan -------------------------------- */

// 8x9, sağa bakar. r kırmızı, y sarı, b mavi kanat, k gaga, e göz
const PARROT = [
  "..ooo...",
  ".orrro..",
  ".orewko.",
  ".orrrkk.",
  "oyrrro..",
  "obbyro..",
  "obbbro..",
  ".obbo...",
  "..o.o...",
];
const PARROT_TILT = [
  "........",
  "..ooo...",
  ".orrro..",
  ".orewko.",
  "oyrrrkk.",
  "obbyro..",
  "obbbro..",
  ".obbo...",
  "..o.o...",
];
const PARROT_SLEEP = [
  "........",
  "........",
  "..ooo...",
  ".orrrro.",
  "oyrrbbo.",
  "obbbbbo.",
  "obbbbo..",
  ".oooo...",
  "..o.o...",
];
const PAL = { o: P.ink, r: "#d8433a", y: "#f2c14e", b: "#3a6fd8", k: "#efe3c8", e: "#1a1426", w: "#fff" };

export type ParrotMode = "perch" | "fly" | "sleep";

// at: ayakların bastığı nokta
export function parrot(c: Ctx, at: V, dir: 1 | -1, mode: ParrotMode, t: number, still: boolean): Anchors {
  const [x, y] = [Math.round(at[0]), Math.round(at[1])];
  const tap = t - pets.parrot;
  const reacting = tap >= 0 && tap < 1.6;
  if (mode === "fly") {
    const up = !still && Math.floor(t * 10) % 2 === 0;
    sprite(c, PARROT.slice(0, 8), x - 4, y - 8, PAL, dir < 0);
    // kanat çırpma
    const wx = x - 1 * dir;
    if (up) { rect(c, wx - 3, y - 11, 4, 3, P.ink); rect(c, wx - 2, y - 10, 3, 2, PAL.b); }
    else { rect(c, wx - 3, y - 3, 4, 3, P.ink); rect(c, wx - 2, y - 3, 3, 2, PAL.b); }
    return pt([x, y - 9]);
  }
  if (mode === "sleep") { sprite(c, PARROT_SLEEP, x - 4, y - 9, PAL, dir < 0); return pt([x, y - 9]); }
  // tünekte: arada başını yana eğer, tüylerini düzeltir; dokununca hemen eğer ve kanadını açar
  const cyc = still ? 0 : (t + 1.3) % 7;
  const tilt = reacting ? tap < 0.8 : cyc > 4 && cyc < 4.8;
  const preen = !reacting && cyc > 6 && cyc < 6.7;
  sprite(c, tilt ? PARROT_TILT : PARROT, x - 4, y - 9, PAL, dir < 0);
  if (preen) px(c, x + (dir > 0 ? 0 : -1), y - 4, PAL.k);
  if (reacting && tap > 0.6) { rect(c, x - 5 * dir - (dir < 0 ? 2 : 0), y - 7, 3, 4, P.ink); rect(c, x - 5 * dir - (dir < 0 ? 1 : -1), y - 6, 1, 3, PAL.b); }
  return pt([x, y - 9]);
}

/* -------------------------------- eşyalar -------------------------------- */

export function cushion(c: Ctx, x: number, floor: number) {
  rect(c, x - 9, floor - 4, 18, 4, P.ink);
  rect(c, x - 8, floor - 4, 16, 3, "#7a3b4a");
  rect(c, x - 8, floor - 4, 16, 1, "#9a5a6a");
  px(c, x - 8, floor - 4, P.gold); px(c, x + 7, floor - 4, P.gold);
}

// ahşap tünek; dönen değer papağanın konacağı nokta
export function perch(c: Ctx, x: number, floor: number, h = 26): V {
  rect(c, x - 5, floor - 2, 11, 2, P.woodDk);
  rect(c, x, floor - h, 2, h, P.woodDk);
  rect(c, x - 5, floor - h, 12, 2, P.woodLt);
  rect(c, x - 4, floor - h + 2, 2, 2, "#c8b088"); // yem kabı
  return [x + 1, floor - h];
}

// zırh askılığı ve silah köşesi: zırhlar çıkarıldığı sahnelerde görünür
export function armorRack(c: Ctx, x: number, floor: number) {
  rect(c, x - 6, floor - 2, 13, 2, P.woodDk);
  rect(c, x, floor - 30, 2, 28, P.woodDk);
  rect(c, x - 5, floor - 28, 12, 2, P.woodDk);
  // Cengiz'in koyu zırhı ve pelerini
  rect(c, x - 5, floor - 26, 12, 3, P.ink); rect(c, x - 4, floor - 25, 10, 2, "#5e6470");
  rect(c, x - 3, floor - 23, 8, 10, P.ink); rect(c, x - 2, floor - 22, 6, 8, "#4a4f5a"); px(c, x, floor - 20, "#8e95a3");
  rect(c, x - 6, floor - 24, 2, 14, "#3a1f2e");
}
export function weaponRack(c: Ctx, x: number, floor: number) {
  rect(c, x - 8, floor - 2, 18, 2, P.woodDk);
  rect(c, x - 8, floor - 26, 2, 24, P.woodDk); rect(c, x + 8, floor - 26, 2, 24, P.woodDk);
  rect(c, x - 8, floor - 18, 18, 1, P.woodLt);
  // Ayşenur'un kılıcı, yayı, sadağı
  rect(c, x - 4, floor - 26, 1, 22, "#c8ccd8"); rect(c, x - 6, floor - 22, 5, 1, P.gold);
  for (let i = 0; i < 22; i++) px(c, x + 3 + Math.round(Math.sin((i / 22) * Math.PI) * 3), floor - 26 + i, P.gold);
  rect(c, x + 3, floor - 26, 1, 22, "#e8e0f0");
  rect(c, x + 6, floor - 16, 3, 12, "#6b4a35"); px(c, x + 6, floor - 18, "#efe3c8"); px(c, x + 8, floor - 18, "#c8463a");
}

// Oda sahnelerinde ortak düzen: girerken Düldül Cengiz'i izleyip minderine kıvrılır, papağan uçup tüneğine konar;
// çıkarken ikisi de peşlerinden gelir.
type Room = {
  t: number; still: boolean; floor: number; enter: number; leave: number;
  cengizX: number; aysenurX: number; cushionX: number; perchAt: V; exitX: number; sleep?: boolean;
  cat?: { x: number; mode: CatMode; dir: 1 | -1; y?: number; hidden?: boolean }; // macera sırasında kedinin yeri
};
export function petsInRoom(c: Ctx, r: Room): { who: "duldul" | "parrot"; anchors: Anchors }[] {
  let catX = r.cushionX, mode: CatMode = "rest";
  if (r.leave > 0) { catX = r.cushionX + (r.exitX - r.cushionX) * r.leave; mode = r.leave < 1 ? "walk" : "rest"; }
  else if (r.enter < 1) { catX = Math.min(r.cengizX - 10, r.cushionX); mode = catX < r.cushionX ? "walk" : "rest"; }
  const fly: V = [r.aysenurX - 8, r.floor - 34];
  let at: V = r.perchAt, pm: ParrotMode = r.sleep ? "sleep" : "perch";
  if (r.leave > 0 || r.enter < 0.85) { at = fly; pm = "fly"; }
  else if (r.enter < 1) { const k = (r.enter - 0.85) / 0.15; at = [fly[0] + (r.perchAt[0] - fly[0]) * k, fly[1] + (r.perchAt[1] - fly[1]) * k]; pm = "fly"; }
  const catA = r.cat && r.leave === 0 && r.enter === 1
    ? (r.cat.hidden ? pt([Math.round(r.cat.x), r.floor - 12]) : duldul(c, r.cat.x, r.cat.y ?? r.floor, r.cat.dir, r.cat.mode, r.cat.x, r.t, r.still))
    : duldul(c, catX, r.floor, catX >= r.cushionX && r.leave === 0 ? -1 : 1, mode, catX, r.t, r.still);
  return [
    { who: "duldul", anchors: catA },
    { who: "parrot", anchors: parrot(c, at, pm === "fly" ? 1 : -1, pm, r.t, r.still) },
  ];
}
