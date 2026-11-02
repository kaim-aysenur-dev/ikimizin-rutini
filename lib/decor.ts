// Odaları "yıllardır içinde yaşanıyor" hissiyle dolduran eşyalar. Hepsi aynı palet ve ölçekte;
// zemine değen her eşya altına kısa bir temas gölgesi alır. Işık soldan (pencereden) gelir.
import { type Ctx, P, line, rect, rnd } from "./pixel";
import { candle, px } from "./env";
import { weather } from "./weather";
import { since } from "./adventures";

export function shadow(c: Ctx, x: number, w: number, floor: number) {
  rect(c, x + 1, floor - 1, w, 1, "rgba(10,8,18,0.35)");
  rect(c, x + 2, floor, w - 2, 1, "rgba(10,8,18,0.2)");
}

// duvar yaşlanması: ölçülü çatlaklar ve nem izleri
export function wallAge(c: Ctx, x0: number, x1: number, y0: number, y1: number, seed: number) {
  for (let i = 0; i < Math.floor((x1 - x0) / 60); i++) {
    const cx = x0 + Math.floor(rnd(seed + i * 3.1) * (x1 - x0)), cy = y0 + Math.floor(rnd(seed + i * 7.7) * (y1 - y0 - 20));
    let x = cx, y = cy;
    for (let k = 0; k < 7; k++) { px(c, x, y, "rgba(30,24,36,0.45)"); x += rnd(seed + i + k) > 0.5 ? 1 : 0; y += 1; }
    // nem izi: duvar dibine doğru koyulaşan leke
    rect(c, cx + 8, y1 - 18, 6, 18, "rgba(40,50,60,0.12)");
    rect(c, cx + 9, y1 - 26, 4, 8, "rgba(40,50,60,0.08)");
  }
}

// pencere ışığında süzülen toz taneleri
export function dust(c: Ctx, x: number, y: number, w: number, h: number, t: number) {
  if (weather.still) return;
  for (let i = 0; i < 9; i++) {
    const dx = (rnd(i * 3.3) * w + Math.sin(t * 0.4 + i) * 4) % w;
    const dy = (rnd(i * 5.1) * h + t * (2 + rnd(i) * 2)) % h;
    px(c, x + Math.round(dx + dy * 0.3), y + Math.round(dy), "rgba(255,240,200,0.55)");
  }
}

// büyük fantastik dünya haritası; dokununca büyür (zoom: 0..1)
export function worldMap(c: Ctx, x: number, y: number, zoom: number) {
  const s = 1 + zoom * 0.6;
  const w = Math.round(56 * s), h = Math.round(36 * s);
  const X = Math.round(x - (w - 56) / 2), Y = Math.round(y - (h - 36) / 2);
  rect(c, X - 2, Y - 2, w + 4, h + 4, P.woodDk);
  rect(c, X, Y, w, h, P.parch);
  // kıyılar, dağlar, orman, nehir, şato
  for (let i = 0; i < w; i++) { const sy = Math.round(h * 0.6 + Math.sin(i * 0.2) * 3 * s); rect(c, X + i, Y + sy, 1, h - sy, "#9fc3d8"); }
  for (let k = 0; k < 5; k++) { const mx = X + Math.round((8 + k * 9) * s), my = Y + Math.round(12 * s); line(c, [mx, my], [mx + Math.round(3 * s), my - Math.round(5 * s)], 1, P.woodDk); line(c, [mx + Math.round(3 * s), my - Math.round(5 * s)], [mx + Math.round(6 * s), my], 1, P.woodDk); }
  for (let k = 0; k < 6; k++) px(c, X + Math.round((30 + k * 3) * s), Y + Math.round(18 * s + (k % 2) * 2), P.forest2);
  line(c, [X + Math.round(20 * s), Y + Math.round(4 * s)], [X + Math.round(26 * s), Y + Math.round(21 * s)], 1, "#6e9bc4");
  rect(c, X + Math.round(44 * s), Y + Math.round(8 * s), Math.round(4 * s), Math.round(4 * s), P.roseDk);
  px(c, X + Math.round(10 * s), Y + Math.round(26 * s), "#c8463a");
  // yol: noktalı rota
  for (let i = 0; i < 8; i++) px(c, X + Math.round((12 + i * 4) * s), Y + Math.round((24 - i * 1.6) * s), "#8a3a3a");
  rect(c, X + w - 8, Y + 2, 6, 6, P.parchDk); px(c, X + w - 5, Y + 3, P.ink); px(c, X + w - 5, Y + 6, P.ink); // pusula
}

