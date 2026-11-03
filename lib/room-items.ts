// Gelişim: odaya ve ortak bahçeye yerleştirilen eşyalar. Seviyeyle envantere düşer, kişi istediği kareye koyar.
// Her eşya izometrik kutulardan ve piksellerden çizilir; (i, j) eşyanın kapladığı alanın üst köşesi.
import { type Origin, at, box, shade, tile } from "./iso";
import { lights } from "./env";
import { type Ctx, P, disc, line, poly, px, rect } from "./pixel";

export type Scope = "oda" | "bahce";
export type Cat = "Salon" | "Yatak odası" | "Mutfak" | "Banyo" | "Çalışma" | "Dekor" | "Bitki" | "Halı" | "Bahçe";
export const CATS: Cat[] = ["Salon", "Yatak odası", "Mutfak", "Banyo", "Çalışma", "Dekor", "Bitki", "Halı", "Bahçe"];
export type RoomItem = { id: string; level: number; name: string; scope: Scope; size: [number, number]; cat?: Cat; draw: (c: Ctx, o: Origin, i: number, j: number, t: number) => void };

const WOOD = shade("#8c6448"), WOOD_DK = shade("#6b4a35"), STONE = shade("#7d7884"), GOLD = shade("#d8a840");

const flame = (c: Ctx, x: number, y: number, t: number, big = 1) => {
  const f = Math.round(Math.sin(t * 9 + x) * 0.8);
  rect(c, x, y - 2 * big - (f > 0 ? 1 : 0), big, 2 * big, P.amber);
  px(c, x, y - 2 * big - 1 - (f > 0 ? 1 : 0), P.goldLt);
  lights.push({ x, y: y - 2, r: 16 * big + f, color: "240,162,74" });
};

