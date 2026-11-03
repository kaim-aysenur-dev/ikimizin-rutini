// Gelişim · Ortak şato: bahçenin kuzeyindeki şatonun dışı ve altı salonlu içi (izometrik).
// Ana sayfadaki şatonun salonları: şenlik ateşli büyük salon, kütüphane, şömine odası, yemek salonu, spor salonu, hamam.
// Dekor sabit (eşya konmaz); oturulan, çalınan, açılan eşyalar evdeki gibi çalışır. Misafirler salonlarda bekler.
import { lights } from "./env";
import { type Origin, at, box, shade, tile } from "./iso";
import { type Ctx, type V, P, disc, line, poly, px, rect, rnd } from "./pixel";
import { ARMORY_HALLS, CASTLE, CASTLE_ENTRY, type Floor, HALLS, type Placed, SIZE, STAIRS, TRAINING_HALLS, castlePlan, stairsTarget, stepIn, wallsOf } from "./room";
import { isFlat, itemById } from "./room-items";

/* ---------------------------------- dekor ---------------------------------- */

/** Şatoya özel çizimler (eşya listesinde yok) */
type Prop = { id: string; size: [number, number]; flat?: boolean; draw: (c: Ctx, o: Origin, i: number, j: number, t: number) => void };

const STONE = shade("#5a5664"), IRON = shade("#3a3a44"), MARBLE = shade("#c8c4cc", 0.12, 0.2), LEATHER = shade("#6b3a2a");

const flame = (c: Ctx, x: number, y: number, t: number, s = 1) => {
  for (let k = 0; k < 5 * s; k++) {
    const q = (t * 1.6 + k / (5 * s)) % 1, dx = Math.round(Math.sin(t * 7 + k * 2.1) * 2 * s);
    rect(c, x + dx - 1, Math.round(y - q * 12 * s), 2, 2, q < 0.35 ? P.goldLt : q < 0.7 ? "#e8742a" : "#b8344a");
  }
  lights.push({ x, y: y - 6 * s, r: 34 * s + Math.round(Math.sin(t * 9) * 2), color: "245,140,60" });
};

export const PROPS: Record<string, Prop> = {
  // büyük salonun ortasında taş halkalı şenlik ateşi
  "senlik-atesi": { id: "senlik-atesi", size: [2, 2], draw: (c, o, i, j, t) => {
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; box(c, o, i + 1 + Math.cos(a) * 0.8 - 0.15, j + 1 + Math.sin(a) * 0.8 - 0.15, 0.3, 0.3, 4, STONE); }
    const [x, y] = at(o, i + 1, j + 1);
    line(c, [x - 5, y - 2], [x + 5, y - 4], 2, P.woodDk); line(c, [x - 4, y - 4], [x + 4, y - 1], 2, P.wood);
    flame(c, x, y - 4, t, 1.4);
    for (let k = 0; k < 4; k++) { const q = (t * 0.5 + k / 4) % 1; px(c, x + Math.round(Math.sin(q * 7 + k) * 4), Math.round(y - 20 - q * 24), `rgba(255,190,90,${(1 - q).toFixed(2)})`); }
  } },
  // papağanın tüneği
  tunek: { id: "tunek", size: [1, 1], draw: (c, o, i, j) => {
    const [x, y] = at(o, i + 0.5, j + 0.5);
    rect(c, x - 1, y - 20, 2, 20, P.woodDk); rect(c, x - 5, y - 21, 10, 2, P.woodLt); rect(c, x - 4, y - 1, 8, 2, P.ink);
  } },
  // kum torbası: zincirle asılı, hafifçe sallanır
  "kum-torbasi": { id: "kum-torbasi", size: [1, 1], draw: (c, o, i, j, t) => {
    const [x, y] = at(o, i + 0.5, j + 0.5), sw = Math.round(Math.sin(t * 1.3) * 1.5);
    box(c, o, i + 0.1, j + 0.1, 0.8, 0.8, 2, IRON);
    rect(c, x - 1, y - 44, 2, 44 - 30, "#2a2a30"); // direk
    rect(c, x - 8, y - 46, 10, 2, "#2a2a30");
    line(c, [x - 7, y - 44], [x - 7 + sw, y - 36], 1, "#8a8a96");
    rect(c, x - 11 + sw, y - 36, 8, 18, P.ink); rect(c, x - 10 + sw, y - 35, 6, 16, "#8a3a2a"); rect(c, x - 10 + sw, y - 30, 6, 2, "#5a2418"); rect(c, x - 10 + sw, y - 24, 6, 2, "#5a2418");
  } },
  // tahta talim mankeni
  manken: { id: "manken", size: [1, 1], draw: (c, o, i, j) => {
    const [x, y] = at(o, i + 0.5, j + 0.5);
    rect(c, x - 3, y - 1, 6, 2, P.ink); rect(c, x - 1, y - 22, 2, 21, P.woodDk);
    rect(c, x - 7, y - 18, 14, 2, P.woodDk); rect(c, x - 4, y - 21, 8, 10, "#a87a50"); rect(c, x - 4, y - 21, 8, 1, P.ink);
    disc(c, x, y - 25, 3, "#c8a070"); line(c, [x - 2, y - 24], [x + 2, y - 26], 1, "#8a3a2a");
  } },
  // ağırlık rafı
  agirlik: { id: "agirlik", size: [2, 1], draw: (c, o, i, j) => {
    box(c, o, i + 0.1, j + 0.3, 1.8, 0.4, 10, IRON);
    for (let k = 0; k < 4; k++) { const [x, y] = at(o, i + 0.35 + k * 0.42, j + 0.5); disc(c, x, y - 12, 2 + (k % 2), P.ink); disc(c, x, y - 12, 1 + (k % 2), "#5a5a66"); }
  } },
  // pilates minderi (üstünden yürünür)
  minder: { id: "minder", size: [2, 1], flat: true, draw: (c, o, i, j) => {
    tile(c, o, i + 0.1, j + 0.15, "#6a2a4a", 1.8, 0.7); tile(c, o, i + 0.2, j + 0.25, "#8a3a5a", 1.6, 0.5);
  } },
  // hamam göbek taşı: buharlı mermer
  "gobek-tasi": { id: "gobek-tasi", size: [3, 3], draw: (c, o, i, j, t) => {
    box(c, o, i + 0.15, j + 0.15, 2.7, 2.7, 6, MARBLE);
    tile(c, o, i + 0.5, j + 0.5, "#dcd8e0", 2, 2);
    const [x, y] = at(o, i + 1.5, j + 1.5);
    for (let k = 0; k < 8; k++) { const q = (t * 0.25 + k / 8) % 1; const sx = x + Math.round(Math.sin(q * 5 + k * 1.7) * 10 + (rnd(k) - 0.5) * 16); px(c, sx, Math.round(y - 8 - q * 26), `rgba(235,240,250,${(0.55 * (1 - q)).toFixed(2)})`); px(c, sx + 1, Math.round(y - 8 - q * 26), `rgba(235,240,250,${(0.35 * (1 - q)).toFixed(2)})`); }
  } },
  // kurna (mermer lavabo ve tas)
  kurna: { id: "kurna", size: [1, 1], draw: (c, o, i, j, t) => {
    box(c, o, i + 0.2, j + 0.2, 0.6, 0.6, 8, MARBLE);
    const [x, y] = at(o, i + 0.5, j + 0.5); rect(c, x - 2, y - 9, 4, 1, "#7ab0d0"); px(c, x, y - 13 + (Math.floor(t * 4) % 3), "#a8d0e8");
    rect(c, x - 1, y - 14, 2, 2, P.gold);
  } },
  // yemek salonunun ziyafet masası (uzun, mumlu, yemekli)
  ziyafet: { id: "ziyafet", size: [6, 2], draw: (c, o, i, j, t) => {
    box(c, o, i, j + 0.1, 6, 1.8, 10, shade("#3e2a20"));
    tile(c, o, i + 0.1, j + 0.5, "#7a1f36", 5.8, 1); // kızıl örtü
    for (let k = 0; k < 3; k++) { const [x, y] = at(o, i + 1 + k * 2, j + 1); rect(c, x - 1, y - 16, 2, 5, P.cream); rect(c, x - 3, y - 11, 6, 1, P.gold); flame(c, x, y - 16, t, 0.5); }
    for (let k = 0; k < 5; k++) { const [x, y] = at(o, i + 0.6 + k * 1.2, j + 1.4); disc(c, x, y - 11, 2, "#d8d0c0"); px(c, x, y - 12, ["#c84a3a", "#e8a33a", "#5fae6e", "#8a5a3a", "#e8d070"][k]); }
    { const [x, y] = at(o, i + 3, j + 0.9); disc(c, x, y - 13, 3, "#a86a3a"); px(c, x - 1, y - 15, "#e8c080"); } // kızarmış tavuk
  } },
  // kütüphanede yüksek kitap duvarı (3 kare)
  "kitap-duvari": { id: "kitap-duvari", size: [3, 1], draw: (c, o, i, j) => {
    box(c, o, i, j + 0.1, 3, 0.8, 40, shade("#2e1e18"));
    const cols = ["#7a1f36", "#24306a", "#2f5a3a", "#b8862a", "#4a2a6a", "#6a3a2a"];
    for (let s = 0; s < 4; s++) for (let k = 0; k < 16; k++) {
      const [x, y] = at(o, i + 0.1 + k * 0.18, j + 0.9);
      rect(c, x, y - 7 - s * 9, 1, 6 - (k % 3 === 0 ? 1 : 0), cols[(k * 7 + s * 3) % cols.length]);
    }
    for (let s = 0; s <= 4; s++) { const a = at(o, i, j + 0.9), b = at(o, i + 3, j + 0.9); line(c, [a[0], a[1] - 1 - s * 9], [b[0], b[1] - 1 - s * 9], 1, "#1a120e"); }
  } },
  // okuma kürsüsü üstünde açık kitap
  kursu: { id: "kursu", size: [1, 1], draw: (c, o, i, j, t) => {
    box(c, o, i + 0.3, j + 0.3, 0.4, 0.4, 12, shade("#3e2a20"));
    const [x, y] = at(o, i + 0.5, j + 0.5); rect(c, x - 4, y - 15, 8, 3, "#e8dcc0"); rect(c, x, y - 15, 1, 3, "#8a7a60");
    if (Math.floor(t * 0.5) % 6 === 0) px(c, x + 3, y - 18, P.goldLt); // büyülü kıvılcım
  } },
  // zırhlı şövalye heykeli
  sovalye: { id: "sovalye", size: [1, 1], draw: (c, o, i, j) => {
    box(c, o, i + 0.2, j + 0.2, 0.6, 0.6, 3, STONE);
    const [x, y] = at(o, i + 0.5, j + 0.5);
    rect(c, x - 3, y - 26, 6, 12, P.ink); rect(c, x - 2, y - 25, 4, 10, "#9aa0ac"); rect(c, x - 2, y - 14, 1, 11, "#7a808c"); rect(c, x + 1, y - 14, 1, 11, "#7a808c");
    rect(c, x - 2, y - 31, 4, 5, "#9aa0ac"); rect(c, x - 1, y - 29, 2, 1, P.ink); px(c, x, y - 33, "#b8344a");
    rect(c, x + 4, y - 32, 1, 30, "#c8ccd4"); rect(c, x + 2, y - 18, 5, 1, P.gold);
  } },
};