export function banner(c: Ctx, x: number, y: number, h: number, t: number) {
  rect(c, x - 2, y - 2, 16, 2, P.woodDk);
  const sway = weather.still ? 0 : Math.round(Math.sin(t * 0.8) * 0.6);
  rect(c, x + sway, y, 12, h, P.roseDk);
  rect(c, x + 1 + sway, y + 1, 10, h - 4, "#7a3b4a");
  rect(c, x + 3 + sway, y + 8, 6, 6, P.gold); rect(c, x + 5 + sway, y + 10, 2, 2, P.roseDk);
  for (let i = 0; i < 12; i += 3) px(c, x + i + sway, y + h, P.gold);
}

// açık kitaplı çalışma masası, tüy kalem, mürekkep; flip: sayfa çevirme (0..1)
export function desk(c: Ctx, x: number, floor: number, t: number, still: boolean, flip: number) {
  shadow(c, x, 34, floor);
  rect(c, x, floor - 14, 34, 3, P.woodLt); rect(c, x, floor - 11, 34, 1, P.woodDk);
  rect(c, x + 2, floor - 11, 3, 11, P.woodDk); rect(c, x + 29, floor - 11, 3, 11, P.woodDk);
  rect(c, x + 6, floor - 9, 12, 5, P.wood); px(c, x + 12, floor - 7, P.gold); // çekmece
  // açık kitap: köşesi zaman zaman kalkar
  rect(c, x + 6, floor - 17, 14, 3, P.ink); rect(c, x + 7, floor - 17, 6, 2, P.cream); rect(c, x + 14, floor - 17, 5, 2, P.cream);
  const corner = !still && (t % 6) < 0.5 ? 1 : 0;
  px(c, x + 18, floor - 18 - corner, P.cream);
  if (flip > 0 && flip < 1) rect(c, x + Math.round(18 - flip * 10), floor - 19 - Math.round(Math.sin(flip * Math.PI) * 3), 1, 3, "#fffaf0");
  // mürekkep ve tüy
  rect(c, x + 23, floor - 17, 3, 3, P.ink); px(c, x + 24, floor - 17, "#3a4a8a");
  line(c, [x + 24, floor - 18], [x + 28, floor - 24], 1, "#efe3c8");
  candle(c, x + 29, floor - 19, t + 3, still);
}

export function armchair(c: Ctx, x: number, floor: number, dir: 1 | -1) {
  shadow(c, x - 8, 18, floor);
  const bx = dir > 0 ? x - 9 : x + 5;
  rect(c, bx, floor - 30, 5, 30, "#4a2f3a"); rect(c, bx, floor - 30, 5, 2, "#6a4a58");
  rect(c, x - 8, floor - 14, 16, 7, "#5a3646"); rect(c, x - 8, floor - 14, 16, 2, "#7a5466");
  rect(c, x - 7, floor - 7, 2, 7, P.woodDk); rect(c, x + 5, floor - 7, 2, 7, P.woodDk);
}

