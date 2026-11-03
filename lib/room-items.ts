// Gelişim: odaya ve ortak bahçeye yerleştirilen eşyalar. Seviyeyle envantere düşer, kişi istediği kareye koyar.
// Her eşya izometrik kutulardan ve piksellerden çizilir; (i, j) eşyanın kapladığı alanın üst köşesi.
import { type Origin, at, box, shade, tile } from "./iso";
import { lights } from "./env";
import { type Ctx, P, disc, line, px, rect } from "./pixel";

export type Scope = "oda" | "bahce";
export type RoomItem = { id: string; level: number; name: string; scope: Scope; size: [number, number]; draw: (c: Ctx, o: Origin, i: number, j: number, t: number) => void };

const WOOD = shade("#8c6448"), WOOD_DK = shade("#6b4a35"), STONE = shade("#7d7884"), GOLD = shade("#d8a840");

const flame = (c: Ctx, x: number, y: number, t: number, big = 1) => {
  const f = Math.round(Math.sin(t * 9 + x) * 0.8);
  rect(c, x, y - 2 * big - (f > 0 ? 1 : 0), big, 2 * big, P.amber);
  px(c, x, y - 2 * big - 1 - (f > 0 ? 1 : 0), P.goldLt);
  lights.push({ x, y: y - 2, r: 16 * big + f, color: "240,162,74" });
};

export const ROOM_ITEMS: RoomItem[] = [
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

export const itemById = new Map(ROOM_ITEMS.map((it) => [it.id, it]));

// kendi kendini denetler: kimlikler benzersiz, boyutlar sahneye sığar
if (process.env.NODE_ENV !== "production") {
  console.assert(itemById.size === ROOM_ITEMS.length, "eşya kimlikleri benzersiz olmalı");
  console.assert(ROOM_ITEMS.every((it) => it.size[0] >= 1 && it.size[1] >= 1 && it.size[0] <= 3 && it.size[1] <= 3), "eşya boyutu");
}