// sarmal taş merdiven: dönen basamaklar, ortada direk; yukarı çıkanın tepesi karanlık açıklık
function spiral(c: Ctx, o: Origin, i: number, j: number, up: boolean) {
  box(c, o, i + 0.1, j + 0.1, 1.8, 1.8, 4, STONE);
  const [cx, cy] = at(o, i + 1, j + 1);
  for (let k = 0; k < 9; k++) {
    const a = k * 0.75 + (up ? 0 : Math.PI), r = 9, h = up ? 4 + k * 5 : 4 + (8 - k) * 2;
    const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r * 0.5);
    rect(c, x - 4, y - h - 2, 9, 3, P.ink); rect(c, x - 3, y - h - 2, 7, 2, k % 2 ? "#6a6676" : "#5a5664");
  }
  rect(c, cx - 1, cy - (up ? 52 : 22), 3, up ? 50 : 20, "#3a3644"); rect(c, cx - 1, cy - (up ? 52 : 22), 1, up ? 50 : 20, "#5a5664");
  if (!up) { const [x, y] = at(o, i + 1, j + 1); poly(c, [[x - 10, y - 2], [x, y - 7], [x + 10, y - 2], [x, y + 3]], "rgba(0,0,0,0.55)"); }
}
PROPS["merdiven-yukari"] = { id: "merdiven-yukari", size: [2, 2], draw: (c, o, i, j) => spiral(c, o, i, j, true) };
PROPS["merdiven-asagi"] = { id: "merdiven-asagi", size: [2, 2], draw: (c, o, i, j) => spiral(c, o, i, j, false) };
// zırh askısı: tahta gövdede zırh ve miğfer
PROPS["zirh-standi"] = { id: "zirh-standi", size: [1, 1], draw: (c, o, i, j, t) => {
  box(c, o, i + 0.2, j + 0.2, 0.6, 0.6, 3, shade("#3e2a20"));
  const [x, y] = at(o, i + 0.5, j + 0.5);
  rect(c, x - 1, y - 30, 2, 28, P.woodDk); rect(c, x - 6, y - 26, 12, 2, P.woodDk);
  rect(c, x - 5, y - 25, 10, 11, P.ink); rect(c, x - 4, y - 24, 8, 9, "#9aa0ac"); rect(c, x - 4, y - 24, 8, 2, "#c8ccd4");
  rect(c, x - 3, y - 33, 6, 6, P.ink); rect(c, x - 2, y - 32, 4, 4, "#9aa0ac"); px(c, x, y - 35, "#b8344a");
  if (Math.floor(t * 0.7) % 5 === 0) px(c, x + 3, y - 22, "#fff6c8");
} };
// silah duvarı: raflı tahta pano, çapraz kılıçlar, yay, balta
PROPS["silah-duvari"] = { id: "silah-duvari", size: [3, 1], draw: (c, o, i, j) => {
  box(c, o, i, j + 0.1, 3, 0.4, 34, shade("#3e2a20"));
  const at2 = (k: number) => at(o, i + k, j + 0.5);
  for (const [k, col] of [[0.6, "#c8ccd8"], [1.5, "#e85a3a"], [2.4, "#e8d8dc"]] as [number, string][]) {
    const [x, y] = at2(k); line(c, [x - 4, y - 8], [x + 4, y - 28], 1, col); line(c, [x + 4, y - 8], [x - 4, y - 28], 1, col);
    rect(c, x - 3, y - 12, 7, 1, P.gold);
  }
  const [bx, by] = at2(1.5); for (let k = 0; k < 8; k++) px(c, bx - 10 + Math.round(Math.cos(k / 7 * Math.PI) * 3), by - 18 - k * 2, P.woodLt);
} };
// büyü kürsüsü: açık büyü kitabı, üstünde dönen kıvılcımlar
PROPS["buyu-kursusu"] = { id: "buyu-kursusu", size: [1, 1], draw: (c, o, i, j, t) => {
  box(c, o, i + 0.25, j + 0.25, 0.5, 0.5, 13, shade("#3a2a48"));
  const [x, y] = at(o, i + 0.5, j + 0.5); rect(c, x - 5, y - 16, 10, 3, "#e8dcc0"); rect(c, x, y - 16, 1, 3, "#8a7a60");
  for (let k = 0; k < 3; k++) { const a = t * 2 + k * 2.1; px(c, x + Math.round(Math.cos(a) * 6), y - 22 + Math.round(Math.sin(a) * 2), ["#c9a6f0", "#7fc8e8", "#f0a24a"][k]); }
  lights.push({ x, y: y - 20, r: 14, color: "180,140,255" });
} };
// rün çemberi (üstünden yürünür)
PROPS["run-cemberi"] = { id: "run-cemberi", size: [3, 3], flat: true, draw: (c, o, i, j, t) => {
  const [x, y] = at(o, i + 1.5, j + 1.5);
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2 + t * 0.3; px(c, Math.round(x + Math.cos(a) * 18), Math.round(y + Math.sin(a) * 9), k % 3 ? "#6a4a9a" : "#c9a6f0"); }
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 - t * 0.5; rect(c, Math.round(x + Math.cos(a) * 12) - 1, Math.round(y + Math.sin(a) * 6), 3, 1, "#9a7ad0"); }
} };