// sandık: open 0..1 kapağı aralar
export function chest(c: Ctx, x: number, floor: number, open = 0) {
  shadow(c, x - 10, 20, floor);
  if (open > 0) { rect(c, x - 10, floor - 12 - Math.round(open * 5), 20, 3, P.woodDk); rect(c, x - 9, floor - 9, 18, 2, "#2a1c16"); px(c, x - 3, floor - 9, P.gold); px(c, x + 2, floor - 9, "#c9a6f0"); }
  else { rect(c, x - 10, floor - 12, 20, 4, P.woodDk); rect(c, x - 9, floor - 12, 18, 1, P.woodLt); }
  rect(c, x - 10, floor - 8, 20, 8, P.ink); rect(c, x - 9, floor - 7, 18, 7, P.wood);
  rect(c, x - 9, floor - 4, 18, 1, P.woodDk); rect(c, x - 1, floor - 6, 2, 3, P.gold);
}

export function bag(c: Ctx, x: number, floor: number) {
  rect(c, x - 4, floor - 7, 9, 7, P.ink); rect(c, x - 3, floor - 6, 7, 6, "#7a4a2a");
  rect(c, x - 3, floor - 6, 7, 2, "#8c5a35"); px(c, x, floor - 5, P.gold); line(c, [x - 3, floor - 7], [x + 1, floor - 10], 1, "#5a3a20");
}

export function blankets(c: Ctx, x: number, y: number) {
  rect(c, x, y - 3, 14, 3, "#5b63c9"); rect(c, x, y - 6, 14, 3, "#b56b7a"); rect(c, x + 1, y - 9, 12, 3, "#5f9e6e");
  for (let i = 1; i < 14; i += 3) { px(c, x + i, y - 2, "#8a90e0"); px(c, x + i, y - 5, "#d08a98"); }
}

export function painting(c: Ctx, x: number, y: number) {
  rect(c, x - 1, y - 1, 16, 12, P.gold); rect(c, x, y, 14, 10, "#2a3a5a");
  rect(c, x, y + 6, 14, 4, P.forest2); rect(c, x + 9, y + 2, 2, 2, "#fff1c4");
  for (let i = 0; i < 14; i++) px(c, x + i, y + 6 - (i % 4 === 0 ? 1 : 0), P.forest);
}

export function statuette(c: Ctx, x: number, floor: number) {
  rect(c, x - 3, floor - 4, 7, 4, P.stoneLt); rect(c, x - 1, floor - 12, 3, 8, "#a8a4b0"); rect(c, x - 2, floor - 15, 5, 3, "#a8a4b0");
  px(c, x - 3, floor - 10, "#a8a4b0"); px(c, x + 3, floor - 10, "#a8a4b0");
}

export function column(c: Ctx, x: number, top: number, floor: number) {
  rect(c, x - 4, top, 9, 3, P.stoneLt); rect(c, x - 3, top + 3, 7, floor - top - 6, P.stone);
  rect(c, x + 2, top + 3, 2, floor - top - 6, P.stoneDk); rect(c, x - 3, top + 3, 1, floor - top - 6, P.stoneLt);
  rect(c, x - 4, floor - 3, 9, 3, P.stoneLt);
}

export function towels(c: Ctx, x: number, floor: number) {
  shadow(c, x - 6, 14, floor);
  rect(c, x - 6, floor - 4, 12, 4, P.cream); rect(c, x - 6, floor - 8, 12, 4, "#b56b7a"); rect(c, x - 5, floor - 11, 10, 3, "#8c7aa8");
  rect(c, x - 6, floor - 2, 12, 1, P.parchDk);
}

export function flask(c: Ctx, x: number, floor: number, col = "#6e9bc4") {
  rect(c, x - 2, floor - 7, 5, 7, P.ink); rect(c, x - 1, floor - 6, 3, 6, col); rect(c, x - 1, floor - 9, 3, 2, P.woodDk);
}

export function bench(c: Ctx, x: number, floor: number, w = 30) {
  shadow(c, x, w, floor);
  rect(c, x, floor - 9, w, 3, P.woodLt); rect(c, x, floor - 6, w, 1, P.woodDk);
  rect(c, x + 2, floor - 6, 2, 6, P.woodDk); rect(c, x + w - 4, floor - 6, 2, 6, P.woodDk);
}

