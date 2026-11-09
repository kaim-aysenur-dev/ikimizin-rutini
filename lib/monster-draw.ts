// Zindan çizimi: yaratıklar (her türün kendi pikselleri, yürüme sallantısı, vurulunca beyaz parlama, ölünce sönme),
// yaratık mermileri, arena zemini ve duvarları (bölüm temasına göre), çıkış portalı ve Ay Kapısı.
import { lights } from "./env";
import { type Origin, at, box, shade, tile } from "./iso";
import { type Ctx, type V, P, disc, line, poly, px, rect, rnd } from "./pixel";
import { ENEMIES, type Enemy, type EnemyShot, type Stage } from "./dungeon";
import { type DungeonTheme, type Particle, THEMES } from "./dungeon-themes";
import { stageMap } from "./dungeon-map";

const INK = "#1a1420";

/* --------------------------------- yaratıklar --------------------------------- */

export function drawEnemy(c: Ctx, o: Origin, en: Enemy, t: number) {
  const [x0, y] = at(o, en.i, en.j), d = en.dir;
  const dead = en.hp <= 0, fadeK = dead && en.downAt !== undefined ? Math.max(0, 1 - (t - en.downAt) / 0.7) : 1;
  const born = Math.min(1, Math.max(0, (t - en.spawnAt) / 0.4));
  if (born <= 0) return;
  const flash = t - en.hitAt < 0.12;
  const bob = en.moving ? Math.round(Math.abs(Math.sin(en.dist * 0.8)) * 1.5) : Math.round(Math.sin(t * 2 + en.i) * 0.6);
  const x = x0 + (flash ? Math.round(Math.sin(t * 80)) : 0), sc = ENEMIES[en.kind].size * (en.elite ? 1.25 : 1);
  if (en.elite && !dead) { // şefin ayağının altında dönen altın halka
    for (let k = 0; k < 14; k++) { const an = t * 2 + (k / 14) * Math.PI * 2; px(c, Math.round(x0 + Math.cos(an) * 9 * sc), Math.round(y + Math.sin(an) * 3.5 * sc), k % 2 ? "#f3d48a" : "#e2a83e"); }
    lights.push({ x: x0, y: y - 10, r: 22, color: "255,200,90" });
  }
  c.save(); c.globalAlpha = fadeK * born;
  rect(c, x - Math.round(5 * sc), y - 1, Math.round(10 * sc), 2, "rgba(0,0,0,0.35)");
  const step = en.moving ? Math.round(Math.sin(en.dist * 0.8) * 2) : 0;
  if (en.elite) { // şef: aynı çizim 1,25 kat büyük; ışıkları da yerine taşınır
    const n = lights.length;
    c.save(); c.translate(x, y - bob); c.scale(1.25, 1.25); SPRITE[en.kind](c, 0, 0, d, t, step); c.restore();
    for (let k = n; k < lights.length; k++) lights[k] = { ...lights[k], x: x + lights[k].x * 1.25, y: y - bob + lights[k].y * 1.25 };
  } else SPRITE[en.kind](c, x, y - bob, d, t, step);
  if (flash) { c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.5; disc(c, x, y - Math.round(10 * sc), Math.round(7 * sc), "#ffffff"); }
  c.restore();
  // can barı
  if (!dead && en.hp < en.maxHp) {
    const w = Math.round(14 * Math.max(1, sc * 0.9)), top = y - Math.round(28 * sc) - 6;
    rect(c, x - w / 2 - 1, top, w + 2, 3, INK); rect(c, x - w / 2, top + 1, Math.max(0, Math.round(w * (en.hp / en.maxHp))), 1, ENEMIES[en.kind].boss || en.elite ? "#e8304a" : en.hp / en.maxHp > 0.4 ? "#5fae6e" : "#e2a83e");
    if (en.elite) { px(c, x - 2, top - 3, "#f3d48a"); px(c, x, top - 4, "#f3d48a"); px(c, x + 2, top - 3, "#f3d48a"); rect(c, x - 2, top - 2, 5, 1, "#f3d48a"); } // taç
  }
}

type Draw = (c: Ctx, x: number, y: number, d: 1 | -1, t: number, step: number) => void;
const legs = (c: Ctx, x: number, y: number, step: number, col: string, w = 2, gap = 2, h = 5) => {
  rect(c, x - gap - w + 1 + step, y - h, w, h, INK); rect(c, x + gap - 1 - step, y - h, w, h, INK);
  rect(c, x - gap - w + 1 + step, y - h, w - 1 || 1, h - 1, col); rect(c, x + gap - 1 - step, y - h, w - 1 || 1, h - 1, col);
};
const eyes = (c: Ctx, x: number, y: number, d: 1 | -1, col: string, gap = 2) => { px(c, x + d, y, col); px(c, x + d + gap * d, y, col); };