/* -------------------------------- talim hedefleri ------------------------------- */

export type TargetKind = "manken" | "hedef-tahtasi" | "run-tasi";
export type TargetSpot = { id: string; kind: TargetKind; i: number; j: number };
/** 2. kattaki vurulabilir hedefler (konumları sabit; canlarını dövüş tutar) */
export const TARGETS: TargetSpot[] = [
  { id: "m1", kind: "manken", i: 4.5, j: 5.5 }, { id: "m2", kind: "manken", i: 7.5, j: 5.5 },
  { id: "m3", kind: "manken", i: 4.5, j: 9.5 }, { id: "m4", kind: "manken", i: 7.5, j: 9.5 },
  { id: "h1", kind: "hedef-tahtasi", i: 34.5, j: 2.5 }, { id: "h2", kind: "hedef-tahtasi", i: 34.5, j: 5.5 }, { id: "h3", kind: "hedef-tahtasi", i: 34.5, j: 8.5 },
  { id: "r1", kind: "run-tasi", i: 30.5, j: 14.5 }, { id: "r2", kind: "run-tasi", i: 33.5, j: 17.5 }, { id: "r3", kind: "run-tasi", i: 30.5, j: 20.5 },
];

/** Hedefi çizer; vurulunca sarsılır, canı azsa küçük bar görünür */
export function drawTarget(c: Ctx, o: Origin, tg: TargetSpot, t: number, hit = 0, hp = 1) {
  const [bx, y] = at(o, tg.i, tg.j);
  const shake = hit > 0 ? Math.round(Math.sin(t * 60) * 2 * hit) : 0, x = bx + shake;
  rect(c, bx - 5, y - 1, 10, 2, "rgba(0,0,0,0.3)");
  if (tg.kind === "manken") PROPS.manken.draw(c, { ox: o.ox + shake, oy: o.oy }, tg.i - 0.5, tg.j - 0.5, t);
  else if (tg.kind === "hedef-tahtasi") {
    rect(c, x - 1, y - 14, 2, 14, P.woodDk);
    for (const [r, col] of [[8, P.ink], [7, "#e8dcc0"], [5, "#c8463a"], [3, "#e8dcc0"], [1, "#c8463a"]] as [number, string][]) disc(c, x, y - 22, r, col);
  } else {
    rect(c, x - 5, y - 24, 10, 24, P.ink); rect(c, x - 4, y - 23, 8, 22, "#4a4458");
    for (let k = 0; k < 3; k++) px(c, x - 1 + (k % 2) * 2, y - 19 + k * 6, Math.floor(t * 2 + k) % 2 ? "#c9a6f0" : "#7a5ab0");
    lights.push({ x, y: y - 14, r: 12, color: "170,120,255" });
  }
  if (hp < 1) { rect(c, x - 7, y - 40, 14, 3, P.ink); rect(c, x - 6, y - 39, Math.max(0, Math.round(12 * hp)), 1, hp > 0.3 ? "#5fae6e" : "#c8463a"); }
}

export type Decor = { id: string; tx: number; ty: number; rot?: number };
const D = (id: string, tx: number, ty: number, rot = 0): Decor => ({ id, tx, ty, rot });

