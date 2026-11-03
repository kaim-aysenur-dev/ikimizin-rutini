// Salon dekorları: seviye ödülü çeşitlerinin çizimi (lib/xp.ts SALON_SLOTS). Bir yuvanın açılmış çeşitleri
// salonun bölmelerine sırayla dağılır; böylece açtıkça salon çeşitlenir. Renkler çeşit sırasıyla eşleşir.
import { type Ctx, P, line, rect } from "../pixel";
import { lights, px } from "../env";

const INK = P.ink;
const ring = (c: Ctx, x: number, y: number, r: number, col: string) => {
  for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy)); rect(c, x - hw, y + dy, hw * 2 + 1, 1, col); }
};

const BANNER = ["#7a2a3a", "#2f3b6b", "#2e5a40", "#a87a24", "#5a3a7a", "#1f2133", "#c86a8a", "#8e95a3"];
export function banner(c: Ctx, x: number, top: number, v = 0) {
  const h = 40, col = BANNER[v % BANNER.length];
  rect(c, x - 1, top, 11, h, INK); rect(c, x, top, 9, h - 1, col); rect(c, x + 1, top, 1, h - 2, "rgba(255,255,255,0.15)");
  rect(c, x, top + 3, 9, 1, P.gold); rect(c, x, top + h - 9, 9, 1, P.gold);
  for (let i = 0; i < 4; i++) { px(c, x + i, top + h - 1 + i, INK); px(c, x + 8 - i, top + h - 1 + i, INK); }
  rect(c, x + 3, top + h - 4, 3, 3, "#2a2028");
  px(c, x + 3, top + 14, P.goldLt); px(c, x + 5, top + 14, P.goldLt); rect(c, x + 3, top + 15, 3, 1, P.goldLt); px(c, x + 4, top + 16, P.goldLt);
}

// pano içindeki tablo: pano çerçevesinin iç alanına küçük bir resim
export function painting(c: Ctx, x: number, y: number, w: number, h: number, v: number, t: number) {
  const ix = x + 7, iy = y + 7, iw = w - 14, ih = h - 14;
  const sky = ["#7fb0dc", "#c9a6c8", "#3a3460", "#f2b9a0", "#141a33", "#e3967a", "#5a9ac8", "#4f7a4f", "#0e1328", "#e6d3a8"][v];
  rect(c, ix, iy, iw, ih, sky);
  const cx = ix + Math.floor(iw / 2), base = iy + ih;
  switch (v) {
    case 0: for (let k = 0; k < 3; k++) { const mx = ix + 6 + k * Math.floor(iw / 3); for (let d = 0; d < 12; d++) rect(c, mx - d, base - 12 + d, d * 2 + 1, 1, k % 2 ? "#5e5a66" : "#7d7884"); } rect(c, ix, base - 3, iw, 3, "#4f7a4f"); break;
    case 1: rect(c, cx - 8, base - 14, 16, 14, "#7d7884"); for (let k = 0; k < 4; k++) rect(c, cx - 8 + k * 5, base - 17, 3, 3, "#7d7884"); rect(c, cx - 2, base - 6, 4, 6, "#2a1c3a"); rect(c, ix, base - 2, iw, 2, "#4f7a4f"); break;
    case 2: { const fy = Math.round(Math.sin(t) * 2); rect(c, cx - 7, iy + 10 + fy, 14, 4, "#8e3438"); rect(c, cx - 12, iy + 6 + fy, 8, 3, "#6a1e28"); rect(c, cx + 4, iy + 6 + fy, 8, 3, "#6a1e28"); rect(c, cx + 7, iy + 9 + fy, 4, 3, "#8e3438"); px(c, cx + 10, iy + 9 + fy, "#ffc040"); break; }
    case 3: for (const [dx, dy] of [[-3, 0], [3, 0]]) ring(c, cx + dx, iy + ih / 2 - 2 + dy, 4, "#d8485a"); for (let d = 0; d < 7; d++) rect(c, cx - 7 + d, iy + ih / 2 + d, 15 - d * 2, 1, "#d8485a"); break;
    case 4: ring(c, cx, iy + ih / 2, 7, "#f4efd8"); px(c, cx - 2, iy + ih / 2 - 2, "#d8d0b0"); for (let k = 0; k < 6; k++) px(c, ix + 3 + k * 7, iy + 3 + (k * 5) % 9, "#fff6c8"); break;
    case 5: ring(c, cx, base - 4, 8, "#f6c27a"); rect(c, ix, base - 4, iw, 4, "#8a4d6c"); break;
    case 6: for (let k = 0; k < 4; k++) rect(c, ix, base - 4 - k * 4, iw, 2, k % 2 ? "#3a7ab0" : "#7fc8e8"); rect(c, cx - 3, base - 18, 6, 3, "#f2e4c2"); rect(c, cx, base - 24, 1, 6, "#6b4a35"); break;
    case 7: for (let k = 0; k < 5; k++) { const tx = ix + 4 + k * Math.floor(iw / 5); for (let d = 0; d < 9; d++) rect(c, tx - Math.floor(d / 2), base - 12 + d, d + 1, 1, "#2e5240"); } break;
    case 8: for (let k = 0; k < 14; k++) px(c, ix + 2 + ((k * 13) % (iw - 4)), iy + 2 + ((k * 7) % (ih - 4)), k % 3 ? "#fff6c8" : "#c9a6f0"); line(c, [ix + 4, iy + 6], [ix + 14, iy + 10], 1, "#fff6c8"); break;
    case 9: rect(c, cx - 10, base - 14, 6, 14, "#2f3b6b"); rect(c, cx - 10, base - 20, 6, 6, "#f0c8a0"); rect(c, cx + 4, base - 14, 6, 14, "#b56b7a"); rect(c, cx + 4, base - 20, 6, 6, "#f0c8a0"); rect(c, cx + 3, base - 21, 8, 3, "#4a2840"); rect(c, cx - 10, base - 21, 6, 2, "#2b2238"); px(c, cx, base - 18, "#d8485a"); px(c, cx - 1, base - 19, "#d8485a"); px(c, cx + 1, base - 19, "#d8485a"); break;
  }
}