const SPRITE: Record<Enemy["kind"], Draw> = {
  goblin: (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#3a5a2a", 2, 1, 4);
    rect(c, x - 3, y - 11, 7, 7, INK); rect(c, x - 2, y - 10, 5, 5, "#5a3a26"); // yelek
    disc(c, x, y - 15, 4, INK); disc(c, x, y - 15, 3, "#6ab04a");
    poly(c, [[x - 3, y - 16], [x - 8, y - 19], [x - 3, y - 14]], "#6ab04a"); poly(c, [[x + 3, y - 16], [x + 8, y - 19], [x + 3, y - 14]], "#6ab04a"); // sivri kulaklar
    eyes(c, x, y - 16, d, "#ffe040"); px(c, x + d * 2, y - 13, "#f4f0e0");
    line(c, [x + d * 4, y - 9], [x + d * 8, y - 13], 1, "#c8ccd8"); px(c, x + d * 4, y - 8, "#5a3a26"); // hançer
  },
  kurt: (c, x, y, d, t, s) => {
    rect(c, x - 7, y - 9, 14, 6, INK); rect(c, x - 6, y - 8, 12, 4, "#6a6e7a"); rect(c, x - 6, y - 5, 12, 1, "#4a4e5a");
    for (const k of [-5, -2, 2, 5]) { rect(c, x + k + (k % 2 ? s : -s) * 0.5, y - 4, 1, 4, "#4a4e5a"); }
    rect(c, x + d * 5 - 2, y - 13, 6, 6, INK); rect(c, x + d * 5 - 1, y - 12, 4, 4, "#7a7e8a"); rect(c, x + d * 8 - (d > 0 ? 0 : 2), y - 10, 3, 2, "#7a7e8a"); // baş, burun
    px(c, x + d * 4, y - 14, "#7a7e8a"); px(c, x + d * 6, y - 14, "#7a7e8a"); px(c, x + d * 6, y - 11, "#ffe040"); // kulaklar, göz
    line(c, [x - d * 6, y - 8], [x - d * 10, y - 11 + Math.round(Math.sin(t * 6))], 1, "#6a6e7a"); // kuyruk
  },
  orumcek: (c, x, y, d, t, s) => {
    for (let k = 0; k < 4; k++) { const sp = Math.round(Math.sin(t * 10 + k) * 1); for (const sd of [-1, 1]) { line(c, [x + sd * 3, y - 6], [x + sd * (7 + k), y - 9 + k * 2 + sp], 1, INK); line(c, [x + sd * (7 + k), y - 9 + k * 2 + sp], [x + sd * (9 + k), y - 1], 1, INK); } }
    disc(c, x - d * 2, y - 7, 5, INK); disc(c, x - d * 2, y - 7, 4, "#2a2230"); px(c, x - d * 3, y - 9, "#c8463a"); // gövde, kırmızı işaret
    disc(c, x + d * 3, y - 6, 3, INK); disc(c, x + d * 3, y - 6, 2, "#3a3040");
    for (const k of [0, 1, 2]) px(c, x + d * (3 + k), y - 7, "#e83a3a");
  },
  iskelet: (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#d8d4c8", 1, 1, 6);
    rect(c, x - 1, y - 13, 2, 7, "#d8d4c8"); for (let k = 0; k < 3; k++) rect(c, x - 3, y - 12 + k * 2, 6, 1, "#c8c4b8"); // omurga, kaburga
    disc(c, x, y - 17, 4, INK); disc(c, x, y - 17, 3, "#e8e4d8"); px(c, x + d, y - 17, INK); px(c, x + d * 3, y - 17, INK); rect(c, x, y - 15, 3, 1, "#8a8678");
    line(c, [x + d * 2, y - 11], [x + d * 6, y - 8], 1, "#d8d4c8"); line(c, [x + d * 6, y - 8], [x + d * 7, y - 16], 1, "#9aa0ae"); // kılıç
    px(c, x + d, y - 17, "#4ae8a8"); // göz ışığı
  },
  ork: (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#3a3226", 3, 2, 6);
    rect(c, x - 6, y - 16, 12, 11, INK); rect(c, x - 5, y - 15, 10, 9, "#5a7a4a"); rect(c, x - 5, y - 9, 10, 2, "#4a3a2a"); // gövde, kemer
    rect(c, x - 7, y - 16, 4, 3, "#6a6e7a"); rect(c, x + 3, y - 16, 4, 3, "#6a6e7a"); // omuzluk
    disc(c, x, y - 20, 5, INK); disc(c, x, y - 20, 4, "#6a8a5a"); eyes(c, x, y - 21, d, "#e83a3a");
    px(c, x - 1 + d, y - 17, "#f4f0e0"); px(c, x + 1 + d, y - 17, "#f4f0e0"); // dişler
    line(c, [x + d * 6, y - 12], [x + d * 9, y - 22], 2, P.woodDk); poly(c, [[x + d * 8, y - 24], [x + d * 13, y - 22], [x + d * 12, y - 17], [x + d * 9, y - 19]], "#9aa0ae"); // balta
  },
  buyucu: (c, x, y, d, t, s) => {
    poly(c, [[x - 5, y], [x + 5, y], [x + 3, y - 14], [x - 3, y - 14]], INK, 1); poly(c, [[x - 5, y], [x + 5, y], [x + 3, y - 14], [x - 3, y - 14]], "#3a2250");
    poly(c, [[x - 4, y - 14], [x + 4, y - 14], [x - d, y - 24]], INK, 1); poly(c, [[x - 4, y - 14], [x + 4, y - 14], [x - d, y - 24]], "#4a2a6a"); // başlık
    rect(c, x - 2 + d, y - 15, 3, 2, "#0a0610"); px(c, x + d, y - 14, "#c9a6f0"); px(c, x + d * 2, y - 14, "#c9a6f0");
    line(c, [x + d * 5, y], [x + d * 6, y - 20], 1, P.woodDk);
    const g = 0.6 + 0.4 * Math.sin(t * 6); disc(c, x + d * 6, y - 22, 2, `rgba(170,110,255,${g.toFixed(2)})`); px(c, x + d * 6, y - 22, "#ffffff");
    lights.push({ x: x + d * 6, y: y - 22, r: 12, color: "170,110,255" });
  },
  trol: (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#4a5a6a", 4, 3, 8);
    disc(c, x, y - 18, 10, INK); disc(c, x, y - 18, 9, "#5a6e7e"); rect(c, x - 6, y - 12, 12, 3, "#4a3a2a"); // gövde, peştamal
    disc(c, x + d * 3, y - 30, 5, INK); disc(c, x + d * 3, y - 30, 4, "#6a7e8e"); eyes(c, x + d * 2, y - 31, d, "#ffe040");
    rect(c, x + d * 3, y - 27, 3, 1, "#f4f0e0");
    line(c, [x + d * 9, y - 18], [x + d * 13, y - 4], 4, INK); line(c, [x + d * 9, y - 18], [x + d * 13, y - 4], 2, P.woodLt); disc(c, x + d * 13, y - 4, 3, P.woodDk); // sopa
  },
  "kara-sovalye": (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#2a2a34", 2, 2, 6);
    rect(c, x - 5, y - 16, 10, 11, INK); rect(c, x - 4, y - 15, 8, 9, "#3a3a48"); rect(c, x - 4, y - 15, 8, 1, "#5a5a6a");
    rect(c, x - 6, y - 16, 3, 3, "#4a4a5a"); rect(c, x + 3, y - 16, 3, 3, "#4a4a5a");
    rect(c, x - 4, y - 23, 8, 7, INK); rect(c, x - 3, y - 22, 6, 5, "#3a3a48"); rect(c, x - 2 + d, y - 20, 4, 1, "#e83a3a"); // kask ve kızıl göz yarığı
    rect(c, x, y - 26, 1, 3, "#8a1f36");
    line(c, [x + d * 5, y - 10], [x + d * 7, y - 24], 2, "#9aa0ae"); rect(c, x + d * 4 - 1, y - 11, 4, 1, "#e2b45a"); // uzun kılıç
    rect(c, x - d * 8 - 2, y - 15, 5, 7, INK); rect(c, x - d * 8 - 1, y - 14, 3, 5, "#5a1428"); // kalkan
  },
  seytan: (c, x, y, d, t, s) => {
    const fl = Math.sin(t * 8) > 0 ? 1 : 0;
    for (const sd of [-1, 1]) poly(c, [[x + sd * 2, y - 16], [x + sd * (10 + fl), y - 22], [x + sd * 9, y - 12]], "#4a1018"); // kanatlar
    legs(c, x, y, s, "#7a1f20", 2, 2, 6);
    rect(c, x - 4, y - 15, 8, 9, INK); rect(c, x - 3, y - 14, 6, 7, "#b8342a");
    disc(c, x, y - 18, 4, INK); disc(c, x, y - 18, 3, "#c8443a"); eyes(c, x, y - 19, d, "#ffe040");
    poly(c, [[x - 3, y - 21], [x - 5, y - 26], [x - 1, y - 21]], "#f4e0b0"); poly(c, [[x + 3, y - 21], [x + 5, y - 26], [x + 1, y - 21]], "#f4e0b0"); // boynuzlar
    line(c, [x - d * 3, y - 6], [x - d * 8, y - 3], 1, "#b8342a"); px(c, x - d * 9, y - 3, "#b8342a");
    lights.push({ x, y: y - 14, r: 14, color: "255,110,60" });
  },
  hayalet: (c, x, y, d, t, s) => {
    const fy = y - 4 - Math.round(Math.sin(t * 2.5 + x) * 2);
    c.save(); c.globalAlpha *= 0.75;
    disc(c, x, fy - 12, 6, "#c8d8f0"); rect(c, x - 6, fy - 12, 12, 9, "#c8d8f0");
    for (let k = 0; k < 4; k++) rect(c, x - 6 + k * 3, fy - 3 + ((k + Math.floor(t * 4)) % 2), 3, 2, "#c8d8f0"); // dalgalı etek
    rect(c, x - 3 + d, fy - 14, 2, 3, "#1a2440"); rect(c, x + 1 + d, fy - 14, 2, 3, "#1a2440"); rect(c, x - 1 + d, fy - 9, 2, 2, "#1a2440");
    c.restore();
    lights.push({ x, y: fy - 10, r: 16, color: "160,200,255" });
  },
  yarasa: (c, x, y, d, t, s) => {
    const fy = y - 12 - Math.round(Math.sin(t * 6 + x) * 3), up = Math.floor(t * 12 + x) % 2;
    rect(c, x - 2, fy - 2, 5, 4, INK); rect(c, x - 1, fy - 1, 3, 2, "#3a2a3a"); px(c, x + d, fy - 1, "#ff3a4a");
    px(c, x - 1, fy - 3, INK); px(c, x + 1, fy - 3, INK); // kulaklar
    for (const sd of [-1, 1]) { if (up) { line(c, [x + sd * 2, fy - 1], [x + sd * 7, fy - 5], 1, INK); line(c, [x + sd * 7, fy - 5], [x + sd * 6, fy], 1, INK); } else { line(c, [x + sd * 2, fy], [x + sd * 7, fy + 2], 1, INK); line(c, [x + sd * 7, fy + 2], [x + sd * 4, fy + 1], 1, INK); } }
    rect(c, x - 3, y - 1, 6, 1, "rgba(0,0,0,0.25)");
  },
  golem: (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#6a625a", 4, 3, 7);
    rect(c, x - 9, y - 22, 18, 15, INK); rect(c, x - 8, y - 21, 16, 13, "#7a7268"); rect(c, x - 8, y - 21, 16, 2, "#8a8278");
    for (const [a, b] of [[-5, -18], [3, -15], [-2, -12]]) rect(c, x + a, y + b, 3, 1, "#5a524a"); // çatlaklar
    px(c, x - 3, y - 16, "#ffb040"); px(c, x + 2, y - 13, "#ffb040"); // rün ışıkları
    rect(c, x - 12, y - 20, 4, 11, INK); rect(c, x - 11, y - 19, 2, 9, "#6a625a"); rect(c, x + 8, y - 20, 4, 11, INK); rect(c, x + 9, y - 19, 2, 9, "#6a625a"); // kollar
    rect(c, x - 4, y - 28, 8, 6, INK); rect(c, x - 3, y - 27, 6, 4, "#7a7268"); eyes(c, x - 1, y - 26, d, "#ffb040");
    lights.push({ x, y: y - 16, r: 12, color: "255,170,60" });
  },
  buz: (c, x, y, d, t, s) => {
    const fy = y - 4 - Math.round(Math.sin(t * 2 + x) * 2);
    poly(c, [[x, fy - 26], [x + 7, fy - 14], [x + 4, fy - 2], [x - 4, fy - 2], [x - 7, fy - 14]], INK, 1);
    poly(c, [[x, fy - 26], [x + 7, fy - 14], [x + 4, fy - 2], [x - 4, fy - 2], [x - 7, fy - 14]], "#8ad8ff");
    poly(c, [[x, fy - 26], [x + 3, fy - 14], [x, fy - 4], [x - 3, fy - 14]], "#d8f4ff");
    eyes(c, x - 1, fy - 16, d, "#1a4a7a");
    for (let k = 0; k < 4; k++) { const an = t * 2.5 + k * 1.57; poly(c, [[x + Math.cos(an) * 10, fy - 13 + Math.sin(an) * 4], [x + Math.cos(an) * 12, fy - 16 + Math.sin(an) * 4], [x + Math.cos(an) * 10, fy - 19 + Math.sin(an) * 4]], "#bfe6f5"); } // dönen kristaller
    rect(c, x - 4, y - 1, 8, 2, "rgba(0,0,0,0.25)");
    lights.push({ x, y: fy - 14, r: 18, color: "140,210,255" });
  },
  mantar: (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#d8c8a8", 2, 2, 4);
    rect(c, x - 3, y - 12, 6, 8, INK); rect(c, x - 2, y - 11, 4, 7, "#e8dcc0"); eyes(c, x - 1, y - 9, d, INK);
    const pulse = Math.round(Math.sin(t * 3) * 0.6);
    disc(c, x, y - 15, 8 + pulse, INK); disc(c, x, y - 15, 7 + pulse, "#8a3a8a"); rect(c, x - 8, y - 14, 16, 2, INK); rect(c, x - 7, y - 15, 14, 1, "#8a3a8a");
    for (const [a, b] of [[-4, -18], [2, -19], [4, -15], [-2, -16]]) px(c, x + a, y + b, "#e8dcc0"); // benekler
    for (let k = 0; k < 3; k++) { const q = (t * 0.5 + k / 3) % 1; px(c, x - 5 + k * 5, y - 22 - Math.round(q * 10), `rgba(170,240,100,${(1 - q).toFixed(2)})`); } // sporlar
    lights.push({ x, y: y - 15, r: 12, color: "170,240,100" });
  },
  kurtadam: (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#4a3a30", 3, 2, 7);
    rect(c, x - 5, y - 18, 10, 12, INK); rect(c, x - 4, y - 17, 8, 10, "#6a5446"); rect(c, x - 3, y - 14, 6, 6, "#8a7262"); // kürklü gövde
    rect(c, x + d * 2 - 3, y - 25, 7, 7, INK); rect(c, x + d * 2 - 2, y - 24, 5, 5, "#6a5446"); rect(c, x + d * 5 - (d > 0 ? 0 : 2), y - 21, 3, 2, "#6a5446"); // kurt başı
    px(c, x + d * 1, y - 26, "#6a5446"); px(c, x + d * 3, y - 26, "#6a5446"); px(c, x + d * 3, y - 23, "#ffe040");
    for (const k of [-6, 5]) { line(c, [x + k, y - 15], [x + k + Math.sign(k) * 2, y - 8], 2, "#6a5446"); px(c, x + k + Math.sign(k) * 3, y - 7, "#f4f0e0"); } // pençeler
  },
  vampir: (c, x, y, d, t, s) => {
    const fl = Math.sin(t * 3);
    poly(c, [[x - 3, y - 18], [x + 3, y - 18], [x + 8 + fl, y], [x - 8 - fl, y]], INK, 1); poly(c, [[x - 3, y - 18], [x + 3, y - 18], [x + 8 + fl, y], [x - 8 - fl, y]], "#1a1420"); // pelerin
    poly(c, [[x - 3, y - 18], [x + 3, y - 18], [x + 6 + fl, y], [x - 6 - fl, y]], "#7a1428");
    rect(c, x - 2, y - 17, 4, 12, "#2a2430"); rect(c, x - 1, y - 16, 2, 4, "#e8e4dc");
    disc(c, x, y - 21, 4, INK); disc(c, x, y - 21, 3, "#d8d4e0"); px(c, x + d, y - 22, "#e8203a"); px(c, x + d * 2, y - 22, "#e8203a"); px(c, x + d, y - 19, "#ffffff"); // kızıl gözler, diş
    rect(c, x - 4, y - 25, 9, 2, "#1a1420"); px(c, x, y - 26, "#1a1420"); // saç sivrisi
  },
  mumya: (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#c8b890", 2, 1, 6);
    rect(c, x - 4, y - 17, 8, 11, INK); rect(c, x - 3, y - 16, 6, 10, "#d8c8a0");
    for (let k = 0; k < 5; k++) rect(c, x - 3, y - 15 + k * 2, 6, 1, "#a89870"); // sargılar
    disc(c, x, y - 20, 4, INK); disc(c, x, y - 20, 3, "#d8c8a0"); rect(c, x - 2, y - 21, 5, 1, "#a89870"); px(c, x + d, y - 20, "#4ae8a8");
    line(c, [x + d * 3, y - 14], [x + d * 8, y - 14 + Math.round(Math.sin(t * 2))], 2, "#d8c8a0"); // uzanan kol
    rect(c, x - d * 4, y - 6, 2, 3, "#a89870"); // sarkan sargı
  },
  akrep: (c, x, y, d, t, s) => {
    for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) line(c, [x + sd * 3, y - 4 - k], [x + sd * 8, y - 1 + k * 0 - k], 1, INK);
    rect(c, x - 6, y - 7, 12, 5, INK); rect(c, x - 5, y - 6, 10, 3, "#8a4a1a"); for (let k = -4; k <= 4; k += 3) px(c, x + k, y - 6, "#a85a24");
    const sw = Math.round(Math.sin(t * 4) * 1.5);
    line(c, [x - d * 5, y - 6], [x - d * 8, y - 14], 2, "#8a4a1a"); line(c, [x - d * 8, y - 14], [x - d * 4 + sw, y - 19], 2, "#8a4a1a"); px(c, x - d * 3 + sw, y - 19, "#e8d040"); // kuyruk ve iğne
    for (const sd of [-1, 1]) { rect(c, x + d * 7, y - 7 + sd * 2, 3, 2, INK); px(c, x + d * 8, y - 7 + sd * 2, "#a85a24"); } // kıskaçlar
  },
  harpi: (c, x, y, d, t, s) => {
    const fy = y - 10 - Math.round(Math.sin(t * 5 + x) * 2), up = Math.floor(t * 8 + x) % 2;
    for (const sd of [-1, 1]) poly(c, [[x + sd * 2, fy - 8], [x + sd * 11, fy - (up ? 14 : 4)], [x + sd * 8, fy - 2]], "#6a4a3a");
    rect(c, x - 3, fy - 10, 6, 8, INK); rect(c, x - 2, fy - 9, 4, 6, "#a87a5a");
    disc(c, x, fy - 13, 3, INK); disc(c, x, fy - 13, 2, "#d8b090"); px(c, x + d, fy - 13, "#e83a3a"); rect(c, x - 3, fy - 16, 6, 2, "#3a2a2a"); // saç
    px(c, x - 1, fy - 1, "#e8d040"); px(c, x + 1, fy - 1, "#e8d040"); // pençeler
  },
  minotor: (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#4a3020", 3, 3, 8);
    rect(c, x - 7, y - 21, 14, 14, INK); rect(c, x - 6, y - 20, 12, 12, "#6a4228"); rect(c, x - 4, y - 14, 8, 5, "#8a5a38");
    rect(c, x - 5, y - 9, 10, 3, "#3a2a20"); // peştamal
    rect(c, x + d * 2 - 4, y - 28, 9, 8, INK); rect(c, x + d * 2 - 3, y - 27, 7, 6, "#5a3820"); rect(c, x + d * 5 - (d > 0 ? 0 : 2), y - 24, 3, 3, "#7a5030"); px(c, x + d * 6, y - 23, "#e8d040"); // halka
    for (const sd of [-1, 1]) { line(c, [x + d * 2 + sd * 4, y - 27], [x + d * 2 + sd * 8, y - 31], 2, "#e8dcc0"); } // boynuzlar
    px(c, x + d * 3, y - 25, "#e83a3a");
    line(c, [x + d * 7, y - 16], [x + d * 11, y - 28], 2, P.woodDk); poly(c, [[x + d * 9, y - 31], [x + d * 15, y - 29], [x + d * 13, y - 24], [x + d * 10, y - 26]], "#9aa0ae"); // çift ağızlı balta
  },
  "agac-adam": (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#3a2a1a", 4, 3, 8);
    rect(c, x - 6, y - 26, 12, 19, INK); rect(c, x - 5, y - 25, 10, 17, "#5a4028"); for (let k = 0; k < 4; k++) rect(c, x - 4 + (k % 2) * 3, y - 23 + k * 4, 2, 3, "#4a3220"); // kabuk
    rect(c, x - 2 + d, y - 21, 2, 2, "#ffd040"); rect(c, x + 2 + d, y - 21, 2, 2, "#ffd040"); // parlayan gözler
    const sw = Math.round(Math.sin(t * 1.5) * 1);
    for (const [a, b, l] of [[-5, -25, -10], [5, -26, 10], [0, -26, 0]] as [number, number, number][]) { line(c, [x + a, y + b], [x + a + l * 0.6 + sw, y + b - 7], 2, "#4a3220"); disc(c, x + a + l * 0.6 + sw, y + b - 9, 4, "#2e5a2a"); }
    line(c, [x - 6, y - 18], [x - 11, y - 10], 3, "#5a4028"); line(c, [x + 6, y - 18], [x + 11, y - 10], 3, "#5a4028"); // dal kollar
  },
  "kara-elf": (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#2a2238", 1, 1, 6);
    rect(c, x - 3, y - 16, 6, 10, INK); rect(c, x - 2, y - 15, 4, 8, "#3a2a5a"); rect(c, x - 3, y - 9, 6, 1, "#b8a0ff");
    disc(c, x, y - 19, 3, INK); disc(c, x, y - 19, 2, "#5a4a7a"); rect(c, x - 3, y - 23, 6, 3, "#e8e4f4"); // beyaz saç
    px(c, x - d * 3, y - 20, "#5a4a7a"); px(c, x - d * 4, y - 21, "#5a4a7a"); px(c, x + d, y - 19, "#ffffff"); // sivri kulak
    line(c, [x + d * 5, y - 22], [x + d * 7, y - 15], 1, "#4a3a2a"); line(c, [x + d * 7, y - 15], [x + d * 5, y - 8], 1, "#4a3a2a"); line(c, [x + d * 5, y - 22], [x + d * 5, y - 8], 1, "#c8c0e0"); // yay
  },
  "cehennem-kopegi": (c, x, y, d, t, s) => {
    rect(c, x - 7, y - 9, 14, 6, INK); rect(c, x - 6, y - 8, 12, 4, "#3a1a14");
    for (const k of [-5, -2, 2, 5]) rect(c, x + k + (k % 2 ? s : -s) * 0.5, y - 4, 1, 4, "#2a1210");
    rect(c, x + d * 5 - 2, y - 13, 6, 6, INK); rect(c, x + d * 5 - 1, y - 12, 4, 4, "#3a1a14"); px(c, x + d * 6, y - 11, "#ff6a20"); px(c, x + d * 8, y - 9, "#ffe08a");
    for (let k = 0; k < 4; k++) { const q = (t * 2 + k / 4) % 1; px(c, x - 4 + k * 3, y - 10 - Math.round(q * 6), `rgba(255,120,40,${(1 - q).toFixed(2)})`); } // sırtındaki alevler
    line(c, [x - d * 6, y - 8], [x - d * 10, y - 11], 1, "#ff6a20");
    lights.push({ x, y: y - 8, r: 14, color: "255,110,40" });
  },
  karakoncolos: (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#2a2a2a", 3, 2, 6);
    disc(c, x, y - 15, 9, INK); disc(c, x, y - 15, 8, "#3a3a40"); for (let k = 0; k < 8; k++) px(c, x - 7 + k * 2, y - 8 + (k % 2), "#4a4a52"); // tüylü gövde
    disc(c, x + d * 2, y - 25, 5, INK); disc(c, x + d * 2, y - 25, 4, "#3a3a40"); px(c, x + d, y - 26, "#e8e040"); px(c, x + d * 3, y - 26, "#e8e040");
    rect(c, x + d * 2 - 1, y - 22, 3, 1, "#f4f0e0"); // dişler
    for (const sd of [-1, 1]) line(c, [x + sd * 7, y - 16], [x + sd * 10, y - 6], 2, "#3a3a40"); // uzun kollar
    if (Math.floor(t * 2) % 2) for (let k = 0; k < 3; k++) px(c, x - 6 + k * 6, y - 30 - k, "rgba(240,248,255,0.7)"); // kar
  },
  alkarisi: (c, x, y, d, t, s) => {
    const fy = y - 6 - Math.round(Math.sin(t * 2 + x) * 2);
    c.save(); c.globalAlpha *= 0.85;
    poly(c, [[x - 4, fy - 18], [x + 4, fy - 18], [x + 7, fy], [x - 7, fy]], "#4a6a50"); // yosun yeşili elbise
    disc(c, x, fy - 21, 4, "#c8d8c0"); for (let k = -5; k <= 5; k += 2) line(c, [x + k * 0.6, fy - 24], [x + k, fy - 8], 1, "#2a3a2a"); // uzun saç
    px(c, x + d, fy - 21, "#e83a3a");
    c.restore();
    lights.push({ x, y: fy - 14, r: 14, color: "150,220,160" });
  },
  "buz-devi": (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#5a7a9a", 4, 3, 9);
    rect(c, x - 9, y - 26, 18, 17, INK); rect(c, x - 8, y - 25, 16, 15, "#8ab0d0"); rect(c, x - 8, y - 25, 16, 3, "#c8e0f0");
    rect(c, x - 3, y - 34, 7, 8, INK); rect(c, x - 2, y - 33, 5, 6, "#8ab0d0"); px(c, x + d, y - 31, "#1a4a7a");
    rect(c, x - 2, y - 28, 5, 4, "#e8f4ff"); // buz sakal
    for (const sd of [-1, 1]) { rect(c, x + sd * 11 - 2, y - 24, 4, 12, INK); rect(c, x + sd * 11 - 1, y - 23, 2, 10, "#8ab0d0"); }
    for (let k = 0; k < 3; k++) poly(c, [[x - 6 + k * 6, y - 26], [x - 4 + k * 6, y - 31], [x - 2 + k * 6, y - 26]], "#e8f4ff"); // omuz buzları
    lights.push({ x, y: y - 20, r: 16, color: "160,220,255" });
  },
  golge: (c, x, y, d, t, s) => {
    const fy = y - 8 - Math.round(Math.sin(t * 3 + x) * 2);
    c.save(); c.globalAlpha *= 0.8;
    poly(c, [[x - 5, fy - 16], [x + 5, fy - 16], [x + 8, fy + 2], [x + 3, fy - 2], [x, fy + 3], [x - 3, fy - 2], [x - 8, fy + 2]], "#0a0810"); // yırtık pelerin
    disc(c, x, fy - 18, 5, "#0a0810"); rect(c, x - 2 + d, fy - 19, 2, 1, "#a8c8ff"); rect(c, x + 1 + d, fy - 19, 2, 1, "#a8c8ff");
    for (const sd of [-1, 1]) line(c, [x + sd * 4, fy - 12], [x + sd * 9, fy - 6 + Math.round(Math.sin(t * 4)) ], 1, "#1a1420"); // uzun parmaklar
    c.restore();
    for (let k = 0; k < 3; k++) { const q = (t + k / 3) % 1; px(c, x - 3 + k * 3, fy + 2 + Math.round(q * 3), `rgba(10,8,16,${(0.7 * (1 - q)).toFixed(2)})`); }
  },
  medusa: (c, x, y, d, t, s) => {
    for (let k = 0; k < 4; k++) { const sw = Math.round(Math.sin(t * 3 + k) * 2); rect(c, x - 6 + k * 3 + sw, y - 4 + (k % 2), 4, 3, "#3a6a3a"); } // yılan kuyruk
    rect(c, x - 4, y - 16, 8, 12, INK); rect(c, x - 3, y - 15, 6, 10, "#4a8a4a"); rect(c, x - 3, y - 12, 6, 2, "#e2b45a");
    disc(c, x, y - 20, 4, INK); disc(c, x, y - 20, 3, "#8ac88a"); px(c, x + d, y - 21, "#ffe040"); px(c, x + d * 2, y - 21, "#ffe040");
    for (let k = 0; k < 6; k++) { const an = -Math.PI / 2 + (k - 2.5) * 0.45, sw = Math.sin(t * 5 + k) * 1.5; line(c, [x, y - 22], [Math.round(x + Math.cos(an) * 7 + sw), Math.round(y - 22 + Math.sin(an) * 6)], 1, "#3a8a3a"); px(c, Math.round(x + Math.cos(an) * 7 + sw), Math.round(y - 22 + Math.sin(an) * 6), "#e83a3a"); } // yılan saçlar
    lights.push({ x, y: y - 20, r: 12, color: "110,230,140" });
  },
  tepegoz: (c, x, y, d, t, s) => {
    legs(c, x, y, s, "#7a5a40", 5, 4, 10);
    rect(c, x - 11, y - 32, 22, 22, INK); rect(c, x - 10, y - 31, 20, 20, "#a87a58"); rect(c, x - 10, y - 14, 20, 4, "#5a3a24"); // gövde, kemer
    disc(c, x, y - 40, 9, INK); disc(c, x, y - 40, 8, "#b8886a");
    disc(c, x + d * 2, y - 41, 4, "#f4f0e0"); disc(c, x + d * 3, y - 41, 2, "#e8203a"); px(c, x + d * 3, y - 41, INK); // tek göz
    rect(c, x - 3, y - 35, 7, 1, "#5a3a24");
    line(c, [x + d * 12, y - 26], [x + d * 18, y - 6], 5, INK); line(c, [x + d * 12, y - 26], [x + d * 18, y - 6], 3, "#6a4a30"); disc(c, x + d * 18, y - 6, 4, "#4a3220"); // kocaman sopa
    lights.push({ x: x + d * 3, y: y - 41, r: 14, color: "255,80,80" });
  },
  sahmeran: (c, x, y, d, t, s) => {
    for (let k = 0; k < 6; k++) { const sw = Math.round(Math.sin(t * 2 + k * 0.8) * 2); rect(c, x - 10 + k * 3 + sw, y - 4, 5, 4, k % 2 ? "#d8b030" : "#a87a20"); px(c, x - 9 + k * 3 + sw, y - 4, "#3a2a10"); } // yılan gövde
    rect(c, x - 4, y - 18, 8, 14, INK); rect(c, x - 3, y - 17, 6, 12, "#e8c040"); for (let k = 0; k < 4; k++) rect(c, x - 3, y - 16 + k * 3, 6, 1, "#a87a20");
    disc(c, x, y - 22, 4, INK); disc(c, x, y - 22, 3, "#f0d0a0"); px(c, x + d, y - 23, "#2a8a4a");
    for (const k of [-4, -2, 0, 2, 4]) { px(c, x + k, y - 28, INK); px(c, x + k, y - 27, "#e8d040"); } rect(c, x - 4, y - 26, 9, 1, "#e8d040"); // taç
    for (const sd of [-1, 1]) { const sw = Math.round(Math.sin(t * 3 + sd) * 2); line(c, [x + sd * 4, y - 17], [x + sd * 9, y - 22 + sw], 2, "#a87a20"); disc(c, x + sd * 9, y - 23 + sw, 2, "#e8c040"); px(c, x + sd * 10, y - 24 + sw, "#e83a3a"); } // omuz yılanları
    lights.push({ x, y: y - 18, r: 22, color: "232,200,64" });
  },
  hidra: (c, x, y, d, t, s) => {
    rect(c, x - 11, y - 14, 22, 12, INK); rect(c, x - 10, y - 13, 20, 10, "#2e6a3a"); rect(c, x - 10, y - 6, 20, 3, "#4a8a4a");
    for (const k of [-7, -3, 3, 7]) rect(c, x + k - 1, y - 3, 3, 3, "#2e5a2a");
    for (let k = 0; k < 5; k++) {
      const off = (k - 2) * 5, sw = Math.sin(t * 2 + k * 1.3) * 3, hx = x + off + Math.round(sw), hy = y - 26 - Math.abs(k - 2) * -2 - (k % 2) * 4;
      line(c, [x + off * 0.5, y - 12], [hx, hy + 3], 3, INK); line(c, [x + off * 0.5, y - 12], [hx, hy + 3], 2, "#3a7a44");
      rect(c, hx - 3, hy - 2, 7, 5, INK); rect(c, hx - 2, hy - 1, 5, 3, "#4a8a4a"); px(c, hx + d, hy - 1, "#ffe040"); px(c, hx + d * 3, hy + 1, "#e83a3a");
    }
    lights.push({ x, y: y - 22, r: 18, color: "110,230,120" });
  },
  kraken: (c, x, y, d, t, s) => {
    for (let k = 0; k < 7; k++) {
      const an = Math.PI + (k / 6) * Math.PI, sw = Math.sin(t * 2 + k) * 4, ex = x + Math.cos(an) * (16 + sw), ey = y - 6 + Math.sin(an) * 4 - Math.abs(Math.sin(t * 2.5 + k)) * 10;
      line(c, [x + Math.cos(an) * 6, y - 8], [ex, ey], 3, INK); line(c, [x + Math.cos(an) * 6, y - 8], [ex, ey], 2, "#8a3a5a"); px(c, Math.round(ex), Math.round(ey), "#e8a0b8");
    }
    disc(c, x, y - 18, 11, INK); disc(c, x, y - 18, 10, "#9a4a6a"); disc(c, x - 3, y - 22, 4, "#b86a8a");
    disc(c, x - 4, y - 16, 3, "#ffe040"); disc(c, x + 4, y - 16, 3, "#ffe040"); px(c, x - 4, y - 16, INK); px(c, x + 4, y - 16, INK);
    lights.push({ x, y: y - 16, r: 22, color: "90,160,220" });
  },
  "kum-solucani": (c, x, y, d, t, s) => {
    const rise = Math.round(Math.abs(Math.sin(t * 1.2)) * 6);
    for (let k = 0; k < 6; k++) { const yy = y - 4 - k * 5 - rise * (k / 6), xx = x + Math.round(Math.sin(t * 2 + k * 0.6) * 3); disc(c, xx, yy, 7 - k * 0.3, INK); disc(c, xx, yy, 6 - k * 0.3, k % 2 ? "#c8a060" : "#b08848"); }
    const hy = y - 34 - rise;
    disc(c, x, hy, 8, INK); disc(c, x, hy, 7, "#a87a40"); disc(c, x + d * 2, hy, 5, "#3a1a10"); // açık ağız
    for (let k = 0; k < 8; k++) { const an = (k / 8) * Math.PI * 2; px(c, Math.round(x + d * 2 + Math.cos(an) * 4), Math.round(hy + Math.sin(an) * 4), "#f4f0e0"); } // diş halkası
    for (let k = 0; k < 6; k++) { const q = (t + k / 6) % 1; px(c, x - 10 + k * 4, y - Math.round(q * 6), `rgba(200,170,110,${(1 - q).toFixed(2)})`); } // kum
  },
  anka: (c, x, y, d, t, s) => {
    const fy = y - 18 - Math.round(Math.sin(t * 2) * 3), flap = Math.sin(t * 5) * 6;
    for (const sd of [-1, 1]) { poly(c, [[x + sd * 3, fy - 4], [x + sd * 22, fy - 14 - flap], [x + sd * 18, fy + 2], [x + sd * 6, fy + 2]], "#e86a1a"); poly(c, [[x + sd * 6, fy - 4], [x + sd * 18, fy - 10 - flap], [x + sd * 14, fy]], "#ffd040"); }
    disc(c, x, fy, 6, INK); disc(c, x, fy, 5, "#ff9a2a"); disc(c, x + d * 6, fy - 8, 4, INK); disc(c, x + d * 6, fy - 8, 3, "#ffb040");
    px(c, x + d * 7, fy - 9, "#2a8a4a"); poly(c, [[x + d * 9, fy - 8], [x + d * 13, fy - 7], [x + d * 9, fy - 6]], "#e8c040"); // zümrüt göz, gaga
    for (let k = 0; k < 3; k++) line(c, [x - d * 4, fy + 2], [x - d * (10 + k * 3), fy + 10 + k * 2], 1, k % 2 ? "#2a8a4a" : "#ffd040"); // kuyruk tüyleri
    for (let k = 0; k < 6; k++) { const q = (t * 1.5 + k / 6) % 1; px(c, x - 12 + k * 5, fy + 6 + Math.round(q * 12), `rgba(255,170,60,${(1 - q).toFixed(2)})`); }
    lights.push({ x, y: fy - 4, r: 34, color: "255,170,60" });
  },
  lich: (c, x, y, d, t, s) => {
    poly(c, [[x - 7, y], [x + 7, y], [x + 4, y - 18], [x - 4, y - 18]], INK, 1); poly(c, [[x - 7, y], [x + 7, y], [x + 4, y - 18], [x - 4, y - 18]], "#2a1838");
    rect(c, x - 5, y - 9, 10, 1, "#7ae8c8");
    disc(c, x, y - 22, 5, INK); disc(c, x, y - 22, 4, "#e8e4d8"); rect(c, x - 2 + d, y - 23, 2, 2, "#0a2018"); px(c, x + d, y - 23, "#7ae8c8"); px(c, x + d * 3, y - 23, "#7ae8c8");
    for (const k of [-4, -2, 0, 2, 4]) { px(c, x + k, y - 28, INK); px(c, x + k, y - 27, "#e2b45a"); } rect(c, x - 4, y - 26, 9, 1, "#e2b45a"); // taç
    line(c, [x + d * 8, y], [x + d * 9, y - 28], 1, "#3a2a20"); disc(c, x + d * 9, y - 30, 3, "#7ae8c8");
    for (let k = 0; k < 6; k++) { const an = t * 1.6 + k; px(c, Math.round(x + Math.cos(an) * 11), Math.round(y - 14 + Math.sin(an) * 5), "#7ae8c8"); }
    lights.push({ x, y: y - 18, r: 24, color: "110,230,200" });
  },
  ejderha: (c, x, y, d, t, s) => {
    const fl = Math.sin(t * 3) * 3;
    for (const sd of [-1, 1]) { poly(c, [[x + sd * 4, y - 24], [x + sd * 26, y - 38 - fl], [x + sd * 22, y - 16], [x + sd * 8, y - 14]], INK, 1); poly(c, [[x + sd * 4, y - 24], [x + sd * 26, y - 38 - fl], [x + sd * 22, y - 16], [x + sd * 8, y - 14]], "#6a1a1a"); }
    disc(c, x, y - 16, 12, INK); disc(c, x, y - 16, 11, "#a82a22"); rect(c, x - 8, y - 12, 16, 4, "#d8a840"); // gövde, karın
    for (const k of [-6, 6]) rect(c, x + k - 2 + (k > 0 ? -s : s), y - 6, 4, 6, "#7a1a14");
    line(c, [x - d * 10, y - 10], [x - d * 22, y - 4], 3, "#a82a22"); px(c, x - d * 23, y - 5, "#f4e0b0"); // kuyruk
    const hx = x + d * 14, hy = y - 30;
    line(c, [x + d * 6, y - 22], [hx, hy], 4, "#a82a22"); disc(c, hx, hy, 5, INK); disc(c, hx, hy, 4, "#b8342a");
    rect(c, hx + d * 3 - (d > 0 ? 0 : 3), hy, 4, 3, "#b8342a"); px(c, hx + d, hy - 2, "#ffe040");
    poly(c, [[hx - 2, hy - 4], [hx - 4, hy - 9], [hx, hy - 5]], "#f4e0b0");
    lights.push({ x: hx, y: hy, r: 22, color: "255,140,60" });
  },
  "kan-lordu": (c, x, y, d, t, s) => {
    const wave = Math.sin(t * 3);
    poly(c, [[x - 4, y - 18], [x + 4, y - 18], [x + 9 + wave, y], [x - 9 - wave, y]], INK, 1); poly(c, [[x - 4, y - 18], [x + 4, y - 18], [x + 9 + wave, y], [x - 9 - wave, y]], "#5a0a18"); // pelerin
    rect(c, x - 3, y - 18, 6, 14, "#1a1420"); rect(c, x - 1, y - 16, 2, 10, "#8a1f36");
    disc(c, x, y - 22, 4, INK); disc(c, x, y - 22, 3, "#e8dcd8"); eyes(c, x, y - 23, d, "#ff2040"); px(c, x + d, y - 20, "#f4f0e0");
    rect(c, x - 3, y - 27, 7, 2, "#2a1420"); px(c, x - 3, y - 28, "#2a1420"); px(c, x + 3, y - 28, "#2a1420"); // sivri yaka
    for (let k = 0; k < 5; k++) { const q = (t * 0.6 + k / 5) % 1; px(c, x - 8 + k * 4, y - 4 - Math.round(q * 20), `rgba(232,48,74,${(1 - q).toFixed(2)})`); }
    lights.push({ x, y: y - 16, r: 26, color: "232,48,74" });
  },
};