export const CASTLE_DECOR: Decor[] = [
  // büyük salon: taht, şenlik ateşi, halılar, zırhlar, misafirler
  D("buyuk-hali-kırmızı", 1, 5), D("buyuk-hali-kırmızı", 4, 5), D("buyuk-hali-kırmızı", 6, 1),
  D("taht", 7, 1), D("senlik-atesi", 6, 7), D("koltuk-kırmızı", 3, 9), D("koltuk-kırmızı", 9, 9),
  D("zirh-askisi", 2, 0), D("silah-rafi", 4, 0), D("silah-rafi", 10, 0), D("zirh-askisi", 12, 0),
  D("sovalye", 0, 1), D("sovalye", 0, 9), D("tunek", 12, 3), D("samdan-altın", 1, 11), D("samdan-altın", 12, 11),
  // kütüphane: kitap duvarları, yazı masası, küre, teleskop, okuma köşesi
  D("kitap-duvari", 15, 0), D("kitap-duvari", 18, 0), D("kitap-duvari", 21, 0), D("kitaplik-abanoz", 24, 0), D("kitaplik-abanoz", 25, 0),
  D("kitaplik-abanoz", 25, 2), D("kitaplik-abanoz", 25, 3), D("kitaplik-ceviz", 25, 8), D("kitaplik-ceviz", 25, 9),
  D("yazi-masasi-ceviz", 19, 5), D("kursu", 16, 4), D("kure-antika", 16, 7), D("teleskop-pirinç", 23, 3),
  D("kristal-kure-mor", 23, 9), D("iksir-rafi-ceviz", 14, 10), D("hali-mor", 17, 8), D("berjer-mor", 17, 10), D("berjer-lacivert", 19, 10),
  D("samdan-gümüş", 21, 8),
  // şömine odası: şömine, halı, kanepe, piyano, arp, Düldül'ün minderi
  D("somine", 30, 0), D("buyuk-hali-kırmızı", 29, 3), D("koltuk-kırmızı", 30, 6), D("berjer-kırmızı", 27, 3), D("berjer-kırmızı", 34, 3),
  D("kedi-minderi", 32, 4), D("piyano-siyah", 33, 9), D("arp-altın", 27, 0), D("saat-ceviz", 35, 0), D("samdan-gümüş", 27, 10),
  D("satranc-ceviz", 28, 8),
  // yemek salonu: ziyafet masası ve abanoz sandalyeler
  D("ziyafet", 3, 16), ...[3, 4, 5, 6, 7, 8].flatMap((i) => [D("sandalye-abanoz", i, 15), D("sandalye-abanoz", i, 18)]),
  D("dresuar-abanoz", 1, 12), D("samdan-altın", 10, 13), D("kazan", 10, 22), D("vazo-kırmızı", 1, 22), D("dresuar-abanoz", 0, 20, 1),
  // spor salonu: kum torbası, manken, ağırlıklar, minderler, silah rafı
  D("kum-torbasi", 15, 14), D("kum-torbasi", 18, 14), D("manken", 21, 15), D("agirlik", 14, 21), D("minder", 18, 19), D("minder", 18, 21),
  D("silah-rafi", 13, 12), D("zirh-askisi", 22, 12), D("sovalye", 23, 22),
  // hamam: göbek taşı, kurnalar, küvetler, duş
  D("gobek-tasi", 29, 18), D("kurna", 25, 13), D("kurna", 27, 13), D("kurna", 33, 13), D("kuvet-gri", 26, 21), D("kuvet-gri", 32, 21),
  D("dus-gri", 35, 13), D("havluluk-lacivert", 35, 17), D("ayna", 24, 20), D("saksi-agaci-fikus", 35, 23), D("lavabo-gri", 24, 15),
];

CASTLE_DECOR.push(D("merdiven-yukari", 12, 1));

// 2. kat: talim katı (hedefler TARGETS'ta)
const TRAINING_DECOR: Decor[] = [
  D("merdiven-yukari", 12, 1), D("merdiven-asagi", 14, 1),
  D("silah-rafi", 2, 0), D("silah-rafi", 4, 0), D("zirh-askisi", 6, 0), D("kum-torbasi", 11, 9), D("agirlik", 13, 11), D("sovalye", 0, 12),
  D("minder", 9, 6), D("minder", 9, 8),
  D("silah-rafi", 20, 0), D("silah-rafi", 22, 0), D("sandik", 25, 0), D("samdan-altın", 19, 8),
  D("run-cemberi", 23, 15), D("kursu", 22, 12), D("kristal-kure-mavi", 20, 22), D("iksir-rafi-çam", 35, 11), D("iksir-rafi-ceviz", 35, 12), D("samdan-gümüş", 26, 22),
  D("bank", 3, 22), D("bank", 10, 22), D("fener", 0, 15), D("fener", 0, 23), D("fener", 16, 23),
];
// 3. kat: iki zırh odası (istasyonlar ARMORY_STATIONS'ta) ve kule koridoru
const ARMORY_DECOR: Decor[] = [
  D("merdiven-asagi", 14, 1),
  D("zirh-standi", 2, 3), D("silah-duvari", 4, 0), D("buyu-kursusu", 2, 10),
  D("buyuk-hali-lacivert", 4, 12), D("hali-lacivert", 5, 5), D("sandik", 9, 1), D("ayna", 0, 6), D("samdan-gümüş", 10, 22), D("sovalye", 0, 20), D("zirh-askisi", 7, 0),
  D("buyuk-hali-kırmızı", 16, 10), D("sovalye", 13, 22), D("sovalye", 22, 22), D("saat-ceviz", 20, 0), D("samdan-altın", 13, 12), D("samdan-altın", 22, 12),
  D("zirh-standi", 33, 3), D("silah-duvari", 29, 0), D("buyu-kursusu", 33, 10),
  D("buyuk-hali-pembe", 29, 12), D("hali-pembe", 30, 5), D("sandik", 26, 1), D("ayna", 35, 6), D("vazo-pembe", 35, 22), D("kedi-yatagi-pembe", 26, 22), D("samdan-gümüş", 34, 22),
];
export const castleDecor = (floor: Floor): Decor[] => (floor === 1 ? CASTLE_DECOR : floor === 2 ? TRAINING_DECOR : ARMORY_DECOR);

/** Zırh odalarındaki kuşanma istasyonları: yanında F ile o türün listesi açılır */
export type Station = { kind: "Zırh" | "Silah" | "Büyü"; owner: "cengiz" | "aysenur"; i: number; j: number };
export const ARMORY_STATIONS: Station[] = [
  { kind: "Zırh", owner: "cengiz", i: 2.5, j: 3.5 }, { kind: "Silah", owner: "cengiz", i: 5.5, j: 0.5 }, { kind: "Büyü", owner: "cengiz", i: 2.5, j: 10.5 },
  { kind: "Zırh", owner: "aysenur", i: 33.5, j: 3.5 }, { kind: "Silah", owner: "aysenur", i: 30.5, j: 0.5 }, { kind: "Büyü", owner: "aysenur", i: 33.5, j: 10.5 },
];

/** Dekorun boyutu (döndürmeye göre) */
export function decorSize(d: Decor): [number, number] {
  const s = PROPS[d.id]?.size ?? itemById.get(d.id)?.size ?? [1, 1];
  return d.rot ? [s[1], s[0]] : s;
}
const decorFlat = (d: Decor) => PROPS[d.id]?.flat ?? isFlat(d.id);

/** Şatonun bir katında yürürken çarpılan kareler: dekor, misafirler, talim hedefleri */
const blockedCache = new Map<Floor, Set<string>>();
export function castleBlocked(floor: Floor): Set<string> {
  let s = blockedCache.get(floor);
  if (s) return s;
  s = new Set<string>();
  for (const d of castleDecor(floor)) {
    if (decorFlat(d)) continue;
    const [w, dd] = decorSize(d);
    for (let a = 0; a < w; a++) for (let b = 0; b < dd; b++) s.add(`${d.tx + a},${d.ty + b}`);
  }
  for (const g of castleGuests(floor)) s.add(`${Math.floor(g.i)},${Math.floor(g.j)}`);
  if (floor === 2) for (const tg of TARGETS) s.add(`${Math.floor(tg.i)},${Math.floor(tg.j)}`);
  blockedCache.set(floor, s);
  return s;
}
export const CASTLE_BLOCKED = castleBlocked(1);