const GLASS = [["#d8485a", "#f3d48a"], ["#6f86d6", "#bfe6f5"], ["#3f7a4e", "#a8e05a"], ["#e2b45a", "#fff6c8"], ["#6b4a8a", "#c9a6f0"], ["#d8485a", "#6f86d6"]];
export function vitray(c: Ctx, cx: number, cy: number, v: number, t: number) {
  const [a, b] = GLASS[v % GLASS.length];
  ring(c, cx, cy, 7, INK); ring(c, cx, cy, 6, a);
  for (let k = 0; k < 6; k++) { const ang = (k / 6) * Math.PI * 2; line(c, [cx, cy], [cx + Math.round(Math.cos(ang) * 6), cy + Math.round(Math.sin(ang) * 6)], 1, INK); }
  ring(c, cx, cy, 2, b); if (v === 5) { px(c, cx - 3, cy - 3, "#5fae6e"); px(c, cx + 3, cy + 3, "#f3d48a"); }
  lights.push({ x: cx, y: cy, r: 12 + Math.sin(t) * 2, color: "255,230,180" });
}

const CREST = ["#a8352e", "#2f3b6b", "#3f7a4e", "#d8485a", "#5a4f94", "#c89a3e", "#b56b7a", "#d8a840"];
export function crest(c: Ctx, cx: number, cy: number, v: number) {
  const col = CREST[v % CREST.length];
  rect(c, cx - 5, cy - 6, 11, 9, INK); rect(c, cx - 4, cy - 5, 9, 8, col);
  for (let d = 0; d < 4; d++) rect(c, cx - 4 + d, cy + 3 + d, 9 - d * 2, 1, d === 3 ? INK : col);
  rect(c, cx - 4, cy - 5, 9, 1, P.gold);
  const e = P.goldLt;
  if (v === 3) { px(c, cx - 1, cy - 2, e); px(c, cx + 1, cy - 2, e); rect(c, cx - 1, cy - 1, 3, 1, e); px(c, cx, cy, e); }
  else if (v === 4) { ring(c, cx, cy - 1, 2, e); px(c, cx + 1, cy - 2, col); }
  else if (v === 5) { px(c, cx, cy - 3, e); rect(c, cx - 2, cy - 1, 5, 1, e); px(c, cx, cy + 1, e); }
  else { rect(c, cx - 1, cy - 3, 3, 4, e); px(c, cx - 2, cy - 3, e); px(c, cx + 2, cy - 3, e); }
}