export function drawEnemyShot(c: Ctx, o: Origin, s: EnemyShot, t: number) {
  const [x, y] = at(o, s.i, s.j), h = y - 12;
  disc(c, x, h, 3, INK); disc(c, x, h, 2, s.color); px(c, x, h, "#ffffff");
  for (let k = 1; k < 4; k++) px(c, Math.round(x - s.vi * k * 0.9 + s.vj * k * 0.9), Math.round(h - (s.vi + s.vj) * k * 0.45), s.color);
  const rgb = parseInt(s.color.slice(1), 16);
  lights.push({ x, y: h, r: 14, color: `${(rgb >> 16) & 255},${(rgb >> 8) & 255},${rgb & 255}` });
}

/* ---------------------------------- arena ---------------------------------- */

/** Arena zemini: haritanın her karesi temasının renginde; lav, zehir ve kan gölleri dalgalanır, uçurum karanlık, köprü kalaslı */
export function drawArena(c: Ctx, o: Origin, t: number, stage: Stage) {
  const th = THEMES[stage.theme], m = stageMap(stage), H = 44;
  c.fillStyle = "#08060c"; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  const wf = shade(th.wall, 0.12, 0.22);
  box(c, o, -0.5, -0.5, m.w + 0.5, 0.5, H, wf, 0, false); box(c, o, -0.5, 0, 0.5, m.d, H, wf, 0, false);
  const W = c.canvas.width, Hh = c.canvas.height;
  for (let i = 0; i < m.w; i++) for (let j = 0; j < m.d; j++) {
    const [sx, sy] = at(o, i + 0.5, j + 0.5);
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > Hh + 40) continue; // ekran dışı çizilmez (büyük tünellerde)
    const ch = stage.map[j]?.[i] ?? ".";
    floorTile(c, o, i, j, ch, th, t);
  }
  // giriş kapısı ve arka duvar meşaleleri
  const [ex, ey] = at(o, 0, m.start[1]);
  rect(c, ex - 8, ey - 28, 14, 26, INK); rect(c, ex - 7, ey - 27, 12, 25, "#2a3a6a");
  for (let k = 0; k < Math.floor(m.w / 5); k++) { const [x, y] = at(o, 2.5 + k * 5, 0); torchAt(c, x, y - 24, t, th.light); }
  for (let k = 0; k < Math.floor(m.d / 5); k++) { const [x, y] = at(o, 0, 2.5 + k * 5); torchAt(c, x, y - 24, t, th.light); }
}