/** Etkileşim için ev eşyası gibi davranan dekor (oturma, piyano, masa, kitaplık) */
export const castleInteractive = (floor: Floor = 1): Placed[] =>
  castleDecor(floor).filter((d) => itemById.get(d.id)).map((d, k) => ({ id: `sato-${floor}-${k}`, itemId: d.id, scope: "oda", tx: d.tx, ty: d.ty, userId: "", rot: d.rot }));

/* --------------------------------- misafirler -------------------------------- */

export type Guest = { key: "gandalf" | "gimli" | "legolas" | "jon"; who: "wizard" | "dwarf" | "elf" | "jon"; i: number; j: number; dir: 1 | -1 };
function GUESTS_AT(): Guest[] {
  return [
    { key: "gandalf", who: "wizard", i: 22.5, j: 6.5, dir: -1 },
    { key: "gimli", who: "dwarf", i: 10.5, j: 4.5, dir: -1 },
    { key: "legolas", who: "elf", i: 3.5, j: 3.5, dir: 1 },
  ];
}
export const CASTLE_GUESTS = GUESTS_AT();
/** Misafirler yalnız 1. katta (Gandalf kütüphanede kalır) */
export function castleGuests(floor: Floor): Guest[] { return floor === 1 ? GUESTS_AT() : []; }
/** Bahçede şato kapısında nöbet tutan Jon Snow */
export const GATE_GUARD: Guest = { key: "jon", who: "jon", i: CASTLE.gate.i - 1.2, j: CASTLE.j1 + 0.6, dir: 1 };

/* ----------------------------------- çizim ----------------------------------- */

const CASTLE_WALL_H = 60;
// taş tonları: salonlara göre biraz değişir
const WALL: Record<string, [string, string]> = {
  "buyuk-salon": ["#3a3644", "#363240"], kutuphane: ["#3a3238", "#362e34"], somine: ["#40343a", "#3c3036"],
  yemek: ["#3a3644", "#363240"], spor: ["#3a3a40", "#36363c"], hamam: ["#4a4a56", "#46465a"],
  arena: ["#3e3a44", "#3a3640"], okculuk: ["#3e3836", "#3a3432"], "buyu-odasi": ["#363044", "#322c40"], balkon: ["#44424c", "#403e48"],
  "cengiz-odasi": ["#343a4e", "#30364a"], koridor: ["#3a3644", "#363240"], "aysenur-odasi": ["#44323e", "#402e3a"],
};
const FLOOR: Record<string, (i: number, j: number) => string> = {
  arena: (i, j) => ((i * 3 + j * 5) % 7 ? "#7e6a50" : "#74604a"),
  okculuk: (i, j) => ((i * 2 + j) % 4 < 2 ? "#4a3428" : "#443024"),
  "buyu-odasi": (i, j) => ((i + j) % 2 ? "#3a3048" : "#352b42"),
  balkon: (i, j) => ((i + j) % 2 ? "#4a4a56" : "#42424e"),
  "cengiz-odasi": (i, j) => ((i + j) % 2 ? "#2e3448" : "#2a3044"),
  koridor: (i, j) => ((i + j) % 2 ? "#45414e" : "#3e3a47"),
  "aysenur-odasi": (i, j) => ((i + j) % 2 ? "#3e2a38" : "#3a2634"),
  "buyuk-salon": (i, j) => ((i + j) % 2 ? "#45414e" : "#3e3a47"),
  kutuphane: (i, j) => ((i * 2 + j) % 4 < 2 ? "#3e2a22" : "#38251e"),
  somine: (i, j) => ((i + j) % 2 ? "#4a3226" : "#442d22"),
  yemek: (i, j) => ((i + j) % 2 ? "#5a5562" : "#2a2632"),
  spor: (i, j) => ((i + j) % 2 ? "#4e3a2a" : "#483526"),
  hamam: (i, j) => ((i + j) % 2 ? "#8a8a96" : "#7a7a88"),
};

export type Draw = {
  faceI: (c: Ctx, o: Origin, i: number, j0: number, j1: number, y0: number, y1: number, color: string) => void;
  faceJ: (c: Ctx, o: Origin, j: number, i0: number, i1: number, y0: number, y1: number, color: string) => void;
  archI: (c: Ctx, o: Origin, i: number, j0: number, j1: number, y0: number, y1: number, color: string, peak?: number) => void;
  archJ: (c: Ctx, o: Origin, j: number, i0: number, i1: number, y0: number, y1: number, color: string, peak?: number) => void;
  stoneI: (c: Ctx, o: Origin, i: number, j0: number, j1: number, h: number, mortar: string) => void;
  stoneJ: (c: Ctx, o: Origin, j: number, i0: number, i1: number, h: number, mortar: string) => void;
  gothicWindow: (c: Ctx, o: Origin, axis: "i" | "j", wall: number, s: number, t: number, w?: number, y0?: number, y1?: number) => void;
  torch: (c: Ctx, o: Origin, i: number, j: number, t: number, h?: number) => void;
  banner: (c: Ctx, o: Origin, axis: "i" | "j", wall: number, s: number, color: string, y0?: number, y1?: number, w?: number) => void;
  cobweb: (c: Ctx, o: Origin, i: number, j: number, h: number) => void;
};