// elle çizilmiş ilk eşyalar (kimlikleri kayıtlarda kullanılıyor, değişmez)
const HANDMADE: RoomItem[] = [
  /* ---------------------------------- oda ---------------------------------- */
  { id: "yatak", level: 1, name: "Yatak", scope: "oda", size: [2, 1], draw: (c, o, i, j) => {
    box(c, o, i, j, 2, 1, 5, WOOD);
    box(c, o, i + 0.05, j + 0.05, 1.9, 0.9, 3, shade("#e6d3a8"), 5, false);
    box(c, o, i + 0.6, j + 0.05, 1.35, 0.9, 1, shade("#b56b7a"), 8, false); // battaniye
    box(c, o, i + 0.1, j + 0.15, 0.4, 0.7, 2, shade("#f8f0e0"), 8, false); // yastık
    box(c, o, i, j, 0.15, 1, 16, WOOD_DK); // başlık
    const [x, y] = at(o, i + 1.3, j + 0.5); px(c, x, y - 9, "#e48aa0"); px(c, x + 2, y - 10, "#e48aa0");
  } },
  { id: "komodin", level: 1, name: "Komodin ve mum", scope: "oda", size: [1, 1], draw: (c, o, i, j, t) => {
    box(c, o, i + 0.15, j + 0.15, 0.7, 0.7, 9, WOOD);
    const [x, y] = at(o, i + 0.5, j + 0.85); rect(c, x - 3, y - 6, 3, 1, P.woodDk); px(c, x - 2, y - 5, P.gold);
    const [cx, cy] = at(o, i + 0.5, j + 0.5); rect(c, cx - 1, cy - 14, 2, 4, P.cream); flame(c, cx, cy - 14, t);
  } },
  { id: "hali", level: 2, name: "Kırmızı halı", scope: "oda", size: [2, 2], draw: (c, o, i, j) => {
    tile(c, o, i, j, P.gold, 2, 2);
    tile(c, o, i + 0.12, j + 0.12, "#7a2a3a", 1.76, 1.76);
    tile(c, o, i + 0.5, j + 0.5, "#9a3a4a", 1, 1);
    tile(c, o, i + 0.85, j + 0.85, P.goldLt, 0.3, 0.3);
  } },
  { id: "kitaplik", level: 3, name: "Kitaplık", scope: "oda", size: [1, 1], draw: (c, o, i, j) => {
    box(c, o, i + 0.1, j + 0.1, 0.8, 0.8, 26, WOOD_DK);
    const cols = ["#8a3a4a", "#2f3b6b", "#4f7a4f", "#e2b45a", "#5b4a7a"];
    for (let s = 0; s < 3; s++) {
      const [x, y] = at(o, i + 0.1, j + 0.9);
      for (let k = 0; k < 5; k++) rect(c, x + 1 + k, y - 6 - s * 8 + Math.floor(k / 2) * 0.5, 1, 5 - (k % 2), cols[(k + s) % 5]);
      const [x2, y2] = at(o, i + 0.9, j + 0.9);
      for (let k = 0; k < 5; k++) rect(c, x2 - 6 + k, y2 - 6 - s * 8 - Math.floor(k / 2) * 0.5, 1, 5 - (k % 2), cols[(k + s + 2) % 5]);
    }
  } },
  { id: "saksi", level: 4, name: "Saksıda bitki", scope: "oda", size: [1, 1], draw: (c, o, i, j) => {
    box(c, o, i + 0.3, j + 0.3, 0.4, 0.4, 5, shade("#b8603a"));
    const [x, y] = at(o, i + 0.5, j + 0.5);
    disc(c, x, y - 11, 5, P.ink); disc(c, x, y - 11, 4, "#4f7a4f"); disc(c, x - 2, y - 13, 2, "#5f9e6e"); px(c, x + 2, y - 10, "#8fd09a"); px(c, x - 1, y - 15, "#e48aa0");
  } },
  { id: "sandik", level: 5, name: "Sandık", scope: "oda", size: [1, 1], draw: (c, o, i, j) => {
    box(c, o, i + 0.15, j + 0.2, 0.7, 0.6, 7, WOOD);
    box(c, o, i + 0.15, j + 0.2, 0.7, 0.6, 2, shade("#a87a50"), 7);
    const [x, y] = at(o, i + 0.5, j + 0.8); rect(c, x - 1, y - 7, 2, 3, P.gold); px(c, x, y - 6, P.ink);
  } },
  { id: "masa", level: 6, name: "Çalışma masası", scope: "oda", size: [1, 1], draw: (c, o, i, j, t) => {
    for (const [a, b] of [[0.15, 0.15], [0.8, 0.15], [0.15, 0.8], [0.8, 0.8]]) box(c, o, i + a, j + b, 0.08, 0.08, 9, WOOD_DK);
    box(c, o, i + 0.1, j + 0.1, 0.8, 0.8, 2, WOOD, 9);
    const [x, y] = at(o, i + 0.5, j + 0.5);
    rect(c, x - 5, y - 13, 6, 2, P.cream); rect(c, x - 2, y - 13, 1, 2, P.woodDk); // açık kitap
    rect(c, x + 3, y - 15, 2, 3, "#e8e0f0"); if (Math.floor(t * 2) % 2) px(c, x + 3, y - 17, "rgba(255,255,255,0.6)");
  } },
  { id: "zirh-askisi", level: 7, name: "Zırh askısı", scope: "oda", size: [1, 1], draw: (c, o, i, j) => {
    box(c, o, i + 0.3, j + 0.3, 0.4, 0.4, 2, WOOD_DK);
    const [x, y] = at(o, i + 0.5, j + 0.5);
    rect(c, x - 1, y - 22, 2, 20, P.woodDk);
    rect(c, x - 6, y - 22, 12, 11, P.ink); rect(c, x - 5, y - 21, 10, 9, "#9aa0ae"); rect(c, x - 5, y - 21, 3, 9, "#d8dce6"); rect(c, x + 2, y - 21, 3, 9, "#6e7482");
    rect(c, x - 3, y - 27, 6, 5, P.ink); rect(c, x - 2, y - 26, 4, 3, "#8e95a3"); rect(c, x - 2, y - 25, 4, 1, P.ink);
  } },
  { id: "silah-rafi", level: 9, name: "Silah rafı", scope: "oda", size: [1, 1], draw: (c, o, i, j) => {
    box(c, o, i + 0.1, j + 0.4, 0.8, 0.2, 3, WOOD_DK);
    const [x, y] = at(o, i + 0.5, j + 0.5);
    rect(c, x - 7, y - 20, 14, 2, P.wood); rect(c, x - 7, y - 8, 14, 2, P.wood);
    line(c, [x - 4, y - 4], [x - 4, y - 24], 3, P.ink); line(c, [x - 4, y - 4], [x - 4, y - 24], 1, "#c8ccd8"); rect(c, x - 6, y - 8, 5, 1, P.gold);
    line(c, [x + 4, y - 4], [x + 2, y - 23], 2, P.ink); line(c, [x + 4, y - 4], [x + 2, y - 23], 1, "#b88a5c");
    for (let k = 0; k < 6; k++) px(c, x + 5 - Math.round(Math.abs(k - 2.5)), y - 20 + k * 3, "#8c6448");
  } },
  { id: "kedi-minderi", level: 10, name: "Düldül'ün minderi", scope: "oda", size: [1, 1], draw: (c, o, i, j) => {
    box(c, o, i + 0.15, j + 0.15, 0.7, 0.7, 3, shade("#6b3f63"));
    const [x, y] = at(o, i + 0.5, j + 0.5); px(c, x - 2, y - 4, P.gold); px(c, x + 2, y - 4, P.gold);
  } },
  { id: "ayna", level: 12, name: "Altın ayna", scope: "oda", size: [1, 1], draw: (c, o, i, j, t) => {
    const [x, y] = at(o, i + 0.5, j + 0.5);
    rect(c, x - 5, y - 26, 10, 24, P.ink); rect(c, x - 4, y - 25, 8, 22, P.gold); rect(c, x - 3, y - 24, 6, 20, "#a9cce6");
    const s = Math.floor(t * 1.5) % 10; if (s < 4) line(c, [x - 3 + s, y - 24], [x - 3 + s - 2, y - 18], 1, "#ffffff");
    rect(c, x - 3, y - 2, 6, 2, P.woodDk);
  } },
  { id: "somine", level: 14, name: "Şömine", scope: "oda", size: [2, 1], draw: (c, o, i, j, t) => {
    box(c, o, i, j, 2, 0.8, 20, STONE);
    box(c, o, i - 0.05, j - 0.05, 2.1, 0.9, 2, WOOD, 20);
    const [x, y] = at(o, i + 1, j + 0.8);
    rect(c, x - 6, y - 12, 12, 10, "#120c10");
    for (let k = 0; k < 10; k++) { const h = 3 + Math.round((Math.sin(t * 8 + k) + 1) * 2); rect(c, x - 5 + k, y - 3 - h, 1, h, k % 3 ? "#f0a24a" : "#ffe08a"); }
    lights.push({ x, y: y - 6, r: 44, color: "255,150,70" });
  } },
  { id: "kazan", level: 16, name: "Büyü kazanı", scope: "oda", size: [1, 1], draw: (c, o, i, j, t) => {
    const [x, y] = at(o, i + 0.5, j + 0.5);
    disc(c, x, y - 5, 7, P.ink); disc(c, x, y - 5, 6, "#2a2533"); rect(c, x - 7, y - 10, 14, 3, P.ink); rect(c, x - 6, y - 10, 12, 2, "#5fae6e");
    for (let k = 0; k < 3; k++) { const q = (t * 0.8 + k / 3) % 1; px(c, x - 3 + k * 3, y - 11 - Math.round(q * 8), `rgba(160,240,170,${(1 - q).toFixed(2)})`); }
    lights.push({ x, y: y - 9, r: 18, color: "120,220,140" });
  } },
  { id: "yumurta", level: 18, name: "Ejderha yumurtası", scope: "oda", size: [1, 1], draw: (c, o, i, j, t) => {
    box(c, o, i + 0.25, j + 0.25, 0.5, 0.5, 5, STONE);
    const [x, y] = at(o, i + 0.5, j + 0.5);
    disc(c, x, y - 12, 5, P.ink); disc(c, x, y - 12, 4, "#5a3a80"); rect(c, x - 3, y - 18, 6, 3, P.ink); rect(c, x - 2, y - 17, 4, 2, "#5a3a80");
    px(c, x - 1, y - 14, "#a8e05a"); px(c, x + 2, y - 11, "#a8e05a"); px(c, x - 2, y - 10, "#a8e05a");
    lights.push({ x, y: y - 12, r: 14 + Math.max(0, Math.sin(t * 2)) * 6, color: "160,220,90" });
  } },
  { id: "taht", level: 25, name: "Taht", scope: "oda", size: [1, 1], draw: (c, o, i, j) => {
    box(c, o, i + 0.15, j + 0.15, 0.7, 0.7, 7, GOLD);
    box(c, o, i + 0.2, j + 0.2, 0.6, 0.6, 2, shade("#8a3a4a"), 7, false);
    box(c, o, i + 0.15, j + 0.15, 0.12, 0.7, 24, GOLD);
    const [x, y] = at(o, i + 0.2, j + 0.5); px(c, x, y - 26, "#d8485a"); px(c, x - 1, y - 25, P.goldLt);
  } },

  /* --------------------------------- bahçe --------------------------------- */
  { id: "cicek", level: 1, name: "Çiçek tarhı", scope: "bahce", size: [1, 1], draw: (c, o, i, j, t) => {
    box(c, o, i + 0.05, j + 0.05, 0.9, 0.9, 3, shade("#6b4a35"));
    const cols = ["#e48aa0", "#f3d48a", "#c9a6f0", "#ffffff", "#d8485a"];
    for (let k = 0; k < 7; k++) {
      const [x, y] = at(o, i + 0.2 + (k % 3) * 0.3, j + 0.2 + Math.floor(k / 3) * 0.3);
      const sway = Math.round(Math.sin(t * 2 + k) * 0.6);
      rect(c, x + sway, y - 7, 1, 4, "#4f7a4f"); px(c, x + sway, y - 8, cols[k % 5]); px(c, x + sway - 1, y - 7, cols[k % 5]); px(c, x + sway + 1, y - 7, cols[k % 5]);
    }
  } },
  { id: "fener", level: 2, name: "Alevli fener", scope: "bahce", size: [1, 1], draw: (c, o, i, j, t) => {
    const [x, y] = at(o, i + 0.5, j + 0.5);
    rect(c, x - 2, y - 2, 4, 2, P.ink); rect(c, x - 1, y - 22, 2, 20, "#3a3346");
    rect(c, x - 3, y - 28, 6, 7, P.ink); rect(c, x - 2, y - 27, 4, 5, "rgba(255,200,120,0.5)"); flame(c, x, y - 23, t);
    rect(c, x - 4, y - 29, 8, 1, P.ink);
  } },
  { id: "agac", level: 3, name: "Elma ağacı", scope: "bahce", size: [1, 1], draw: (c, o, i, j, t) => {
    const [x, y] = at(o, i + 0.5, j + 0.5);
    rect(c, x - 2, y - 14, 4, 13, P.ink); rect(c, x - 1, y - 14, 2, 12, P.wood);
    const sw = Math.round(Math.sin(t * 1.3) * 0.7);
    disc(c, x + sw, y - 22, 9, P.ink); disc(c, x + sw, y - 22, 8, "#2e5240"); disc(c, x - 3 + sw, y - 25, 5, "#4f7a4f"); disc(c, x + 3 + sw, y - 20, 4, "#3f6a44");
    for (const [dx, dy] of [[-4, -19], [3, -26], [5, -18], [-1, -15]]) px(c, x + dx + sw, y + dy, "#d8485a");
  } },
  { id: "bank", level: 5, name: "Bahçe bankı", scope: "bahce", size: [2, 1], draw: (c, o, i, j) => {
    for (const a of [0.15, 1.75]) box(c, o, i + a, j + 0.3, 0.1, 0.4, 6, WOOD_DK);
    box(c, o, i + 0.05, j + 0.25, 1.9, 0.5, 2, WOOD, 6);
    box(c, o, i + 0.05, j + 0.15, 1.9, 0.12, 8, WOOD, 6);
  } },
  { id: "kuyu", level: 8, name: "Dilek kuyusu", scope: "bahce", size: [1, 1], draw: (c, o, i, j, t) => {
    box(c, o, i + 0.1, j + 0.1, 0.8, 0.8, 8, STONE);
    box(c, o, i + 0.25, j + 0.25, 0.5, 0.5, 1, shade("#2f6a8a"), 7, false);
    const [x, y] = at(o, i + 0.5, j + 0.5);
    rect(c, x - 7, y - 26, 1, 18, P.woodDk); rect(c, x + 6, y - 26, 1, 18, P.woodDk);
    rect(c, x - 9, y - 28, 18, 3, P.ink); rect(c, x - 8, y - 28, 16, 2, "#8a3a4a");
    if (Math.floor(t) % 4 === 0) px(c, x + 1, y - 9, P.goldLt);
  } },
  { id: "cesme", level: 11, name: "Çeşme", scope: "bahce", size: [2, 2], draw: (c, o, i, j, t) => {
    box(c, o, i + 0.1, j + 0.1, 1.8, 1.8, 6, STONE);
    box(c, o, i + 0.3, j + 0.3, 1.4, 1.4, 1, shade("#5a9ac8"), 5, false);
    box(c, o, i + 0.85, j + 0.85, 0.3, 0.3, 14, STONE);
    const [x, y] = at(o, i + 1, j + 1);
    for (let k = 0; k < 6; k++) { const q = (t * 1.2 + k / 6) % 1; px(c, x - 4 + Math.round(q * 8) * (k % 2 ? 1 : -1) / 2, y - 20 + Math.round(q * q * 14), "#bfe6f5"); }
    px(c, x, y - 21, "#ffffff");
  } },
  { id: "gul-kemeri", level: 15, name: "Gül kemeri", scope: "bahce", size: [1, 1], draw: (c, o, i, j) => {
    const [x, y] = at(o, i + 0.5, j + 0.5);
    for (const dx of [-7, 6]) { rect(c, x + dx - 1, y - 24, 3, 24, P.ink); rect(c, x + dx, y - 24, 1, 23, "#3f6a44"); }
    for (let k = -7; k <= 7; k++) { const yy = y - 24 - Math.round(4 * Math.cos((k / 7) * 1.57)); rect(c, x + k, yy - 1, 1, 3, k % 3 ? "#3f6a44" : "#d8485a"); }
    for (const dy of [-6, -12, -18]) { px(c, x - 7, y + dy, "#e48aa0"); px(c, x + 6, y + dy - 2, "#e48aa0"); }
  } },
  { id: "heykel", level: 20, name: "Şövalye heykeli", scope: "bahce", size: [1, 1], draw: (c, o, i, j) => {
    box(c, o, i + 0.2, j + 0.2, 0.6, 0.6, 7, STONE);
    const [x, y] = at(o, i + 0.5, j + 0.5);
    rect(c, x - 4, y - 25, 8, 16, P.ink); rect(c, x - 3, y - 24, 6, 14, "#c8ccd8"); rect(c, x - 3, y - 24, 2, 14, "#e8ecf4");
    rect(c, x - 2, y - 30, 4, 5, P.ink); rect(c, x - 1, y - 29, 2, 3, "#c8ccd8");
    line(c, [x + 5, y - 9], [x + 5, y - 32], 1, "#9aa0ae");
  } },
];