function floorTile(c: Ctx, o: Origin, i: number, j: number, ch: string, th: DungeonTheme, t: number) {
  const chk = (i + j) % 2, [x, y] = at(o, i + 0.5, j + 0.5);
  if (ch === "#") { tile(c, o, i, j, chk ? th.wall : shade(th.wall, 0.06, 0.12).right); return; } // kaya kütlesinin üstü
  if (ch === "~") { // uçurum: kenarı taş, içi karanlık, altında sis
    const ab = th.abyss ?? ["#06060c", "#0a0a14"];
    tile(c, o, i, j, (i * 3 + j + Math.floor(t * (th.abyss ? 1.5 : 0))) % 4 ? ab[0] : ab[1]);
    if ((i + j + Math.floor(t)) % 7 === 0) px(c, x, y, th.abyss ? "rgba(255,255,255,0.35)" : "rgba(140,160,200,0.25)");
    return;
  }
  if (ch === "L") { const hot = Math.sin(t * 2 + i * 0.7 + j) > 0; tile(c, o, i, j, hot ? th.pool[1] : th.pool[0]); if ((i * 5 + j + Math.floor(t * 3)) % 6 === 0) { px(c, x, y - 1, "#ffd040"); px(c, x + 1, y - 2, "#ffe08a"); } lights.push({ x, y, r: 10, color: "255,110,40" }); return; }
  if (ch === "p") { tile(c, o, i, j, (i + j + Math.floor(t * 1.5)) % 3 ? th.pool[0] : th.pool[1]); const q = (t * 0.8 + i * 0.3 + j * 0.7) % 1; if (q < 0.3) { px(c, x - 1, y - Math.round(q * 6), th.pool[1]); } return; }
  if (ch === "=") { tile(c, o, i, j, chk ? "#5a4030" : "#523a2a"); tile(c, o, i, j + 0.45, "#3a281e", 1, 0.1); return; }
  tile(c, o, i, j, chk ? th.floor[0] : th.floor[1]);
  if ((i * 7 + j * 13) % 9 === 0) { px(c, x, y, th.speck); px(c, x + 2, y + 1, "rgba(255,255,255,0.05)"); }
  if (ch === "r") { const g = 0.4 + 0.4 * Math.sin(t * 2 + i + j); rect(c, x - 3, y, 7, 1, `rgba(200,150,255,${g.toFixed(2)})`); rect(c, x, y - 2, 1, 5, `rgba(200,150,255,${g.toFixed(2)})`); }
  if (ch === "i") { tile(c, o, i + 0.1, j + 0.1, "rgba(200,236,255,0.35)", 0.8, 0.8); px(c, x - 2, y - 1, "#ffffff"); }
  if (ch === "w") { for (let r2 = 2; r2 <= 6; r2 += 2) for (let a = 0; a < 6; a++) { const an = (a / 6) * Math.PI * 2; px(c, Math.round(x + Math.cos(an) * r2), Math.round(y + Math.sin(an) * r2 * 0.5), "rgba(230,230,240,0.55)"); } line(c, [x - 6, y], [x + 6, y], 1, "rgba(230,230,240,0.35)"); line(c, [x, y - 3], [x, y + 3], 1, "rgba(230,230,240,0.35)"); }
  if (ch === "E" || ch === "S" || ch === "m" || ch === "B") return;
}