/** Şatonun içi: yüksek taş arka duvarlar, gotik pencereler, sancaklar, meşaleler ve salon döşemeleri */
export function castleInterior(c: Ctx, o: Origin, t: number, k: Draw, floor: Floor = 1) {
  if (floor !== 1) { upperInterior(c, o, t, k, floor); return; }
  const { w, d } = SIZE.sato, H = CASTLE_WALL_H;
  const hallAt = (i: number, j: number) => HALLS.find((r) => i >= r.i0 && i < r.i1 && j >= r.j0 && j < r.j1)!;
  for (let j = 0; j < d; j++) k.faceI(c, o, 0, j, j + 1, 0, H, WALL[hallAt(0, j).id][j % 2]);
  for (let i = 0; i < w; i++) k.faceJ(c, o, 0, i, i + 1, 0, H, WALL[hallAt(i, 0).id][i % 2]);
  k.stoneI(c, o, 0, 0, d, H, "rgba(8,6,14,0.4)"); k.stoneJ(c, o, 0, 0, w, H, "rgba(8,6,14,0.4)");
  k.faceJ(c, o, 0, 0, w, 0, 6, "#1e1a24"); k.faceI(c, o, 0, 0, d, 0, 6, "#1e1a24");
  k.faceJ(c, o, 0, 0, w, H - 4, H, "#2a2632"); k.faceI(c, o, 0, 0, d, H - 4, H, "#2a2632"); // mazgal kuşağı
  line(c, [at(o, 0, d)[0], at(o, 0, d)[1] - H], [at(o, 0, 0)[0], at(o, 0, 0)[1] - H], 2, P.ink);
  line(c, [at(o, 0, 0)[0], at(o, 0, 0)[1] - H], [at(o, w, 0)[0], at(o, w, 0)[1] - H], 2, P.ink);

  // büyük salon: yüksek pencereler ve kızıl sancaklar
  k.gothicWindow(c, o, "j", 0, 5.2, t, 1.6, 18, 48); k.gothicWindow(c, o, "j", 0, 8.4, t, 1.6, 18, 48);
  k.banner(c, o, "j", 0, 1.0, "#7a1f36", 18, 52, 0.9); k.banner(c, o, "j", 0, 3.4, "#24306a", 18, 52, 0.9);
  k.banner(c, o, "j", 0, 10.6, "#24306a", 18, 52, 0.9); k.banner(c, o, "j", 0, 12.6, "#7a1f36", 18, 52, 0.9);
  k.gothicWindow(c, o, "i", 0, 2.2, t, 1.4, 18, 46); k.gothicWindow(c, o, "i", 0, 9, t, 1.4, 18, 46);
  // kütüphane: kitap duvarlarının üstünde vitray
  k.gothicWindow(c, o, "j", 0, 16.2, t, 1.2, 44, 56); k.gothicWindow(c, o, "j", 0, 19.2, t, 1.2, 44, 56); k.gothicWindow(c, o, "j", 0, 22.2, t, 1.2, 44, 56);
  // şömine odası: şöminenin üstünde sancak, iki yanında pencere
  k.banner(c, o, "j", 0, 30.6, "#7a1f36", 30, 54, 0.8); k.gothicWindow(c, o, "j", 0, 28, t, 1.3, 18, 44); k.gothicWindow(c, o, "j", 0, 33.2, t, 1.3, 18, 44);
  // yemek salonu ve sol duvar
  k.gothicWindow(c, o, "i", 0, 14.5, t, 1.4, 18, 46); k.gothicWindow(c, o, "i", 0, 19, t, 1.4, 18, 46); k.banner(c, o, "i", 0, 17.1, "#7a1f36", 18, 52, 0.9);
  for (const i of [2.2, 7.1, 11.8, 14.6, 25, 27, 35]) k.torch(c, o, i, 0, t, 32);
  for (const j of [1, 7.6, 13, 22.4]) k.torch(c, o, 0, j, t, 32);
  k.cobweb(c, o, 0, 0, H); k.cobweb(c, o, w - 0.6, 0, H); k.cobweb(c, o, 0, d - 0.6, H);

  // giriş: büyük kemerli çift kanatlı kapı (bahçeye çıkar)
  const e0 = CASTLE_ENTRY.j, e1 = CASTLE_ENTRY.j + CASTLE_ENTRY.width;
  k.archI(c, o, 0, e0 - 0.1, e1 + 0.1, 0, 40, P.ink, 8);
  k.archI(c, o, 0, e0 + 0.05, e1 - 0.05, 0, 38, "#3a2418", 7);
  k.faceI(c, o, 0, (e0 + e1) / 2 - 0.03, (e0 + e1) / 2 + 0.03, 0, 44, P.ink);
  for (const y of [10, 24]) k.faceI(c, o, 0, e0 + 0.05, e1 - 0.05, y, y + 1, "#16100c");
  { const [x, y] = at(o, 0, (e0 + e1) / 2); px(c, x - 2, y - 18, P.gold); px(c, x + 2, y - 18, P.gold); }

  // döşemeler
  for (const r of HALLS) for (let i = r.i0; i < r.i1; i++) for (let j = r.j0; j < r.j1; j++) tile(c, o, i, j, FLOOR[r.id](i, j));
  tile(c, o, 0, e0, "#5a4a3a", 0.4, e1 - e0);
  // hamamda su birikintileri
  for (let k2 = 0; k2 < 6; k2++) { const a = 25 + rnd(k2 * 3.3) * 10, b = 13 + rnd(k2 * 1.7) * 10; tile(c, o, a, b, "rgba(170,200,230,0.25)", 0.6, 0.4); }
}

/** 2. ve 3. kat: aynı taş ustalığı; balkonun dış duvarı alçak korkuluk, üstünde fırtınalı gök */
function upperInterior(c: Ctx, o: Origin, t: number, k: Draw, floor: 2 | 3) {
  const { w, d } = SIZE.sato, H = CASTLE_WALL_H;
  const halls = floor === 2 ? TRAINING_HALLS : ARMORY_HALLS;
  const hallAt = (i: number, j: number) => halls.find((r) => i >= r.i0 && i < r.i1 && j >= r.j0 && j < r.j1)!;
  const balcony = floor === 2 ? TRAINING_HALLS.find((r) => r.id === "balkon")! : null;
  const wallEnd = balcony ? balcony.j0 : d;
  if (balcony) {
    // balkonun ardında fırtınalı gök ve uzakta bahçe ışıkları
    k.faceI(c, o, 0, balcony.j0, d, 10, H + 24, "#10142a");
    for (let q = 0; q < 6; q++) { const [x, y] = at(o, 0, balcony.j0 + 1 + q * 1.6); px(c, x, y - 14 - (q % 3), "#f0b860"); }
    k.faceI(c, o, 0, balcony.j0, d, 0, 12, WALL.balkon[0]); k.stoneI(c, o, 0, balcony.j0, d, 12, "rgba(8,6,14,0.4)");
    for (let j = balcony.j0; j < d; j += 1) k.faceI(c, o, 0, j, j + 0.5, 12, 16, WALL.balkon[1]); // mazgal
  }
  for (let j = 0; j < wallEnd; j++) k.faceI(c, o, 0, j, j + 1, 0, H, WALL[hallAt(0, j).id][j % 2]);
  for (let i = 0; i < w; i++) k.faceJ(c, o, 0, i, i + 1, 0, H, WALL[hallAt(i, 0).id][i % 2]);
  k.stoneI(c, o, 0, 0, wallEnd, H, "rgba(8,6,14,0.4)"); k.stoneJ(c, o, 0, 0, w, H, "rgba(8,6,14,0.4)");
  k.faceJ(c, o, 0, 0, w, 0, 6, "#1e1a24"); k.faceI(c, o, 0, 0, wallEnd, 0, 6, "#1e1a24");
  k.faceJ(c, o, 0, 0, w, H - 4, H, "#2a2632"); k.faceI(c, o, 0, 0, wallEnd, H - 4, H, "#2a2632");
  line(c, [at(o, 0, wallEnd)[0], at(o, 0, wallEnd)[1] - H], [at(o, 0, 0)[0], at(o, 0, 0)[1] - H], 2, P.ink);
  line(c, [at(o, 0, 0)[0], at(o, 0, 0)[1] - H], [at(o, w, 0)[0], at(o, w, 0)[1] - H], 2, P.ink);
  if (floor === 2) {
    // arena: kalkanlar ve çapraz kılıçlar; okçuluk: uzun pencereler; büyü odası: mor sancak
    k.banner(c, o, "j", 0, 8.5, "#7a1f36", 18, 52, 0.9); k.banner(c, o, "j", 0, 10.4, "#24306a", 18, 52, 0.9);
    k.gothicWindow(c, o, "j", 0, 26, t, 1.4, 18, 48); k.gothicWindow(c, o, "j", 0, 30, t, 1.4, 18, 48);
    k.gothicWindow(c, o, "i", 0, 3, t, 1.4, 18, 46); k.gothicWindow(c, o, "i", 0, 8.5, t, 1.4, 18, 46);
    for (const i of [1.2, 7.3, 17.5, 23.5, 33]) k.torch(c, o, i, 0, t, 32);
    for (const j of [6, 12.5]) k.torch(c, o, 0, j, t, 32);
  } else {
    k.banner(c, o, "j", 0, 1.5, "#24306a", 18, 52, 0.9); k.banner(c, o, "j", 0, 9.6, "#24306a", 18, 52, 0.9); // Cengiz: lacivert
    k.banner(c, o, "j", 0, 25.5, "#7a1f36", 18, 52, 0.9); k.banner(c, o, "j", 0, 33.6, "#7a1f36", 18, 52, 0.9); // Ayşenur: kızıl
    k.gothicWindow(c, o, "j", 0, 17.2, t, 1.6, 18, 48);
    k.gothicWindow(c, o, "i", 0, 8, t, 1.4, 18, 46); k.gothicWindow(c, o, "i", 0, 15, t, 1.4, 18, 46);
    for (const i of [3.4, 8.6, 12.6, 22.4, 27.4, 32.6]) k.torch(c, o, i, 0, t, 32);
    for (const j of [3, 12, 21]) k.torch(c, o, 0, j, t, 32);
  }
  k.cobweb(c, o, 0, 0, H); k.cobweb(c, o, w - 0.6, 0, H);
  for (const r of halls) for (let i = r.i0; i < r.i1; i++) for (let j = r.j0; j < r.j1; j++) tile(c, o, i, j, FLOOR[r.id](i, j));
  if (balcony) for (let q = 0; q < 10; q++) { const a = balcony.i0 + 1 + rnd(q * 3.3) * 15, b = balcony.j0 + 1 + rnd(q * 1.7) * 8; tile(c, o, a, b, "rgba(170,200,230,0.22)", 0.7, 0.4); } // su birikintisi
}