const FLAMES = [["#ffe08a", "#f0a24a", "#c8463a"], ["#e8f8ff", "#7fc8e8", "#3a7ab0"], ["#e0ffb0", "#7fd06a", "#2e8a40"], ["#fff6c8", "#f3d48a", "#c89a3e"]];
export function torch(c: Ctx, x: number, y: number, v: number, t: number, still: boolean) {
  const [a, b, d] = FLAMES[v % FLAMES.length];
  rect(c, x - 1, y, 3, 8, "#4a3224"); rect(c, x - 3, y, 7, 2, "#3a3346");
  const f = still ? 0 : Math.round(Math.sin(t * 9 + x) * 0.8);
  rect(c, x - 1, y - 4 - f, 3, 4 + f, b); px(c, x, y - 5 - f, a); px(c, x, y - 1, d);
  lights.push({ x, y: y - 3, r: 22 + f, color: v === 1 ? "130,190,255" : v === 2 ? "150,240,140" : "255,170,90" });
}

const METAL = ["#c89a3e", "#c8ccd8", "#d8a840", "#bfe6f5", "#3a2a40", "#f3d48a"];
export function candelabra(c: Ctx, x: number, fl: number, v: number, t: number, still: boolean) {
  const m = METAL[v % METAL.length];
  rect(c, x - 3, fl - 2, 7, 2, INK); rect(c, x, fl - 22, 1, 20, m); rect(c, x - 5, fl - 22, 11, 1, m); rect(c, x - 5, fl - 25, 1, 3, m); rect(c, x + 5, fl - 25, 1, 3, m);
  for (const dx of [-5, 0, 5]) {
    rect(c, x + dx, fl - 29, 1, 4, P.cream);
    const f = still ? 0 : Math.round(Math.sin(t * 9 + dx + x) * 0.7);
    px(c, x + dx, fl - 31 - (f > 0 ? 1 : 0), P.amber);
  }
  lights.push({ x, y: fl - 30, r: 20, color: "240,162,74" });
}

export function plant(c: Ctx, x: number, fl: number, v: number, t: number) {
  rect(c, x - 5, fl - 8, 11, 8, INK); rect(c, x - 4, fl - 7, 9, 7, "#8a4a2a"); rect(c, x - 4, fl - 7, 9, 1, "#b8603a");
  const sw = Math.round(Math.sin(t * 1.3 + x) * 0.7);
  const leaf = ["#3f6a44", "#3f6a44", "#5a7a4a", "#2e5240", "#4f8a5c", "#7fc8e8"][v];
  for (let k = -3; k <= 3; k++) line(c, [x, fl - 8], [x + k * 2 + sw, fl - 18 - (3 - Math.abs(k)) * 2], 1, leaf);
  if (v === 1) for (const dx of [-4, 1, 4]) { px(c, x + dx + sw, fl - 19, "#d8485a"); px(c, x + dx + sw, fl - 20, "#e48aa0"); }
  if (v === 2) for (let k = -3; k <= 3; k += 2) px(c, x + k * 2 + sw, fl - 21, "#9a86c4");
  if (v === 5) for (let k = -2; k <= 2; k++) px(c, x + k * 2 + sw, fl - 22 - (k % 2), "#e8f8ff");
}

const ARMOR = [["#8e95a3", "#5e6470"], ["#c8ccd8", "#8e95a3"], ["#d8a840", "#a87a24"], ["#bfe6f5", "#7fb0c8"], ["#4a3a56", "#1a1426"], ["#e8d8b0", "#a89870"]];
export function armorStand(c: Ctx, x: number, fl: number, v: number) {
  const [a, b] = ARMOR[v % ARMOR.length];
  rect(c, x - 4, fl - 2, 9, 2, INK); rect(c, x, fl - 12, 1, 10, "#4a3224");
  rect(c, x - 5, fl - 24, 11, 12, INK); rect(c, x - 4, fl - 23, 9, 10, a); rect(c, x + 2, fl - 23, 2, 10, b);
  rect(c, x - 3, fl - 30, 7, 6, INK); rect(c, x - 2, fl - 29, 5, 4, a); rect(c, x - 2, fl - 28, 5, 1, INK);
  rect(c, x - 7, fl - 23, 2, 6, b); rect(c, x + 6, fl - 23, 2, 6, b);
}