function torchAt(c: Ctx, x: number, y: number, t: number, col: string) {
  rect(c, x - 1, y, 2, 6, P.woodDk); const fl = Math.sin(t * 9 + x) > 0 ? 1 : 0;
  rect(c, x - 1, y - 3 - fl, 3, 3, "#f0a24a"); px(c, x, y - 4 - fl, "#ffe08a");
  lights.push({ x, y: y - 2, r: 30, color: col });
}

/** Haritadaki katı süsler (kaya, ağaç, sütun, mezar...): derinlik sırasıyla çizilmek üzere */
export function arenaProps(stage: Stage): { i: number; j: number; draw: (c: Ctx, o: Origin, t: number) => void }[] {
  const th = THEMES[stage.theme];
  const m = stageMap(stage), rock = (i: number, j: number) => i < 0 || j < 0 || i >= m.w || j >= m.d || stage.map[j][i] === "#";
  // kaya kütlesinin içi blok olarak çizilmez; yalnız yürünür yere bakan kenar duvarlar
  return m.cells.filter((cl) => PROP[cl.ch] && !(cl.ch === "#" && rock(cl.i + 1, cl.j) && rock(cl.i - 1, cl.j) && rock(cl.i, cl.j + 1) && rock(cl.i, cl.j - 1))).map((cl) => ({
    i: cl.i + 0.5, j: cl.j + 0.5,
    draw: (c: Ctx, o: Origin, t: number) => { const [x, y] = at(o, cl.i + 0.5, cl.j + 0.5); PROP[cl.ch]!(c, x, y, t, cl.i * 7 + cl.j * 3, th, o, cl.i, cl.j); },
  }));
}
type Prop = (c: Ctx, x: number, y: number, t: number, k: number, th: DungeonTheme, o: Origin, i: number, j: number) => void;
const PROP: Partial<Record<string, Prop>> = {
  "#": (c, x, y, t, k, th, o, i, j) => { box(c, o, i, j, 1, 1, 22, shade(th.wall, 0.16, 0.26)); if (k % 3 === 0) px(c, x - 3, y - 14, "rgba(255,255,255,0.08)"); },
  o: (c, x, y, t, k, th) => { const col = shade(th.wall, 0.2, 0.2); rect(c, x - 4, y - 30, 8, 30, INK); rect(c, x - 3, y - 29, 6, 28, col.left); rect(c, x - 3, y - 29, 2, 28, col.top); rect(c, x - 5, y - 32, 10, 3, INK); rect(c, x - 4, y - 31, 8, 1, col.top); rect(c, x - 5, y - 2, 10, 2, INK); },
  R: (c, x, y, t, k, th) => {
    if (th.tallRock) { const h = 18 + (k % 3) * 5; poly(c, [[x - 6, y], [x + 6, y], [x + 2, y - h], [x - 2, y - h]], INK, 1); poly(c, [[x - 6, y], [x + 6, y], [x + 2, y - h], [x - 2, y - h]], th.rock); disc(c, x, y - h - 2, 3, INK); disc(c, x, y - h - 2, 2, shade(th.rock, 0.2, 0.3).left); line(c, [x - 3, y - 4], [x - 1, y - h + 4], 1, "rgba(255,255,255,0.15)"); return; } // peri bacası ya da sarkıt
    poly(c, [[x - 7, y], [x - 4, y - 10], [x + 2, y - 13], [x + 7, y], [x + 6, y + 1]], INK, 1); poly(c, [[x - 7, y], [x - 4, y - 10], [x + 2, y - 13], [x + 7, y]], th.rock); line(c, [x - 3, y - 9], [x + 1, y - 12], 1, "rgba(255,255,255,0.15)"); },
  T: (c, x, y, t, k, th) => {
    if (th.tree) { rect(c, x - 1, y - 14, 3, 14, th.tree[0]); const sw = Math.round(Math.sin(t + k)); disc(c, x + sw, y - 20, 8, INK); disc(c, x + sw, y - 20, 7, th.tree[1]); disc(c, x - 2 + sw, y - 23, 4, "rgba(255,255,255,0.06)"); return; }
    rect(c, x - 1, y - 18, 3, 18, INK); rect(c, x, y - 18, 1, 17, "#3a2e2a"); line(c, [x, y - 14], [x - 6, y - 22], 1, "#3a2e2a"); line(c, [x, y - 16], [x + 5, y - 25], 1, "#3a2e2a"); line(c, [x, y - 18], [x + 1, y - 27], 1, "#3a2e2a");
  },
  g: (c, x, y, t, k) => { if (k % 2) { rect(c, x - 3, y - 11, 7, 11, INK); rect(c, x - 2, y - 10, 5, 10, "#5e5a64"); rect(c, x - 1, y - 8, 3, 1, "#3e3a44"); px(c, x, y - 9, "#3e3a44"); } else { rect(c, x - 6, y - 5, 12, 5, INK); rect(c, x - 5, y - 4, 10, 3, "#4a3a2e"); rect(c, x - 1, y - 4, 2, 3, "#8a7a5a"); } },
  x: (c, x, y, t, k) => { if (k % 2) { rect(c, x - 5, y - 9, 10, 9, INK); rect(c, x - 4, y - 8, 8, 7, "#6a4a30"); line(c, [x - 4, y - 8], [x + 3, y - 2], 1, "#4a3220"); } else { rect(c, x - 4, y - 10, 8, 10, INK); rect(c, x - 3, y - 9, 6, 8, "#6a4a30"); rect(c, x - 4, y - 7, 8, 1, "#2a2a2e"); rect(c, x - 4, y - 3, 8, 1, "#2a2a2e"); } },
  f: (c, x, y, t, k, th) => { rect(c, x - 1, y - 10, 2, 10, "#3a3a44"); rect(c, x - 4, y - 12, 8, 3, INK); rect(c, x - 3, y - 12, 6, 2, "#4a4a56"); for (let q = -2; q <= 2; q++) { const h = 3 + Math.round(Math.abs(Math.sin(t * 9 + q + k)) * 4); for (let z = 0; z < h; z++) px(c, x + q, y - 13 - z, z < h / 2 ? "#ffe08a" : "#f08030"); } lights.push({ x, y: y - 15, r: 34, color: th.light }); },
  c: (c, x, y, t, k, th) => { const g = 0.6 + 0.4 * Math.sin(t * 2 + k); poly(c, [[x - 4, y], [x - 2, y - 12], [x, y - 16], [x + 2, y - 10], [x + 5, y]], INK, 1); poly(c, [[x - 4, y], [x - 2, y - 12], [x, y - 16], [x + 2, y - 10], [x + 5, y]], th.crystal); line(c, [x - 1, y - 11], [x, y - 15], 1, "#ffffff"); const rgb = parseInt(th.crystal.slice(1), 16); lights.push({ x, y: y - 8, r: 16 + g * 4, color: `${(rgb >> 16) & 255},${(rgb >> 8) & 255},${rgb & 255}` }); },
  n: (c, x, y, t) => { poly(c, [[x - 9, y], [x + 9, y], [x, y - 16]], INK, 1); poly(c, [[x - 9, y], [x + 9, y], [x, y - 16]], "#6a4a2a"); poly(c, [[x - 2, y], [x + 2, y], [x, y - 7]], "#1a1008"); rect(c, x, y - 20, 1, 5, P.woodDk); rect(c, x + 1, y - 20, 4, 3, Math.sin(t * 4) > 0 ? "#8a1f20" : "#7a1a1a"); },
  h: (c, x, y) => { rect(c, x - 5, y - 18, 10, 18, INK); rect(c, x - 4, y - 17, 8, 16, "#3a2a20"); for (let r2 = 0; r2 < 3; r2++) for (let b2 = 0; b2 < 4; b2++) rect(c, x - 3 + b2 * 2, y - 16 + r2 * 5, 1, 4, ["#6a3a8a", "#2a5a8a", "#8a2a3a", "#4a6a3a"][(b2 + r2) % 4]); },
  u: (c, x, y, t, k, th) => { rect(c, x - 1, y - 10, 3, 10, "#d8c8a8"); const p2 = Math.round(Math.sin(t * 2 + k) * 0.6); disc(c, x, y - 12, 7 + p2, INK); disc(c, x, y - 12, 6 + p2, "#6a2a6a"); rect(c, x - 7, y - 11, 14, 1, INK); for (const [a, b2] of [[-3, -14], [2, -15], [4, -12]]) px(c, x + a, y + b2, th.crystal); lights.push({ x, y: y - 12, r: 14, color: "170,240,100" }); },
  e: (c, x, y, t, k) => { const wob = Math.round(Math.sin(t * 3 + k) * 0.6); disc(c, x, y - 5, 5, INK); disc(c, x, y - 5, 4 + wob, "#e8e0d0"); px(c, x - 1, y - 7, "#ffffff"); line(c, [x - 6, y - 9], [x + 6, y - 1], 1, "rgba(230,230,240,0.4)"); },
  $: (c, x, y, t, k) => { poly(c, [[x - 8, y], [x + 8, y], [x + 3, y - 7], [x - 4, y - 8]], INK, 1); poly(c, [[x - 8, y], [x + 8, y], [x + 3, y - 7], [x - 4, y - 8]], "#d8a840"); rect(c, x - 3, y - 6, 6, 1, "#f8dc88"); for (let q = 0; q < 3; q++) if (Math.floor(t * 2 + q + k) % 3 === 0) px(c, x - 4 + q * 4, y - 5 + (q % 2), "#fff6c8"); },
  Y: (c, x, y, t) => { rect(c, x - 6, y - 24, 12, 24, INK); rect(c, x - 5, y - 23, 10, 22, "#3a2a40"); rect(c, x - 5, y - 10, 10, 2, "#e2b45a"); for (const k2 of [-4, 0, 4]) { px(c, x + k2, y - 26, INK); px(c, x + k2, y - 25, "#e2b45a"); } px(c, x, y - 18, Math.floor(t * 2) % 2 ? "#7ae8c8" : "#4ac8a8"); },
  k: (c, x, y, t) => { rect(c, x - 6, y - 8, 12, 8, INK); rect(c, x - 5, y - 7, 10, 6, "#6a4a2a"); rect(c, x - 6, y - 10, 12, 3, INK); rect(c, x - 5, y - 9, 10, 2, "#8a6a3a"); rect(c, x - 1, y - 7, 2, 3, "#e2b45a"); if (Math.floor(t * 2) % 3 === 0) px(c, x + 4, y - 11, "#fff6c8"); },
  t: (c, x, y, t, k, th) => { rect(c, x - 1, y - 20, 2, 20, P.woodDk); const fl = Math.sin(t * 9 + k) > 0 ? 1 : 0; rect(c, x - 2, y - 24 - fl, 4, 4, "#f0a24a"); px(c, x, y - 25 - fl, "#ffe08a"); lights.push({ x, y: y - 22, r: 30, color: th.light }); },
};