/** İç duvar dizisi (derinlik sıralı çizim için) ve ön alçak duvarlar */
const wallsCache = new Map<Floor, { i: number; j: number; axis: "i" | "j"; hall: string }[]>();
export function castleWalls(floor: Floor) {
  let ws = wallsCache.get(floor);
  if (!ws) {
    const plan = castlePlan(floor);
    ws = wallsOf(plan).map((wl) => {
      const ci = wl.i - (wl.axis === "j" ? 1 : 0), cj = wl.j - (wl.axis === "i" ? 1 : 0);
      return { ...wl, hall: plan.rooms.find((r) => ci >= r.i0 && ci < r.i1 && cj >= r.j0 && cj < r.j1)!.id };
    });
    wallsCache.set(floor, ws);
  }
  return ws;
}
export const castleWallFaces = (id: string) => { const [a, b] = WALL[id] ?? WALL["buyuk-salon"]; return { top: "#5a5664", left: a, right: b }; };
/** Balkon kareleri (yağmur yalnız buraya yağar) */
export const BALCONY = TRAINING_HALLS.find((r) => r.id === "balkon")!;

/** Dekoru (eşya ya da şatoya özel) çizer */
export function drawDecor(c: Ctx, o: Origin, d: Decor, t: number, drawItem: (p: { itemId: string; tx: number; ty: number; rot?: number }) => void) {
  const pr = PROPS[d.id];
  if (pr) pr.draw(c, o, d.tx, d.ty, t);
  else drawItem({ itemId: d.id, tx: d.tx, ty: d.ty, rot: d.rot });
}
export const decorIsFlat = decorFlat;

/* ------------------------------ bahçeden şato ------------------------------ */

/**
 * Şatonun dışı: kalın taş sur, köşelerde sivri külahlı kuleler, ortada kapı kulesi ve demir parmaklıklı kapı,
 * kızıl ve lacivert sancaklar, aydınlık pencereler, kapının iki yanında meşale. Dönen değer: isim etiketinin noktası.
 */
export function castleOutside(c: Ctx, o: Origin, t: number, k: Draw, flash: number): V {
  const { i0, j0, i1, j1 } = CASTLE, gi = CASTLE.gate.i, gw = CASTLE.gate.width;
  const H = 50;
  const wallF = { ...shade("#4a4654", 0.14, 0.24), top: "#2e2a38" }; // sur üstü: karanlık seğirdim yolu
  // arka kuleler önce (ön sur onları kısmen örter)
  tower(c, o, i0 - 1, j0 - 1, 4, 86, t, k);
  tower(c, o, i1 - 3, j0 - 1, 4, 86, t, k);
  // sur gövdesi
  box(c, o, i0, j0, i1 - i0, j1 - j0, H, wallF);
  k.stoneJ(c, o, j1, i0, i1, H, "rgba(10,8,18,0.3)"); k.stoneI(c, o, i1, j0, j1, H, "rgba(10,8,18,0.3)");
  // mazgallar
  for (let i = i0; i < i1; i += 1) if (Math.floor(i) % 2 === 0) box(c, o, i, j1 - 0.5, 0.8, 0.5, 6, wallF, H);
  for (let j = j0; j < j1; j += 1) if (Math.floor(j) % 2 === 0) box(c, o, i1 - 0.5, j, 0.5, 0.8, 6, wallF, H);
  // ok delikleri ve aydınlık pencereler
  for (const i of [i0 + 2.5, i0 + 5.5, i1 - 6.5, i1 - 3.5]) {
    k.archJ(c, o, j1, i, i + 0.9, 22, 34, P.ink, 3);
    k.archJ(c, o, j1, i + 0.1, i + 0.8, 23, 33, flash > 0.15 ? "#dfe6ff" : "#f0b860", 3);
    const [x, y] = at(o, i + 0.45, j1); lights.push({ x, y: y - 28, r: 16, color: "255,190,110" });
  }
  for (const j of [j0 + 2.5, j0 + 6]) {
    k.archI(c, o, i1, j, j + 0.9, 22, 34, P.ink, 3); k.archI(c, o, i1, j + 0.1, j + 0.8, 23, 33, "#f0b860", 3);
    const [x, y] = at(o, i1, j + 0.45); lights.push({ x, y: y - 28, r: 14, color: "255,190,110" });
  }
  // sancaklar
  for (const [i, col] of [[i0 + 1, "#7a1f36"], [i0 + 4, "#24306a"], [i1 - 5, "#24306a"], [i1 - 2, "#7a1f36"]] as [number, string][]) k.banner(c, o, "j", j1, i, col, 14, 44, 0.8);
  // kapı kulesi: surdan öne çıkan yüksek blok, kemerli kapı, kaldırılmış parmaklık
  const gt = { i0: gi - 1.5, i1: gi + gw + 1.5, j0: j1 - 2, j1: j1 + 0.4 };
  box(c, o, gt.i0, gt.j0, gt.i1 - gt.i0, gt.j1 - gt.j0, H + 22, wallF);
  k.stoneJ(c, o, gt.j1, gt.i0, gt.i1, H + 22, "rgba(10,8,18,0.3)");
  for (let i = gt.i0; i < gt.i1 - 0.2; i += 1.2) box(c, o, i, gt.j1 - 0.5, 0.7, 0.5, 7, wallF, H + 22);
  k.archJ(c, o, gt.j1, gi - 0.15, gi + gw + 0.15, 0, 34, P.ink, 8);
  k.archJ(c, o, gt.j1, gi, gi + gw, 0, 32, "#120e16", 7); // içi karanlık
  for (let x = 0; x < 5; x++) k.faceJ(c, o, gt.j1, gi + 0.15 + x * 0.42, gi + 0.2 + x * 0.42, 24, 38, "#2a2a30"); // yukarıda parmaklık dişleri
  k.faceJ(c, o, gt.j1, gi, gi + gw, 30, 32, "#2a2a30");
  // kapının üstünde arma: kalp ve çapraz kılıçlar
  { const [x, y] = at(o, gi + gw / 2, gt.j1); const ay = y - 50;
    rect(c, x - 6, ay - 6, 12, 12, P.ink); rect(c, x - 5, ay - 5, 10, 10, "#7a1f36");
    line(c, [x - 4, ay - 4], [x + 4, ay + 4], 1, P.goldLt); line(c, [x + 4, ay - 4], [x - 4, ay + 4], 1, P.goldLt);
    px(c, x - 1, ay - 1, "#e48aa0"); px(c, x + 1, ay - 1, "#e48aa0"); rect(c, x - 1, ay, 3, 1, "#e48aa0"); px(c, x, ay + 1, "#e48aa0"); }
  k.torch(c, o, gi - 0.4, gt.j1, t, 22); k.torch(c, o, gi + gw + 0.4, gt.j1, t, 22);
  // ön kuleler (köşeler): sur üstünden yükselir
  tower(c, o, i0 - 1, j1 - 3, 4, 82, t, k);
  tower(c, o, i1 - 3, j1 - 3, 4, 82, t, k);
  // kapı kulesinin tepesinde dalgalanan sancak
  { const [x, y] = at(o, gi + gw / 2, gt.j1 - 1); const top = y - H - 22 - 22;
    rect(c, x, top, 1, 22, P.ink); const wv = Math.round(Math.sin(t * 3) * 1);
    poly(c, [[x + 1, top], [x + 12, top + 3 + wv], [x + 1, top + 7]], "#7a1f36"); }
  const [ax, ay] = at(o, gi + gw / 2, gt.j1);
  return [ax, ay - H - 30];
}