/* ------------------------------ üretilen eşyalar ----------------------------- */
// Yüzlerce ev ve bahçe eşyası: şekil kalıpları × kumaş/ahşap/renk çeşitleri.
// Seviyeler dengeli dağılır: önce her kalıbın ilk çeşidi açılır, sonra daha süslü çeşitleri.

type Pal = { name: string; c: string };
const FAB: Pal[] = [
  { name: "Kırmızı", c: "#a8454e" }, { name: "Lacivert", c: "#2f3b6b" }, { name: "Yeşil", c: "#4f7a4f" }, { name: "Pembe", c: "#d68a9a" },
  { name: "Mor", c: "#6b4a8a" }, { name: "Hardal", c: "#c89a3e" }, { name: "Krem", c: "#e6d3a8" }, { name: "Turkuaz", c: "#3a9aa0" },
];
const WOODS: Pal[] = [{ name: "Meşe", c: "#a87a50" }, { name: "Ceviz", c: "#6b4a35" }, { name: "Çam", c: "#c8a070" }, { name: "Abanoz", c: "#3a2a28" }, { name: "Beyaz", c: "#e8e0d0" }];
const TONES: Pal[] = [{ name: "Krem", c: "#e6d3a8" }, { name: "Mint", c: "#9fd0b8" }, { name: "Lacivert", c: "#3a4a7a" }];

type GenTmpl = { id: string; noun: string; cat: Cat; scope: Scope; size: [number, number]; pals: Pal[]; draw: (c: Ctx, o: Origin, i: number, j: number, t: number, p: string) => void };

const at2 = (o: Origin, i: number, j: number) => at(o, i, j);