/** Temanın havası: toz, ateş böceği, spor, kül, kar, sis, kıvılcım, kan damlası ya da yaprak (ekran pikseli) */
export function themeParticles(c: Ctx, W: number, H: number, t: number, kind: Particle) {
  const n = kind === "sis" ? 6 : 50;
  if (kind === "sis") {
    for (let k = 0; k < n; k++) { const y = Math.round(H * (0.25 + k * 0.12)), off = ((t * (5 + k * 2) + k * 120) % (W + 220)) - 220; const g = c.createLinearGradient(off, 0, off + 220, 0); g.addColorStop(0, "rgba(160,190,190,0)"); g.addColorStop(0.5, "rgba(160,190,190,0.08)"); g.addColorStop(1, "rgba(160,190,190,0)"); c.fillStyle = g; c.fillRect(off, y, 220, 18); }
    return;
  }
  const style: Record<Exclude<Particle, "sis">, { col: (k: number, q: number) => string; vy: number; vx: number; wob: number }> = {
    toz: { col: () => "rgba(220,210,190,0.25)", vy: 3, vx: 2, wob: 4 },
    atesbocegi: { col: (k) => `rgba(200,255,140,${(0.4 + 0.5 * Math.abs(Math.sin(t * 2 + k))).toFixed(2)})`, vy: -2, vx: 1, wob: 10 },
    spor: { col: () => "rgba(170,240,100,0.45)", vy: -5, vx: 1, wob: 6 },
    kul: { col: (k) => (k % 3 ? "rgba(255,150,60,0.7)" : "rgba(80,70,70,0.6)"), vy: -14, vx: 3, wob: 5 },
    kar: { col: () => "rgba(240,248,255,0.8)", vy: 14, vx: 3, wob: 6 },
    kivilcim: { col: () => "rgba(255,210,120,0.75)", vy: -9, vx: 0, wob: 4 },
    kan: { col: () => "rgba(200,30,50,0.7)", vy: 30, vx: 0, wob: 1 },
    kum: { col: () => "rgba(230,200,140,0.5)", vy: 2, vx: 24, wob: 3 },
    kabarcik: { col: () => "rgba(200,240,255,0.55)", vy: -10, vx: 0, wob: 4 },
    yaprak: { col: () => "rgba(150,110,60,0.6)", vy: 10, vx: 6, wob: 8 },
  };
  const st = style[kind];
  for (let k = 0; k < n; k++) {
    const x = ((rnd(k * 2.3) * W + Math.sin(t * 0.7 + k) * st.wob + t * st.vx) % W + W) % W, y = ((rnd(k * 5.1) * H + t * st.vy * (0.6 + rnd(k))) % H + H) % H;
    px(c, Math.round(x), Math.round(y), st.col(k, 0));
    if (kind === "kan") px(c, Math.round(x), Math.round(y) + 1, "rgba(200,30,50,0.5)");
  }
}