export function jug(c: Ctx, x: number, y: number) {
  rect(c, x - 2, y - 7, 5, 7, P.ink); rect(c, x - 1, y - 6, 3, 5, "#c8a070"); rect(c, x - 1, y - 8, 3, 1, P.ink); px(c, x + 3, y - 5, P.ink);
}

export function bread(c: Ctx, x: number, y: number) {
  rect(c, x - 5, y - 3, 10, 3, "#8a5a30"); rect(c, x - 4, y - 5, 4, 3, "#d8a050"); rect(c, x, y - 6, 4, 4, "#c88a40"); px(c, x + 1, y - 5, "#f0c070");
}

export function cart(c: Ctx, x: number, floor: number) {
  shadow(c, x - 10, 20, floor);
  rect(c, x - 10, floor - 16, 20, 2, P.woodLt); rect(c, x - 10, floor - 8, 20, 2, P.woodLt);
  rect(c, x - 9, floor - 14, 2, 10, P.woodDk); rect(c, x + 7, floor - 14, 2, 10, P.woodDk);
  rect(c, x - 9, floor - 3, 3, 3, P.ink); rect(c, x + 6, floor - 3, 3, 3, P.ink);
  jug(c, x - 4, floor - 16); bread(c, x + 4, floor - 8);
}

export function soapDish(c: Ctx, x: number, y: number) { rect(c, x - 3, y - 1, 7, 1, "#c8d8e0"); rect(c, x - 2, y - 3, 5, 2, "#e8d0a0"); }
export function comb(c: Ctx, x: number, y: number) { rect(c, x - 3, y - 1, 7, 1, P.woodDk); for (let i = -3; i < 4; i += 2) px(c, x + i, y - 2, P.woodDk); }
export function serumShelf(c: Ctx, x: number, y: number) {
  rect(c, x, y, 22, 2, P.woodLt);
  for (const [i, col] of [[1, "#b8743a"], [6, "#e88aa8"], [11, "#7fd1b9"], [16, "#c9a6f0"]] as const) { rect(c, x + i, y - 5, 3, 5, P.ink); rect(c, x + i + 1, y - 4, 1, 3, col); }
}

export function letters(c: Ctx, x: number, y: number) {
  rect(c, x, y - 2, 8, 2, P.cream); rect(c, x + 2, y - 4, 8, 2, "#e6d3a8"); px(c, x + 5, y - 3, "#8a2b2b"); // mühürlü mektup
  rect(c, x + 11, y - 3, 3, 3, P.ink); rect(c, x + 12, y - 5, 1, 2, P.woodDk); // tarih damgası
}

export function logBasket(c: Ctx, x: number, floor: number) {
  shadow(c, x - 7, 14, floor);
  rect(c, x - 7, floor - 8, 14, 8, P.ink); rect(c, x - 6, floor - 7, 12, 7, "#8a6a40");
  for (let i = -6; i < 6; i += 3) rect(c, x + i, floor - 7, 1, 7, "#6a4a28");
  rect(c, x - 5, floor - 11, 10, 3, P.woodDk); rect(c, x - 3, floor - 13, 8, 2, P.wood);
}

export function poker(c: Ctx, x: number, floor: number) {
  rect(c, x - 3, floor - 2, 7, 2, P.ink); rect(c, x, floor - 24, 1, 22, "#3a3a44"); rect(c, x + 1, floor - 24, 2, 1, "#3a3a44");
  rect(c, x + 3, floor - 20, 1, 18, "#3a3a44");
}

export function couchCushions(c: Ctx, x: number, y: number) {
  rect(c, x, y - 5, 7, 5, P.ink); rect(c, x + 1, y - 4, 5, 4, P.gold);
  rect(c, x + 36, y - 5, 7, 5, P.ink); rect(c, x + 37, y - 4, 5, 4, "#5b63c9");
}

// dokununca açılan küçük ayrıntıların zamanlaması (saniye)
export const tapOpen = (key: "map" | "book" | "chest2", t: number, dur = 2.4) => {
  const k = since(key, t);
  return k >= 0 && k < dur ? Math.sin((k / dur) * Math.PI) : 0;
};