const SHELF = ["#a87a50", "#6b4a35", "#3a2a28", "#5a3a7a"];
export function bookshelf(c: Ctx, x: number, fl: number, v: number, t: number) {
  const w = 18, h = 30, col = SHELF[v % SHELF.length];
  rect(c, x - w / 2 - 1, fl - h - 1, w + 2, h + 1, INK); rect(c, x - w / 2, fl - h, w, h, col);
  const books = ["#8a3a4a", "#2f3b6b", "#4f7a4f", "#e2b45a", "#5b4a7a", "#c8784a"];
  for (let s = 0; s < 3; s++) {
    rect(c, x - w / 2, fl - h + 9 + s * 9, w, 1, INK);
    for (let k = 0; k < 7; k++) rect(c, x - w / 2 + 2 + k * 2, fl - h + 3 + s * 9 + (k % 3 === 0 ? 1 : 0), 2, 6 - (k % 3 === 0 ? 1 : 0), books[(k + s * 2) % books.length]);
  }
  if (v === 3 && Math.floor(t * 2) % 3 === 0) { px(c, x - 4, fl - h - 2, "#c9a6f0"); px(c, x + 5, fl - h + 4, "#fff6c8"); }
}

// avize çeşidi: gövde rengi ve ışık
export const CHANDELIER = [
  { body: "#c89a3e", glow: "240,170,90" }, { body: "#c8ccd8", glow: "220,230,255" }, { body: "#bfe6f5", glow: "200,240,255" },
  { body: "#a8352e", glow: "255,140,140" }, { body: "#f3d48a", glow: "255,230,160" },
];

export const FIRE_LIGHT = ["130,190,255", "255,150,200", "150,240,140", "200,150,255"];
export const FIRE_NEW = [["#e8f8ff", "#7fc8e8", "#3a7ab0"], ["#ffe0f0", "#f08ab0", "#c8466a"], ["#e0ffb0", "#7fd06a", "#2e8a40"], ["#f0e0ff", "#b08ae8", "#6a3aa8"]];
export const RUG = ["#2f3b6b", "#2e5a40", "#5a3a7a", "#a87a24"];

const GARLAND = [["#a8352e", "#e2b45a"], ["#2f3b6b", "#f2e4c2"], ["#e8b8c4", "#bfe6f5"], ["#d8485a", "#5fae6e"], ["#e48aa0", "#d8485a"], ["#f3d48a", "#6f86d6"]];
export function garland(c: Ctx, x0: number, x1: number, y: number, v: number) {
  const [a, b] = GARLAND[v % GARLAND.length];
  const sag = (x: number) => y + Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 6);
  for (let x = x0; x < x1; x++) px(c, x, sag(x), "#3a2a28");
  for (let x = x0 + 4, k = 0; x < x1 - 3; x += 7, k++) {
    const yy = sag(x) + 1, col = v === 3 ? ["#d8485a", "#f3d48a", "#5fae6e", "#6f86d6"][k % 4] : k % 2 ? a : b;
    if (v === 4) { px(c, x - 1, yy + 1, col); px(c, x + 1, yy + 1, col); rect(c, x - 1, yy + 2, 3, 1, col); px(c, x, yy + 3, col); }
    else if (v === 5) { px(c, x, yy + 1, col); rect(c, x - 1, yy + 2, 3, 1, col); px(c, x, yy + 3, col); }
    else for (let d = 0; d < 4; d++) rect(c, x - 2 + Math.floor(d / 2), yy + d, 5 - d, 1, col);
  }
}

const IVY = ["#3f6a44", "#3f6a44", "#c89a3e", "#3f6a44"];
export function ivy(c: Ctx, x: number, top: number, fl: number, v: number, t: number) {
  const leaf = IVY[v % IVY.length];
  for (let y = top + 8; y < fl - 6; y += 3) {
    const dx = Math.round(Math.sin(y * 0.3) * 4);
    px(c, x + dx, y, leaf); px(c, x + dx + 1, y + 1, leaf);
    if (v === 1 && y % 12 === 0) px(c, x + dx - 1, y, "#e48aa0");
    if (v === 3 && y % 9 === 0 && Math.floor(t * 2 + y) % 3 === 0) { px(c, x + dx - 1, y, "#fff6c8"); lights.push({ x: x + dx, y, r: 5, color: "255,240,170" }); }
  }
}