/** Çıkış portalı: bölüm temizlenince haritanın çıkışında döner */
export function drawPortal(c: Ctx, o: Origin, t: number, open: boolean, at2: [number, number]) {
  const [x, y] = at(o, at2[0], at2[1]);
  rect(c, x - 9, y - 30, 18, 30, INK); rect(c, x - 8, y - 29, 16, 28, "#2a2a34");
  if (!open) { rect(c, x - 6, y - 26, 12, 24, "#141018"); return; }
  for (let r2 = 10; r2 > 0; r2 -= 2) { c.fillStyle = `rgba(${120 + r2 * 8},${170 + r2 * 5},255,${(0.15 + (10 - r2) * 0.06).toFixed(2)})`; c.beginPath(); c.ellipse(x, y - 15, r2 * 0.6, r2 * 1.3, 0, 0, Math.PI * 2); c.fill(); }
  for (let k = 0; k < 8; k++) { const an = t * 3 + (k / 8) * Math.PI * 2; px(c, Math.round(x + Math.cos(an) * 6), Math.round(y - 15 + Math.sin(an) * 12), "#e8f0ff"); }
  lights.push({ x, y: y - 15, r: 34, color: "150,190,255" });
}

/** Bahçedeki Ay Kapısı: taş kemer, içinde dönen ay ışığı; geceleri kan kırmızısına döner */
export function drawMoonGate(c: Ctx, o: Origin, i0: number, j0: number, t: number, night: number) {
  const [x, y] = at(o, i0 + 1.5, j0 + 1.5), blood = night > 0.6;
  const sf = shade("#4a4652", 0.14, 0.26);
  box(c, o, i0 + 0.2, j0 + 1, 0.8, 1, 40, sf); box(c, o, i0 + 2, j0 + 1, 0.8, 1, 40, sf);
  poly(c, [[x - 18, y - 40], [x + 18, y - 40], [x + 14, y - 50], [x - 14, y - 50]], INK, 1); poly(c, [[x - 18, y - 40], [x + 18, y - 40], [x + 14, y - 50], [x - 14, y - 50]], "#3a3644");
  const col = blood ? [232, 48, 74] : [150, 180, 255];
  for (let r = 12; r > 0; r -= 2) { c.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${(0.1 + (12 - r) * 0.05).toFixed(2)})`; c.beginPath(); c.ellipse(x, y - 20, r * 0.9, r * 1.6, 0, 0, Math.PI * 2); c.fill(); }
  disc(c, x, y - 46, 4, blood ? "#e8304a" : "#e8ecff"); disc(c, x + 2, y - 47, 3, "#3a3644"); // kemerdeki hilal
  for (let k = 0; k < 10; k++) { const an = t * 1.5 + (k / 10) * Math.PI * 2, rr = 8 + Math.sin(t * 2 + k) * 2; px(c, Math.round(x + Math.cos(an) * rr), Math.round(y - 20 + Math.sin(an) * rr * 1.7), `rgba(255,255,255,${(0.4 + 0.4 * Math.sin(t * 3 + k)).toFixed(2)})`); }
  for (let q = 0; q < 4; q++) { const ph = (t * 0.5 + q / 4) % 1; px(c, x - 8 + q * 5 + Math.round(rnd(q) * 3), y - 4 - Math.round(ph * 30), `rgba(${col[0]},${col[1]},${col[2]},${(1 - ph).toFixed(2)})`); }
  lights.push({ x, y: y - 20, r: 44, color: col.join(",") });
}