const TEMPLATES: GenTmpl[] = [
  { id: "koltuk", noun: "Koltuk", cat: "Salon", scope: "oda", size: [2, 1], pals: FAB, draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.05, j + 0.2, 1.9, 0.7, 6, shade(p));
    box(c, o, i + 0.05, j + 0.15, 1.9, 0.18, 13, shade(p, 0.1, 0.3));
    box(c, o, i + 0.05, j + 0.2, 0.18, 0.7, 9, shade(p, 0.1, 0.3)); box(c, o, i + 1.77, j + 0.2, 0.18, 0.7, 9, shade(p, 0.1, 0.3));
    box(c, o, i + 0.3, j + 0.4, 0.6, 0.45, 2, shade(p, 0.3), 6, false); box(c, o, i + 1.05, j + 0.4, 0.6, 0.45, 2, shade(p, 0.3), 6, false);
  } },
  { id: "berjer", noun: "Berjer", cat: "Salon", scope: "oda", size: [1, 1], pals: FAB.slice(0, 6), draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.15, j + 0.2, 0.7, 0.65, 6, shade(p));
    box(c, o, i + 0.15, j + 0.15, 0.7, 0.18, 14, shade(p, 0.1, 0.3));
    box(c, o, i + 0.15, j + 0.2, 0.14, 0.65, 9, shade(p, 0.1, 0.3)); box(c, o, i + 0.71, j + 0.2, 0.14, 0.65, 9, shade(p, 0.1, 0.3));
  } },
  { id: "sandalye", noun: "Sandalye", cat: "Mutfak", scope: "oda", size: [1, 1], pals: WOODS, draw: (c, o, i, j, _t, p) => {
    for (const [a, b] of [[0.3, 0.3], [0.62, 0.3], [0.3, 0.62], [0.62, 0.62]]) box(c, o, i + a, j + b, 0.07, 0.07, 6, shade(p, 0, 0.3), 0, false);
    box(c, o, i + 0.28, j + 0.28, 0.44, 0.44, 2, shade(p), 6);
    box(c, o, i + 0.28, j + 0.28, 0.44, 0.08, 10, shade(p), 8);
  } },
  { id: "yemek-masasi", noun: "Yemek Masası", cat: "Mutfak", scope: "oda", size: [2, 1], pals: WOODS.slice(0, 4), draw: (c, o, i, j, t, p) => {
    for (const [a, b] of [[0.15, 0.15], [1.78, 0.15], [0.15, 0.78], [1.78, 0.78]]) box(c, o, i + a, j + b, 0.08, 0.08, 9, shade(p, 0, 0.3), 0, false);
    box(c, o, i + 0.05, j + 0.08, 1.9, 0.84, 2, shade(p), 9);
    const [x, y] = at2(o, i + 1, j + 0.5); rect(c, x - 3, y - 13, 6, 2, "#e6d3a8"); rect(c, x - 1, y - 16, 2, 3, "#d8485a"); px(c, x, y - 17, "#5fae6e");
    void t;
  } },
  { id: "sehpa", noun: "Sehpa", cat: "Salon", scope: "oda", size: [1, 1], pals: WOODS.slice(0, 4), draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.2, j + 0.2, 0.6, 0.6, 5, shade(p));
    const [x, y] = at2(o, i + 0.5, j + 0.5); rect(c, x - 1, y - 10, 3, 4, "#6f86d6"); px(c, x, y - 12, "#e48aa0"); px(c, x + 1, y - 11, "#f3d48a");
  } },
  { id: "kitaplik", noun: "Kitaplık", cat: "Çalışma", scope: "oda", size: [1, 1], pals: WOODS.slice(0, 4), draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.1, j + 0.1, 0.8, 0.8, 26, shade(p));
    const cols = ["#8a3a4a", "#2f3b6b", "#4f7a4f", "#e2b45a", "#5b4a7a"];
    for (let s = 0; s < 3; s++) { const [x, y] = at2(o, i + 0.1, j + 0.9); for (let k = 0; k < 5; k++) rect(c, x + 1 + k, y - 6 - s * 8, 1, 5 - (k % 2), cols[(k + s) % 5]); }
  } },
  { id: "gardrop", noun: "Gardırop", cat: "Yatak odası", scope: "oda", size: [1, 1], pals: WOODS, draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.1, j + 0.15, 0.8, 0.7, 28, shade(p));
    const [x, y] = at2(o, i + 0.5, j + 0.85); line(c, [x - 2, y - 4], [x - 2, y - 26], 1, "rgba(26,20,38,0.5)"); px(c, x - 4, y - 15, P.gold); px(c, x, y - 15, P.gold);
  } },
  { id: "sifonyer", noun: "Şifonyer", cat: "Yatak odası", scope: "oda", size: [2, 1], pals: WOODS.slice(0, 4), draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.05, j + 0.2, 1.9, 0.6, 11, shade(p));
    for (let k = 0; k < 3; k++) { const [x, y] = at2(o, i + 0.4 + k * 0.6, j + 0.8); px(c, x, y - 4, P.gold); px(c, x, y - 8, P.gold); }
    const [x, y] = at2(o, i + 1, j + 0.5); rect(c, x - 4, y - 19, 8, 7, P.ink); rect(c, x - 3, y - 18, 6, 5, "#a9cce6");
  } },
  { id: "lambader", noun: "Lambader", cat: "Dekor", scope: "oda", size: [1, 1], pals: FAB.slice(0, 6), draw: (c, o, i, j, _t, p) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5);
    rect(c, x - 3, y - 2, 6, 2, P.ink); rect(c, x, y - 22, 1, 20, "#3a3346");
    poly(c, [[x - 5, y - 22], [x + 6, y - 22], [x + 4, y - 30], [x - 3, y - 30]], P.ink, 1); poly(c, [[x - 5, y - 22], [x + 6, y - 22], [x + 4, y - 30], [x - 3, y - 30]], p);
    lights.push({ x, y: y - 22, r: 26, color: "255,220,150" });
  } },
  { id: "bitki", noun: "Saksı Bitkisi", cat: "Bitki", scope: "oda", size: [1, 1], pals: [{ name: "Monstera", c: "#3f6a44" }, { name: "Kaktüs", c: "#5f9e6e" }, { name: "Palmiye", c: "#4f8a5c" }, { name: "Lavanta", c: "#9a86c4" }, { name: "Bonsai", c: "#2e5240" }, { name: "Orkide", c: "#e48aa0" }],
    draw: (c, o, i, j, t, p) => {
      box(c, o, i + 0.32, j + 0.32, 0.36, 0.36, 5, shade("#b8603a"));
      const [x, y] = at2(o, i + 0.5, j + 0.5); const sw = Math.round(Math.sin(t * 1.5 + i) * 0.6);
      if (p === "#5f9e6e") { rect(c, x - 2, y - 16, 4, 11, P.ink); rect(c, x - 1, y - 15, 2, 10, p); rect(c, x - 5, y - 12, 3, 2, p); rect(c, x + 2, y - 10, 3, 2, p); px(c, x, y - 17, "#e48aa0"); return; }
      if (p === "#9a86c4" || p === "#e48aa0") { for (let k = -2; k <= 2; k++) { rect(c, x + k * 2, y - 12, 1, 7, "#4f7a4f"); px(c, x + k * 2 + sw, y - 13 - (k % 2), p); px(c, x + k * 2 + sw, y - 14 - (k % 2), p); } return; }
      disc(c, x + sw, y - 12, 6, P.ink); disc(c, x + sw, y - 12, 5, p); disc(c, x - 2 + sw, y - 14, 2, "#8fd09a"); px(c, x + 3 + sw, y - 10, "#2e5240");
    } },
  { id: "hali", noun: "Halı", cat: "Halı", scope: "oda", size: [2, 2], pals: FAB, draw: (c, o, i, j, _t, p) => {
    tile(c, o, i, j, P.gold, 2, 2); tile(c, o, i + 0.12, j + 0.12, p, 1.76, 1.76); tile(c, o, i + 0.5, j + 0.5, shade(p, 0.25).top, 1, 1); tile(c, o, i + 0.85, j + 0.85, P.goldLt, 0.3, 0.3);
  } },
  { id: "buyuk-hali", noun: "Büyük Halı", cat: "Halı", scope: "oda", size: [3, 2], pals: FAB.slice(0, 4), draw: (c, o, i, j, _t, p) => {
    tile(c, o, i, j, "#e6d3a8", 3, 2); tile(c, o, i + 0.15, j + 0.15, p, 2.7, 1.7);
    for (let k = 0; k < 3; k++) tile(c, o, i + 0.4 + k * 0.8, j + 0.7, shade(p, 0.3).top, 0.5, 0.6);
  } },
  { id: "cift-yatak", noun: "Çift Kişilik Yatak", cat: "Yatak odası", scope: "oda", size: [2, 2], pals: FAB.slice(0, 6), draw: (c, o, i, j, _t, p) => {
    box(c, o, i, j, 2, 2, 5, shade("#8c6448"));
    box(c, o, i + 0.05, j + 0.05, 1.9, 1.9, 3, shade("#f2e4c2"), 5, false);
    box(c, o, i + 0.6, j + 0.05, 1.35, 1.9, 1, shade(p), 8, false);
    box(c, o, i + 0.12, j + 0.15, 0.4, 0.75, 2, shade("#ffffff"), 8, false); box(c, o, i + 0.12, j + 1.05, 0.4, 0.75, 2, shade("#ffffff"), 8, false);
    box(c, o, i, j, 0.15, 2, 18, shade("#6b4a35"));
    const [x, y] = at2(o, i + 1.3, j + 1); px(c, x - 1, y - 10, "#e48aa0"); px(c, x + 1, y - 10, "#e48aa0"); px(c, x, y - 9, "#e48aa0");
  } },
  { id: "ocak", noun: "Ocak", cat: "Mutfak", scope: "oda", size: [1, 1], pals: TONES, draw: (c, o, i, j, t, p) => {
    box(c, o, i + 0.08, j + 0.08, 0.84, 0.84, 13, shade(p));
    box(c, o, i + 0.08, j + 0.08, 0.84, 0.84, 1, shade("#3a3346"), 13, false);
    const [x, y] = at2(o, i + 0.5, j + 0.9); rect(c, x - 4, y - 10, 8, 5, P.ink); rect(c, x - 3, y - 9, 6, 3, "#5e5a66");
    const [cx, cy] = at2(o, i + 0.4, j + 0.4); rect(c, cx - 3, cy - 18, 6, 4, "#8e95a3"); if (Math.floor(t * 2) % 2) px(c, cx, cy - 20, "rgba(255,255,255,0.7)");
  } },
  { id: "buzdolabi", noun: "Buzdolabı", cat: "Mutfak", scope: "oda", size: [1, 1], pals: TONES, draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.12, j + 0.12, 0.76, 0.76, 28, shade(p));
    const [x, y] = at2(o, i + 0.5, j + 0.88); line(c, [x - 5, y - 18], [x + 1, y - 21], 1, "rgba(26,20,38,0.4)"); rect(c, x - 3, y - 14, 1, 4, "#c8ccd8"); rect(c, x - 3, y - 24, 1, 3, "#c8ccd8");
    px(c, x - 1, y - 20, "#e48aa0"); px(c, x + 1, y - 21, "#f3d48a"); // magnetler
  } },
  { id: "tezgah", noun: "Mutfak Tezgâhı", cat: "Mutfak", scope: "oda", size: [1, 1], pals: TONES, draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.05, j + 0.05, 0.9, 0.9, 12, shade(p));
    box(c, o, i, j, 1, 1, 2, shade("#c8c0b0"), 12);
    const [x, y] = at2(o, i + 0.5, j + 0.5); rect(c, x - 4, y - 16, 4, 2, "#b88a5c"); disc(c, x + 3, y - 16, 2, "#d8485a"); px(c, x + 3, y - 19, "#4f7a4f");
  } },
  { id: "evye", noun: "Evye", cat: "Mutfak", scope: "oda", size: [1, 1], pals: TONES, draw: (c, o, i, j, t, p) => {
    box(c, o, i + 0.05, j + 0.05, 0.9, 0.9, 12, shade(p));
    box(c, o, i, j, 1, 1, 2, shade("#c8c0b0"), 12); box(c, o, i + 0.25, j + 0.25, 0.5, 0.5, 1, shade("#8eb8d0"), 13, false);
    const [x, y] = at2(o, i + 0.3, j + 0.3); rect(c, x, y - 22, 1, 7, "#c8ccd8"); rect(c, x, y - 22, 4, 1, "#c8ccd8");
    if (Math.floor(t * 3) % 3 === 0) px(c, x + 3, y - 19, "#bfe6f5");
  } },
  { id: "kuvet", noun: "Küvet", cat: "Banyo", scope: "oda", size: [2, 1], pals: TONES, draw: (c, o, i, j, t, p) => {
    box(c, o, i + 0.05, j + 0.1, 1.9, 0.8, 9, shade("#f8f8f8"));
    box(c, o, i + 0.2, j + 0.22, 1.6, 0.56, 1, shade("#a8d8ea"), 8, false);
    const [x, y] = at2(o, i + 1.2, j + 0.5);
    for (let k = 0; k < 4; k++) { const q = (t * 0.5 + k / 4) % 1; disc(c, x - 6 + k * 4, y - 11 - Math.round(q * 6), 1, `rgba(255,255,255,${(1 - q).toFixed(2)})`); }
    rect(c, x - 9, y - 9, 3, 2, "#f3d48a"); px(c, x - 7, y - 10, "#c89a3e"); // lastik ördek
    void p;
  } },
  { id: "lavabo", noun: "Aynalı Lavabo", cat: "Banyo", scope: "oda", size: [1, 1], pals: TONES, draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.2, j + 0.2, 0.6, 0.6, 10, shade(p));
    box(c, o, i + 0.15, j + 0.15, 0.7, 0.7, 2, shade("#f8f8f8"), 10);
    const [x, y] = at2(o, i + 0.5, j + 0.2); rect(c, x - 4, y - 28, 8, 10, P.ink); rect(c, x - 3, y - 27, 6, 8, "#bfe6f5"); px(c, x - 2, y - 26, "#ffffff");
  } },
  { id: "havluluk", noun: "Havluluk", cat: "Banyo", scope: "oda", size: [1, 1], pals: FAB.slice(0, 3), draw: (c, o, i, j, _t, p) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5); rect(c, x - 5, y - 20, 1, 20, "#c8ccd8"); rect(c, x + 4, y - 20, 1, 20, "#c8ccd8"); rect(c, x - 5, y - 20, 10, 1, "#c8ccd8");
    rect(c, x - 4, y - 19, 8, 11, P.ink); rect(c, x - 3, y - 19, 6, 10, p); rect(c, x - 3, y - 11, 6, 1, shade(p, 0.3).top);
  } },
  { id: "yazi-masasi", noun: "Yazı Masası", cat: "Çalışma", scope: "oda", size: [2, 1], pals: WOODS.slice(0, 3), draw: (c, o, i, j, t, p) => {
    box(c, o, i + 0.05, j + 0.15, 0.5, 0.7, 10, shade(p)); box(c, o, i + 1.45, j + 0.15, 0.5, 0.7, 10, shade(p));
    box(c, o, i, j + 0.1, 2, 0.8, 2, shade(p), 10);
    const [x, y] = at2(o, i + 1, j + 0.5); rect(c, x - 4, y - 14, 7, 2, P.cream); rect(c, x + 5, y - 17, 1, 5, "#2a1c3a"); px(c, x + 5, y - 18, "#f3d48a");
    rect(c, x - 9, y - 15, 2, 3, P.cream); if (Math.floor(t * 2) % 2) px(c, x - 8, y - 17, P.amber);
  } },
  { id: "kure", noun: "Dünya Küresi", cat: "Çalışma", scope: "oda", size: [1, 1], pals: [{ name: "Antika", c: "#5a9ac8" }], draw: (c, o, i, j, t) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5); rect(c, x - 3, y - 2, 6, 2, P.woodDk); rect(c, x, y - 9, 1, 7, P.woodDk);
    disc(c, x, y - 15, 6, P.ink); disc(c, x, y - 15, 5, "#5a9ac8"); const r = Math.floor(t * 2) % 6; rect(c, x - 3 + r % 4, y - 17, 3, 3, "#5f9e6e"); rect(c, x + 1 - r % 3, y - 13, 2, 2, "#5f9e6e");
  } },
  { id: "teleskop", noun: "Teleskop", cat: "Çalışma", scope: "oda", size: [1, 1], pals: [{ name: "Pirinç", c: "#c89a3e" }], draw: (c, o, i, j) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5); line(c, [x, y - 10], [x - 4, y], 1, P.woodDk); line(c, [x, y - 10], [x + 4, y], 1, P.woodDk); line(c, [x, y - 10], [x, y], 1, P.woodDk);
    line(c, [x - 5, y - 8], [x + 6, y - 16], 4, P.ink); line(c, [x - 5, y - 8], [x + 6, y - 16], 2, "#c89a3e"); px(c, x + 7, y - 17, "#bfe6f5");
  } },
  { id: "piyano", noun: "Piyano", cat: "Salon", scope: "oda", size: [2, 1], pals: [{ name: "Siyah", c: "#2a2533" }, { name: "Beyaz", c: "#e8e0d0" }], draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.05, j + 0.1, 1.9, 0.5, 20, shade(p));
    box(c, o, i + 0.05, j + 0.6, 1.9, 0.3, 2, shade("#f8f8f8"), 10, false);
    for (let k = 0; k < 9; k++) { const [x, y] = at2(o, i + 0.15 + k * 0.2, j + 0.62); rect(c, x, y - 12, 1, 1, P.ink); }
    const [x, y] = at2(o, i + 1, j + 0.3); rect(c, x - 2, y - 24, 1, 3, "#e8e0d0"); px(c, x + 2, y - 25, "#e8e0d0");
  } },
  { id: "saat", noun: "Sarkaçlı Saat", cat: "Salon", scope: "oda", size: [1, 1], pals: WOODS.slice(0, 2), draw: (c, o, i, j, t, p) => {
    box(c, o, i + 0.3, j + 0.3, 0.4, 0.4, 30, shade(p));
    const [x, y] = at2(o, i + 0.5, j + 0.7); disc(c, x, y - 26, 3, "#f2e4c2"); px(c, x, y - 27, P.ink); px(c, x + 1, y - 26, P.ink);
    const sw = Math.round(Math.sin(t * 3) * 2); line(c, [x, y - 20], [x + sw, y - 10], 1, P.gold); disc(c, x + sw, y - 10, 1, P.gold);
  } },
  { id: "akvaryum", noun: "Akvaryum", cat: "Dekor", scope: "oda", size: [2, 1], pals: [{ name: "Tropikal", c: "#3a9aa0" }], draw: (c, o, i, j, t) => {
    box(c, o, i + 0.05, j + 0.2, 1.9, 0.6, 7, shade("#6b4a35"));
    box(c, o, i + 0.1, j + 0.25, 1.8, 0.5, 12, { top: "rgba(160,220,240,0.6)", left: "rgba(90,170,210,0.75)", right: "rgba(70,140,190,0.75)" }, 7);
    for (let k = 0; k < 3; k++) { const [x, y] = at2(o, i + 0.4 + ((t * 0.2 + k * 0.33) % 1) * 1.2, j + 0.75); rect(c, x, y - 13 - k * 3, 3, 2, ["#f0a24a", "#e48aa0", "#f3d48a"][k]); }
    lights.push({ ...{ x: at2(o, i + 1, j + 0.5)[0], y: at2(o, i + 1, j + 0.5)[1] - 12 }, r: 18, color: "120,200,230" });
  } },
  { id: "kedi-agaci", noun: "Kedi Ağacı", cat: "Dekor", scope: "oda", size: [1, 1], pals: FAB.slice(3, 6), draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.15, j + 0.15, 0.7, 0.7, 3, shade(p));
    const [x, y] = at2(o, i + 0.5, j + 0.5); rect(c, x - 1, y - 22, 3, 19, "#c8b088"); for (let k = 0; k < 5; k++) rect(c, x - 1, y - 6 - k * 4, 3, 1, "#a8916a");
    box(c, o, i + 0.25, j + 0.25, 0.5, 0.5, 2, shade(p), 22); px(c, x + 4, y - 14, "#e2b45a"); line(c, [x + 4, y - 13], [x + 4, y - 9], 1, "#c8b088");
  } },
  { id: "samdan", noun: "Şamdan", cat: "Dekor", scope: "oda", size: [1, 1], pals: [{ name: "Altın", c: "#d8a840" }, { name: "Gümüş", c: "#c8ccd8" }], draw: (c, o, i, j, t, p) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5); rect(c, x - 3, y - 2, 6, 2, p); rect(c, x, y - 14, 1, 12, p); rect(c, x - 5, y - 14, 11, 1, p);
    for (const dx of [-5, 0, 5]) { rect(c, x + dx, y - 19, 1, 5, P.cream); const f = Math.round(Math.sin(t * 9 + dx) * 0.7); px(c, x + dx, y - 21 - (f > 0 ? 1 : 0), P.amber); }
    lights.push({ x, y: y - 20, r: 22, color: "240,162,74" });
  } },
  { id: "vazo", noun: "Çiçekli Vazo", cat: "Dekor", scope: "oda", size: [1, 1], pals: FAB.slice(0, 4), draw: (c, o, i, j, t, p) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5); disc(c, x, y - 5, 4, P.ink); disc(c, x, y - 5, 3, p); rect(c, x - 1, y - 11, 3, 4, p);
    const sw = Math.round(Math.sin(t * 2) * 0.6); for (const [dx, col] of [[-3, "#e48aa0"], [0, "#f3d48a"], [3, "#ffffff"]] as const) { line(c, [x, y - 11], [x + dx + sw, y - 17], 1, "#4f7a4f"); px(c, x + dx + sw, y - 18, col); }
  } },
  { id: "gitar", noun: "Gitar", cat: "Dekor", scope: "oda", size: [1, 1], pals: WOODS.slice(0, 2), draw: (c, o, i, j, _t, p) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5); disc(c, x, y - 6, 5, P.ink); disc(c, x, y - 6, 4, p); disc(c, x, y - 6, 1, P.ink);
    rect(c, x - 1, y - 22, 2, 13, P.ink); rect(c, x - 2, y - 25, 4, 3, P.woodDk);
  } },

  /* --------------------------------- bahçe --------------------------------- */
  { id: "lale", noun: "Lale Tarhı", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Kırmızı", c: "#d8485a" }, { name: "Sarı", c: "#f3d48a" }, { name: "Mor", c: "#9a86c4" }, { name: "Beyaz", c: "#ffffff" }], draw: (c, o, i, j, t, p) => {
    box(c, o, i + 0.05, j + 0.05, 0.9, 0.9, 2, shade("#6b4a35"));
    for (let k = 0; k < 6; k++) { const [x, y] = at2(o, i + 0.2 + (k % 3) * 0.3, j + 0.25 + Math.floor(k / 3) * 0.4); const sw = Math.round(Math.sin(t * 2 + k) * 0.6);
      rect(c, x + sw, y - 7, 1, 5, "#4f7a4f"); rect(c, x - 1 + sw, y - 10, 3, 3, p); px(c, x + sw, y - 11, p); }
  } },
  { id: "aycicegi", noun: "Ayçiçekleri", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Altın", c: "#f3c84a" }], draw: (c, o, i, j, t, p) => {
    for (let k = 0; k < 3; k++) { const [x, y] = at2(o, i + 0.25 + k * 0.25, j + 0.5); const sw = Math.round(Math.sin(t * 1.4 + k) * 0.7);
      rect(c, x + sw, y - 18, 1, 18, "#4f7a4f"); disc(c, x + sw, y - 20, 3, p); disc(c, x + sw, y - 20, 1, "#6b4a35"); }
  } },
  { id: "lavanta", noun: "Lavanta Tarhı", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Mor", c: "#9a86c4" }], draw: (c, o, i, j, t, p) => {
    tile(c, o, i + 0.05, j + 0.05, "#5a7a4a", 0.9, 0.9);
    for (let k = 0; k < 8; k++) { const [x, y] = at2(o, i + 0.15 + (k % 4) * 0.22, j + 0.3 + Math.floor(k / 4) * 0.4); const sw = Math.round(Math.sin(t * 2 + k) * 0.6);
      rect(c, x + sw, y - 9, 1, 8, "#5f8a5a"); rect(c, x + sw, y - 12, 1, 4, p); }
  } },
  { id: "cali", noun: "Çalı", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Yeşil", c: "#3f6a44" }, { name: "Çiçekli", c: "#4f7a4f" }, { name: "Böğürtlenli", c: "#2e5240" }], draw: (c, o, i, j, _t, p) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5); disc(c, x, y - 6, 7, P.ink); disc(c, x, y - 6, 6, p); disc(c, x - 2, y - 8, 3, shade(p, 0.25).top);
    if (p === "#4f7a4f") for (const [dx, dy] of [[-3, -7], [2, -9], [4, -4]]) px(c, x + dx, y + dy, "#e48aa0");
    if (p === "#2e5240") for (const [dx, dy] of [[-2, -5], [3, -8], [1, -3]]) px(c, x + dx, y + dy, "#5a2a6a");
  } },
  { id: "meyve-agaci", noun: "Ağaç", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Kiraz", c: "#e8a8b8" }, { name: "Çam", c: "#2e5240" }, { name: "Portakal", c: "#4f7a4f" }, { name: "Söğüt", c: "#6f9a5a" }], draw: (c, o, i, j, t, p) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5); rect(c, x - 2, y - 14, 4, 13, P.ink); rect(c, x - 1, y - 14, 2, 12, P.wood);
    const sw = Math.round(Math.sin(t * 1.2 + i) * 0.7);
    if (p === "#2e5240") { for (let k = 0; k < 3; k++) poly(c, [[x - 9 + k * 2 + sw, y - 12 - k * 7], [x + 9 - k * 2 + sw, y - 12 - k * 7], [x + sw, y - 24 - k * 7]], k % 2 ? "#3f6a44" : p); return; }
    disc(c, x + sw, y - 22, 9, P.ink); disc(c, x + sw, y - 22, 8, p === "#e8a8b8" ? "#d68a9a" : p); disc(c, x - 2 + sw, y - 25, 4, p === "#e8a8b8" ? "#f8c8d4" : shade(p, 0.25).top);
    if (p === "#4f7a4f") for (const [dx, dy] of [[-4, -19], [3, -25], [5, -18]]) px(c, x + dx + sw, y + dy, "#f0a24a");
  } },
  { id: "cit", noun: "Çit", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Beyaz", c: "#f2e4c2" }, { name: "Ahşap", c: "#8c6448" }, { name: "Pembe", c: "#e8b8c4" }], draw: (c, o, i, j, _t, p) => {
    for (let k = 0; k < 4; k++) { const [x, y] = at2(o, i + 0.1 + k * 0.27, j + 0.5); rect(c, x - 1, y - 10, 3, 10, P.ink); rect(c, x, y - 10, 1, 9, p); px(c, x, y - 11, p); }
    const a = at2(o, i + 0.05, j + 0.5), b = at2(o, i + 0.95, j + 0.5); line(c, [a[0], a[1] - 7], [b[0], b[1] - 7], 1, p); line(c, [a[0], a[1] - 3], [b[0], b[1] - 3], 1, p);
  } },
  { id: "salincak", noun: "Salıncak", cat: "Bahçe", scope: "bahce", size: [2, 1], pals: [{ name: "Ahşap", c: "#8c6448" }], draw: (c, o, i, j, t, p) => {
    const a = at2(o, i + 0.2, j + 0.5), b = at2(o, i + 1.8, j + 0.5);
    for (const q of [a, b]) { line(c, [q[0] - 3, q[1]], [q[0], q[1] - 26], 2, p); line(c, [q[0] + 3, q[1]], [q[0], q[1] - 26], 2, p); }
    line(c, [a[0], a[1] - 26], [b[0], b[1] - 26], 2, P.woodDk);
    const sw = Math.round(Math.sin(t * 1.6) * 3); const m = at2(o, i + 1, j + 0.5);
    line(c, [m[0] - 4, m[1] - 25], [m[0] - 4 + sw, m[1] - 8], 1, "#c8b088"); line(c, [m[0] + 4, m[1] - 25], [m[0] + 4 + sw, m[1] - 8], 1, "#c8b088");
    rect(c, m[0] - 6 + sw, m[1] - 8, 13, 2, "#d68a9a");
  } },
  { id: "kus-evi", noun: "Kuş Evi", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Mavi", c: "#6f86d6" }, { name: "Kırmızı", c: "#a8454e" }, { name: "Sarı", c: "#e2b45a" }], draw: (c, o, i, j, t, p) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5); rect(c, x, y - 18, 1, 18, P.woodDk);
    rect(c, x - 4, y - 26, 9, 8, P.ink); rect(c, x - 3, y - 25, 7, 6, p); poly(c, [[x - 6, y - 25], [x + 7, y - 25], [x + 1, y - 31]], "#6b4a35"); disc(c, x + 1, y - 22, 1, P.ink);
    if (Math.floor(t * 0.7) % 3 === 0) { rect(c, x + 6, y - 21, 3, 2, "#e48aa0"); px(c, x + 9, y - 21, P.gold); }
  } },
  { id: "mantar", noun: "Mantar Halkası", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Kırmızı", c: "#c8463a" }], draw: (c, o, i, j, t, p) => {
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; const [x, y] = at2(o, i + 0.5 + Math.cos(a) * 0.32, j + 0.5 + Math.sin(a) * 0.32);
      rect(c, x, y - 3, 1, 3, "#f2e4c2"); rect(c, x - 1, y - 5, 3, 2, p); px(c, x, y - 5, "#ffffff"); }
    if (Math.floor(t * 2) % 4 === 0) { const [x, y] = at2(o, i + 0.5, j + 0.5); px(c, x, y - 8, "#fff6c8"); }
  } },
  { id: "korkuluk", noun: "Korkuluk", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Saman", c: "#e2b45a" }], draw: (c, o, i, j, t, p) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5); rect(c, x, y - 24, 1, 24, P.woodDk); rect(c, x - 8, y - 18, 17, 1, P.woodDk);
    rect(c, x - 4, y - 20, 9, 10, P.ink); rect(c, x - 3, y - 19, 7, 8, "#6f86d6"); disc(c, x, y - 24, 3, p); rect(c, x - 4, y - 28, 9, 2, "#6b4a35");
    const f = Math.round(Math.sin(t * 2)); px(c, x - 8, y - 17 + f, p); px(c, x + 8, y - 17 - f, p);
  } },
  { id: "piknik", noun: "Piknik Örtüsü", cat: "Bahçe", scope: "bahce", size: [2, 2], pals: [{ name: "Kırmızı", c: "#c8463a" }, { name: "Mavi", c: "#6f86d6" }, { name: "Pembe", c: "#e48aa0" }], draw: (c, o, i, j, _t, p) => {
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) tile(c, o, i + 0.1 + a * 0.45, j + 0.1 + b * 0.45, (a + b) % 2 ? p : "#ffffff", 0.45, 0.45);
    const [x, y] = at2(o, i + 1, j + 1); rect(c, x - 5, y - 5, 10, 5, P.ink); rect(c, x - 4, y - 4, 8, 3, "#b88a5c"); line(c, [x - 3, y - 5], [x, y - 9], 1, P.woodDk); line(c, [x + 3, y - 5], [x, y - 9], 1, P.woodDk);
  } },
  { id: "kamp-atesi", noun: "Kamp Ateşi", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Alevli", c: "#f0a24a" }], draw: (c, o, i, j, t) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; disc(c, x + Math.round(Math.cos(a) * 5), y - 1 + Math.round(Math.sin(a) * 2), 1, "#8e95a3"); }
    line(c, [x - 4, y - 1], [x + 3, y - 4], 2, P.woodDk); line(c, [x + 4, y - 1], [x - 3, y - 4], 2, P.wood);
    for (let k = -3; k <= 3; k++) { const h = Math.max(1, Math.round(3 + (Math.sin(t * 8 + k) + 1) * 2 - Math.abs(k))); for (let q = 0; q < h; q++) px(c, x + k, y - 3 - q, q < h * 0.4 ? "#ffe08a" : q < h * 0.75 ? "#f0a24a" : "#c8463a"); }
    lights.push({ x, y: y - 6, r: 34, color: "255,150,70" });
  } },
  { id: "sebze", noun: "Sebze Tarhı", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Domates", c: "#d8485a" }, { name: "Havuç", c: "#f0a24a" }, { name: "Kabak", c: "#e2b45a" }], draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.05, j + 0.05, 0.9, 0.9, 3, shade("#8c6448")); tile(c, o, i + 0.1, j + 0.1, "#5a3a24", 0.8, 0.8);
    for (let k = 0; k < 4; k++) { const [x, y] = at2(o, i + 0.3 + (k % 2) * 0.4, j + 0.3 + Math.floor(k / 2) * 0.4); rect(c, x, y - 6, 1, 3, "#4f7a4f"); px(c, x - 1, y - 6, "#5f9e6e"); rect(c, x - 1, y - 4, 3, 2, p); }
  } },
  { id: "ari-kovani", noun: "Arı Kovanı", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Bal", c: "#e2b45a" }], draw: (c, o, i, j, t, p) => {
    box(c, o, i + 0.25, j + 0.25, 0.5, 0.5, 4, shade("#6b4a35"));
    const [x, y] = at2(o, i + 0.5, j + 0.5); for (let k = 0; k < 4; k++) { rect(c, x - 5 + Math.abs(k - 1.5), y - 7 - k * 3, 11 - Math.abs(k - 1.5) * 2, 3, k % 2 ? "#c89a3e" : p); } disc(c, x, y - 9, 1, P.ink);
    for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2; px(c, x + Math.round(Math.cos(a) * 8), y - 14 + Math.round(Math.sin(a * 1.3) * 4), P.ink); }
  } },
  { id: "yel-degirmeni", noun: "Minik Yel Değirmeni", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Kırmızı", c: "#a8454e" }], draw: (c, o, i, j, t, p) => {
    box(c, o, i + 0.25, j + 0.25, 0.5, 0.5, 18, shade("#e6d3a8")); const [x, y] = at2(o, i + 0.5, j + 0.75);
    poly(c, [[x - 6, y - 19], [x + 6, y - 19], [x, y - 26]], p);
    for (let k = 0; k < 4; k++) { const a = t * 1.5 + k * 1.57; line(c, [x, y - 16], [x + Math.round(Math.cos(a) * 9), y - 16 + Math.round(Math.sin(a) * 9)], 2, "#f2e4c2"); }
    disc(c, x, y - 16, 1, P.ink);
  } },
  { id: "bahce-feneri", noun: "Bahçe Feneri", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Altın", c: "#d8a840" }, { name: "Gümüş", c: "#c8ccd8" }, { name: "Bakır", c: "#c8784a" }], draw: (c, o, i, j, t, p) => {
    const [x, y] = at2(o, i + 0.5, j + 0.5); rect(c, x - 1, y - 18, 2, 18, "#3a3346"); rect(c, x - 3, y - 24, 6, 6, P.ink); rect(c, x - 2, y - 23, 4, 4, "rgba(255,210,140,0.85)");
    rect(c, x - 4, y - 25, 8, 1, p); px(c, x, y - 26, p); const f = Math.round(Math.sin(t * 9) * 0.6); px(c, x, y - 21 - (f > 0 ? 1 : 0), P.amber);
    lights.push({ x, y: y - 21, r: 22, color: "255,200,120" });
  } },
  { id: "bahce-banki", noun: "Bank", cat: "Bahçe", scope: "bahce", size: [2, 1], pals: WOODS.slice(0, 3), draw: (c, o, i, j, _t, p) => {
    for (const a of [0.15, 1.75]) box(c, o, i + a, j + 0.3, 0.1, 0.4, 6, shade("#3a3346"), 0, false);
    box(c, o, i + 0.05, j + 0.25, 1.9, 0.5, 2, shade(p), 6); box(c, o, i + 0.05, j + 0.15, 1.9, 0.12, 8, shade(p), 6);
  } },
  { id: "kedi-heykeli", noun: "Düldül Heykeli", cat: "Bahçe", scope: "bahce", size: [1, 1], pals: [{ name: "Taş", c: "#9aa0ae" }, { name: "Altın", c: "#d8a840" }], draw: (c, o, i, j, _t, p) => {
    box(c, o, i + 0.2, j + 0.2, 0.6, 0.6, 7, shade("#7d7884"));
    const [x, y] = at2(o, i + 0.5, j + 0.5); rect(c, x - 4, y - 15, 8, 8, P.ink); rect(c, x - 3, y - 14, 6, 6, p); rect(c, x - 3, y - 19, 6, 5, P.ink); rect(c, x - 2, y - 18, 4, 3, p);
    px(c, x - 3, y - 20, p); px(c, x + 2, y - 20, p); line(c, [x + 4, y - 9], [x + 7, y - 14], 1, p);
  } },
  { id: "havuzcuk", noun: "Nilüferli Havuzcuk", cat: "Bahçe", scope: "bahce", size: [2, 2], pals: [{ name: "Mavi", c: "#4a8ab8" }], draw: (c, o, i, j, t, p) => {
    box(c, o, i + 0.05, j + 0.05, 1.9, 1.9, 3, shade("#8e95a3")); tile(c, o, i + 0.25, j + 0.25, (Math.floor(t * 1.5) % 2) ? p : "#5a9ac8", 1.5, 1.5);
    const [x, y] = at2(o, i + 1, j + 1); rect(c, x - 4, y - 4, 4, 2, "#4f7a4f"); px(c, x - 2, y - 5, "#e48aa0"); rect(c, x + 3, y - 2, 3, 1, "#f0a24a");
  } },
];

