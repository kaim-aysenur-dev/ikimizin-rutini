// Gelişim · Ortak şato: bahçenin kuzeyindeki şatonun dışı ve altı salonlu içi (izometrik).
// Ana sayfadaki şatonun salonları: şenlik ateşli büyük salon, kütüphane, şömine odası, yemek salonu, spor salonu, hamam.
// Dekor sabit (eşya konmaz); oturulan, çalınan, açılan eşyalar evdeki gibi çalışır. Misafirler salonlarda bekler.
import { lights } from "./env";
import { type Origin, at, box, shade, tile } from "./iso";
import { type Ctx, type V, P, disc, line, poly, px, rect, rnd } from "./pixel";
import { CASTLE, CASTLE_ENTRY, CASTLE_PLAN, HALLS, type HallId, type Placed, SIZE, wallsOf } from "./room";
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

/** Dekorun boyutu (döndürmeye göre) */
export function decorSize(d: Decor): [number, number] {
  const s = PROPS[d.id]?.size ?? itemById.get(d.id)?.size ?? [1, 1];
  return d.rot ? [s[1], s[0]] : s;
}
const decorFlat = (d: Decor) => PROPS[d.id]?.flat ?? isFlat(d.id);

/** Şatoda yürürken çarpılan kareler */
export const CASTLE_BLOCKED: Set<string> = (() => {
  const s = new Set<string>();
  for (const d of CASTLE_DECOR) {
    if (decorFlat(d)) continue;
    const [w, dd] = decorSize(d);
    for (let a = 0; a < w; a++) for (let b = 0; b < dd; b++) s.add(`${d.tx + a},${d.ty + b}`);
  }
  for (const g of GUESTS_AT()) s.add(`${Math.floor(g.i)},${Math.floor(g.j)}`);
  return s;
})();

/** Etkileşim için ev eşyası gibi davranan dekor (oturma, piyano, masa, kitaplık) */
export const castleInteractive = (): Placed[] =>
  CASTLE_DECOR.filter((d) => itemById.get(d.id)).map((d, k) => ({ id: `sato-${k}`, itemId: d.id, scope: "oda", tx: d.tx, ty: d.ty, userId: "", rot: d.rot }));

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
/** Bahçede şato kapısında nöbet tutan Jon Snow */
export const GATE_GUARD: Guest = { key: "jon", who: "jon", i: CASTLE.gate.i - 1.2, j: CASTLE.j1 + 0.6, dir: 1 };

/* ----------------------------------- çizim ----------------------------------- */

const CASTLE_WALL_H = 60;
// taş tonları: salonlara göre biraz değişir
const WALL: Record<HallId, [string, string]> = {
  "buyuk-salon": ["#3a3644", "#363240"], kutuphane: ["#3a3238", "#362e34"], somine: ["#40343a", "#3c3036"],
  yemek: ["#3a3644", "#363240"], spor: ["#3a3a40", "#36363c"], hamam: ["#4a4a56", "#46465a"],
};
const FLOOR: Record<HallId, (i: number, j: number) => string> = {
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
export function castleInterior(c: Ctx, o: Origin, t: number, k: Draw) {
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

/** İç duvar dizisi (derinlik sıralı çizim için) ve ön alçak duvarlar */
export const CASTLE_WALLS = wallsOf(CASTLE_PLAN);
export const castleWallFaces = (id: HallId) => { const [a, b] = WALL[id]; return { top: "#5a5664", left: a, right: b }; };

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