function tower(c: Ctx, o: Origin, i: number, j: number, s: number, h: number, t: number, k: Draw) {
  const f = { ...shade("#44404e", 0.14, 0.26), top: "#2a2634" };
  box(c, o, i, j, s, s, h, f);
  k.stoneJ(c, o, j + s, i, i + s, h, "rgba(10,8,18,0.3)"); k.stoneI(c, o, i + s, j, j + s, h, "rgba(10,8,18,0.3)");
  for (let a = 0; a < s; a += 1) { box(c, o, i + a, j + s - 0.4, 0.6, 0.4, 6, f, h); box(c, o, i + s - 0.4, j + a, 0.4, 0.6, 6, f, h); }
  // aydınlık ok deliği
  k.archJ(c, o, j + s, i + s / 2 - 0.3, i + s / 2 + 0.3, h - 26, h - 14, "#f0b860", 2);
  { const [x, y] = at(o, i + s / 2, j + s); lights.push({ x, y: y - h + 20, r: 12, color: "255,190,110" }); }
  // sivri arduvaz külah
  const cx = i + s / 2, cj = j + s / 2, z = h + 6, top = z + 34;
  const L = (a: number, b: number): V => { const p = at(o, a, b); return [p[0], p[1] - z]; };
  const T: V = (() => { const p = at(o, cx, cj); return [p[0], p[1] - top]; })();
  poly(c, [L(i - 0.2, j + s + 0.2), L(i + s + 0.2, j + s + 0.2), T], "#2a2a44");
  poly(c, [L(i + s + 0.2, j + s + 0.2), L(i + s + 0.2, j - 0.2), T], "#1e1e34");
  line(c, L(i + s + 0.2, j + s + 0.2), T, 1, P.ink);
  rect(c, T[0], T[1] - 6, 1, 6, P.ink); px(c, T[0] + 1, T[1] - 6, "#b8344a"); px(c, T[0] + 2, T[1] - 5 + Math.round(Math.sin(t * 3)), "#b8344a");
}

// kendi kendini denetler: her kat dolaşılabilir, dekor kapıları ve merdivenleri kapatmaz
if (process.env.NODE_ENV !== "production") {
  for (const floor of [1, 2, 3] as Floor[]) {
    const plan = castlePlan(floor), blocked = castleBlocked(floor);
    const cover = plan.rooms.reduce((n, r) => n + (r.i1 - r.i0) * (r.j1 - r.j0), 0);
    console.assert(cover === plan.w * plan.d, `kat ${floor}: salonlar planı boşluksuz doldurur`);
    const stairs = STAIRS.filter((s) => s.floor === floor);
    console.assert(stairs.length > 0, `kat ${floor}: merdiven var`);
    const start = stairs[0].spawn.map(Math.floor) as [number, number];
    console.assert(!blocked.has(start.join(",")), `kat ${floor}: merdivenin önü boş`);
    const seen = new Set([start.join(",")]), q: [number, number][] = [start];
    while (q.length) {
      const [i, j] = q.shift()!;
      for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]] as [number, number][]) {
        const k = `${a},${b}`;
        if (seen.has(k) || a < 0 || b < 0 || a >= plan.w || b >= plan.d || blocked.has(k) || !stepIn(plan, [i, j], [a, b])) continue;
        seen.add(k); q.push([a, b]);
      }
    }
    console.assert(plan.rooms.every((r) => [...seen].some((k) => { const [i, j] = k.split(",").map(Number); return i >= r.i0 && i < r.i1 && j >= r.j0 && j < r.j1; })), `kat ${floor}: her salona ulaşılır`);
    console.assert(plan.doors.flat().every(([a, b]) => !blocked.has(`${a},${b}`)), `kat ${floor}: kapılar açık`);
    console.assert(stairs.every((s) => !blocked.has(s.spawn.map(Math.floor).join(","))), `kat ${floor}: bütün merdivenlerin önü boş`);
  }
  console.assert(stairsTarget(1, "up") === 2 && stairsTarget(2, "up") === 3 && stairsTarget(3, "up") === null && stairsTarget(1, "down") === null && stairsTarget(3, "down") === 2, "merdiven hedefleri");
  for (const owner of ["cengiz", "aysenur"] as const) for (const kind of ["Zırh", "Silah", "Büyü"] as const)
    console.assert(ARMORY_STATIONS.some((s) => s.owner === owner && s.kind === kind), `${owner} odasında ${kind} istasyonu`);
  console.assert(TARGETS.length >= 7 && TARGETS.every((tg) => castleBlocked(2).has(`${Math.floor(tg.i)},${Math.floor(tg.j)}`)), "talim hedefleri 2. katta ve yolu keser");
}