const order: { tp: GenTmpl; p: Pal; v: number }[] = [];
const maxV = Math.max(...TEMPLATES.map((tp) => tp.pals.length));
for (let v = 0; v < maxV; v++) for (const tp of TEMPLATES) if (v < tp.pals.length) order.push({ tp, p: tp.pals[v], v });

const GENERATED: RoomItem[] = order.map(({ tp, p }, k) => ({
  id: `${tp.id}-${p.name.toLocaleLowerCase("tr").replace(/[^a-z0-9ğüşıöç]/g, "")}`,
  level: Math.min(100, 2 + Math.floor((k * 98) / Math.max(1, order.length - 1))),
  name: tp.pals.length > 1 ? `${p.name} ${tp.noun}` : tp.noun,
  scope: tp.scope, size: tp.size, cat: tp.cat,
  draw: (c: Ctx, o: Origin, i: number, j: number, t: number) => tp.draw(c, o, i, j, t, p.c),
}));

const HANDMADE_CAT: Record<string, Cat> = {
  yatak: "Yatak odası", komodin: "Yatak odası", ayna: "Yatak odası", hali: "Halı", kitaplik: "Çalışma", masa: "Çalışma", saksi: "Bitki",
  sandik: "Dekor", "zirh-askisi": "Dekor", "silah-rafi": "Dekor", "kedi-minderi": "Dekor", kazan: "Dekor", yumurta: "Dekor", somine: "Salon", taht: "Salon",
};
for (const it of HANDMADE) it.cat = it.scope === "bahce" ? "Bahçe" : HANDMADE_CAT[it.id] ?? "Dekor";

export const ROOM_ITEMS: RoomItem[] = [...HANDMADE, ...GENERATED].sort((a, b) => a.level - b.level);

/** Yerde düz duran (üstünden yürünen) eşyalar: halılar, piknik örtüsü */
export const isFlat = (id: string) => id === "hali" || id.startsWith("hali-") || id.startsWith("buyuk-hali-") || id.startsWith("piknik-");

export const itemById = new Map(ROOM_ITEMS.map((it) => [it.id, it]));

// kendi kendini denetler: kimlikler benzersiz, boyutlar sahneye sığar
if (process.env.NODE_ENV !== "production") {
  console.assert(itemById.size === ROOM_ITEMS.length, "eşya kimlikleri benzersiz olmalı");
  console.assert(ROOM_ITEMS.every((it) => it.size[0] >= 1 && it.size[1] >= 1 && it.size[0] <= 3 && it.size[1] <= 3), "eşya boyutu");
  console.assert(ROOM_ITEMS.length >= 150 && ROOM_ITEMS.every((it) => it.level >= 1 && it.level <= 100 && it.cat), "yüzlerce eşya, seviye ve kategori");
}
