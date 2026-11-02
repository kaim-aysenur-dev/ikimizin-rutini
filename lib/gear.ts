// Hazine: seviyeyle açılan zırhlar, silahlar ve büyüler. Her eşya 24x24 dünya pikselinde elle çizilir;
// büyüler hareketlidir. Kilitli eşyalar sayfada gri siluet olarak görünür (CSS filtresi).
import { type Ctx, type V, disc, line, poly, px, rect, sprite } from "./pixel";

const INK = "#1a1426";
export type GearKind = "Zırh" | "Silah" | "Büyü";
export type Gear = { id: string; level: number; kind: GearKind; owner: string; name: string; desc: string; draw: (c: Ctx, t: number) => void };

const twinkle = (c: Ctx, t: number, pts: V[], color = "#fff6c8") =>
  pts.forEach(([x, y], i) => { if (Math.floor(t * 3 + i * 1.7) % 3 === 0) { px(c, x, y, color); px(c, x - 1, y, color); px(c, x + 1, y, color); px(c, x, y - 1, color); px(c, x, y + 1, color); } });

/* --------------------------------- silahlar -------------------------------- */

type SwordPal = { blade: string; edge: string; groove: string; guard: string; grip: string; wrap: string; pommel: string; gem?: string };

// çapraz kılıç: kabza sol altta, uç sağ üstte. len: namlu uzunluğu
function sword(c: Ctx, p: SwordPal, len = 14) {
  const b0: V = [8, 16], tip: V = [8 + len, 16 - len];
  line(c, b0, tip, 4, INK);
  line(c, b0, tip, 2, p.blade);
  line(c, [7, 15], [tip[0] - 1, tip[1] - 1], 1, p.edge);
  line(c, [10, 14], [tip[0] - 3, tip[1] + 3], 1, p.groove);
  line(c, [6, 18], [3, 21], 4, INK);
  line(c, [6, 18], [3, 21], 2, p.grip);
  px(c, 5, 19, p.wrap); px(c, 3, 21, p.wrap);
  disc(c, 2, 22, 2, INK); px(c, 2, 22, p.pommel); px(c, 1, 22, p.pommel);
  line(c, [4, 14], [10, 20], 4, INK);
  line(c, [4, 14], [10, 20], 2, p.guard);
  px(c, 4, 14, p.edge);
  if (p.gem) { px(c, 7, 17, p.gem); px(c, 6, 16, p.gem); }
}

function bow(c: Ctx, wood: string, woodLt: string, wrap: string, tipColor: string, arrow = "#c8463a") {
  const arc: V[] = [];
  for (let y = 2; y <= 21; y++) { const dy = y - 11.5; arc.push([Math.round(5 + (dy * dy) / 12), y]); }
  for (const [x, y] of arc) rect(c, x - 1, y - 1, 3, 3, INK);
  for (const [x, y] of arc) { px(c, x, y, wood); if (y < 11) px(c, x - 1, y, woodLt); }
  line(c, [12, 2], [12, 21], 1, "#e8e0f0");
  // ok: gövde, uç, tüyler
  line(c, [7, 12], [21, 12], 3, INK);
  line(c, [7, 12], [21, 12], 1, "#b88a5c");
  poly(c, [[20, 9], [23, 12], [20, 15]], INK); poly(c, [[20, 10], [22, 12], [20, 14]], "#c8ccd8");
  rect(c, 6, 10, 3, 1, arrow); rect(c, 6, 14, 3, 1, arrow); rect(c, 5, 11, 2, 1, arrow); rect(c, 5, 13, 2, 1, arrow);
  rect(c, 3, 10, 3, 4, INK); rect(c, 4, 10, 2, 4, wrap);
  px(c, arc[0][0], 1, tipColor); px(c, arc[arc.length - 1][0], 22, tipColor);
}

function spear(c: Ctx, t: number) {
  line(c, [2, 22], [16, 8], 3, INK);
  line(c, [2, 22], [16, 8], 1, "#8c6448");
  for (let i = 0; i < 4; i++) px(c, 5 + i * 3, 19 - i * 3, "#e2b45a");
  poly(c, [[15, 9], [17, 3], [22, 2], [21, 7], [15, 9]], INK, 1);
  poly(c, [[15, 9], [17, 3], [22, 2], [21, 7]], "#d8dce6");
  line(c, [16, 8], [21, 3], 1, "#ffffff");
  px(c, 22, 2, "#fff6c8");
  twinkle(c, t, [[20, 4], [12, 3], [22, 10]]);
}

/* ---------------------------------- zırhlar --------------------------------- */

type ArmorPal = { base: string; shade: string; light: string; trim: string; belt: string; buckle: string; emblem?: string };

function armor(c: Ctx, p: ArmorPal) {
  const body: V[] = [[3, 7], [8, 4], [16, 4], [21, 7], [21, 12], [18, 13], [18, 20], [12, 22], [6, 20], [6, 13], [3, 12]];
  poly(c, body, INK, 1);
  poly(c, body, p.base);
  poly(c, [[12, 5], [16, 4], [21, 7], [21, 12], [18, 13], [18, 20], [12, 22]], p.shade);
  line(c, [7, 8], [7, 18], 1, p.light); line(c, [4, 8], [7, 6], 1, p.light);
  // omuzluklar
  disc(c, 5, 8, 3, INK); disc(c, 5, 8, 2, p.trim); px(c, 4, 7, p.light);
  disc(c, 19, 8, 3, INK); disc(c, 19, 8, 2, p.trim);
  // yaka
  rect(c, 9, 4, 6, 3, INK); rect(c, 10, 4, 4, 2, "#2a1c3a");
  // kemer ve toka
  rect(c, 6, 16, 12, 3, INK); rect(c, 6, 17, 12, 1, p.belt);
  rect(c, 11, 16, 3, 3, INK); px(c, 12, 17, p.buckle);
  line(c, [12, 7], [12, 15], 1, p.trim);
  if (p.emblem) sprite(c, [".o.o.", "oxoxo", "oxxxo", ".oxo.", "..o.."], 10, 9, { o: INK, x: p.emblem });
}

/* ---------------------------------- büyüler --------------------------------- */

const HEART = ["..ooo.ooo..", ".oxxxoxxxo.", "oxlxxxxxxxo", "oxlxxxxxxxo", "oxxxxxxxxxo", ".oxxxxxxxo.", "..oxxxxxo..", "...oxxxo...", "....oxo....", ".....o....."];

function spark(c: Ctx, t: number) {
  const r = 5 + Math.round(Math.sin(t * 4) * 1.5);
  line(c, [12, 12 - r - 2], [12, 12 + r + 2], 1, "#ffe08a");
  line(c, [12 - r - 2, 12], [12 + r + 2, 12], 1, "#ffe08a");
  line(c, [12 - r + 2, 12 - r + 2], [12 + r - 2, 12 + r - 2], 1, "#f0a24a");
  line(c, [12 - r + 2, 12 + r - 2], [12 + r - 2, 12 - r + 2], 1, "#f0a24a");
  disc(c, 12, 12, 3, "#fff6c8"); disc(c, 12, 12, 1, "#ffffff");
  for (let i = 0; i < 4; i++) { const a = t * 2 + (i * Math.PI) / 2; px(c, 12 + Math.round(Math.cos(a) * 9), 12 + Math.round(Math.sin(a) * 9), "#fff6c8"); }
}

function heal(c: Ctx, t: number) {
  rect(c, 8, 3, 8, 18, INK); rect(c, 3, 8, 18, 8, INK);
  rect(c, 9, 4, 6, 16, "#5f9e6e"); rect(c, 4, 9, 16, 6, "#5f9e6e");
  rect(c, 10, 5, 2, 14, "#8fd09a"); rect(c, 5, 10, 14, 2, "#8fd09a");
  for (let i = 0; i < 5; i++) { const k = (t * 0.6 + i * 0.2) % 1; px(c, 3 + i * 4, 22 - Math.round(k * 20), `rgba(160,240,170,${(1 - k).toFixed(2)})`); }
}

function shieldSpell(c: Ctx, t: number) {
  disc(c, 12, 12, 10, INK); disc(c, 12, 12, 9, "#6f86d6"); disc(c, 12, 12, 7, "rgba(170,200,255,0.55)");
  disc(c, 12, 12, 5, "rgba(210,225,255,0.35)");
  for (const [x, y] of [[9, 6], [8, 7], [7, 9]] as V[]) px(c, x, y, "#ffffff");
  const a = t * 2.5;
  px(c, 12 + Math.round(Math.cos(a) * 8), 12 + Math.round(Math.sin(a) * 8), "#ffffff");
  px(c, 12 + Math.round(Math.cos(a + 3.1) * 8), 12 + Math.round(Math.sin(a + 3.1) * 8), "#c8d8ff");
}

function fireball(c: Ctx, t: number) {
  for (let i = 0; i < 6; i++) {
    const n = Math.sin(t * 9 + i * 1.3);
    line(c, [12, 12], [3 + i - Math.round(n), 20 - Math.round(i * 0.6) + Math.round(n)], 3, i % 2 ? "#c8463a" : "#f0a24a");
  }
  disc(c, 13, 11, 7, INK); disc(c, 13, 11, 6, "#f0a24a"); disc(c, 14, 10, 4, "#ffe08a"); disc(c, 15, 9, 1, "#ffffff");
  for (let i = 0; i < 3; i++) { const k = (t + i * 0.33) % 1; px(c, 18 + i, 4 - Math.round(k * 3) + i * 2, `rgba(255,200,120,${(1 - k).toFixed(2)})`); }
}

function ice(c: Ctx, t: number) {
  const arms: V[] = [[0, -10], [9, -5], [9, 5], [0, 10], [-9, 5], [-9, -5]];
  for (const [dx, dy] of arms) line(c, [12, 12], [12 + dx, 12 + dy], 3, INK);
  for (const [dx, dy] of arms) {
    line(c, [12, 12], [12 + dx, 12 + dy], 1, "#bfe6f5");
    const mx = 12 + Math.round(dx * 0.6), my = 12 + Math.round(dy * 0.6);
    px(c, mx + Math.sign(dy || 1), my - Math.sign(dx || 1), "#e8f8ff"); px(c, mx - Math.sign(dy || 1), my + Math.sign(dx || 1), "#e8f8ff");
  }
  disc(c, 12, 12, 2, "#ffffff");
  twinkle(c, t, [[4, 3], [20, 20], [21, 4]], "#e8f8ff");
}

function lightning(c: Ctx, t: number) {
  disc(c, 8, 4, 3, "#5e5a66"); disc(c, 13, 3, 4, "#7d7884"); disc(c, 17, 5, 3, "#5e5a66"); rect(c, 6, 5, 14, 3, "#5e5a66");
  const on = Math.floor(t * 4) % 4 !== 0;
  const bolt: V[] = [[13, 7], [9, 14], [12, 14], [8, 22], [16, 12], [13, 12], [16, 7]];
  poly(c, bolt, INK, 1);
  poly(c, bolt, on ? "#ffe08a" : "#c8a040");
  if (on) { line(c, [13, 8], [10, 13], 1, "#ffffff"); px(c, 8, 22, "#ffffff"); }
}

function dragonEye(c: Ctx, t: number) {
  for (let i = 0; i < 14; i++) px(c, 2 + ((i * 7) % 20), 3 + ((i * 11) % 18), i % 2 ? "#8e3438" : "#6a1e28");
  const shut = (t % 3.2) < 0.18;
  const eye: V[] = [[2, 12], [8, 7], [16, 7], [22, 12], [16, 17], [8, 17]];
  poly(c, eye, INK, 1);
  if (shut) { poly(c, eye, "#6a1e28"); line(c, [3, 12], [21, 12], 1, INK); return; }
  poly(c, eye, "#ffc040");
  disc(c, 12, 12, 4, "#f0a24a");
  rect(c, 11, 7, 2, 11, INK);
  px(c, 9, 9, "#fff6c8"); px(c, 8, 10, "#fff6c8");
}

function twoHearts(c: Ctx, t: number) {
  const beat = Math.sin(t * 5) > 0.6 ? 1 : 0;
  sprite(c, HEART, 1, 4 - beat, { o: INK, x: "#b56b7a", l: "#e8a8b8" });
  sprite(c, HEART, 12, 9 + beat, { o: INK, x: "#d8485a", l: "#f8a0a8" });
  twinkle(c, t, [[4, 2], [21, 4], [11, 21], [3, 18]], "#ffd0e0");
}

/* ----------------------------------- liste ---------------------------------- */

const STEEL: SwordPal = { blade: "#9aa0ae", edge: "#e8ecf4", groove: "#6e7482", guard: "#5e6470", grip: "#4a3224", wrap: "#2a1c16", pommel: "#8e95a3" };

export const GEAR: Gear[] = [
  { id: "tunik", level: 1, kind: "Zırh", owner: "İkiniz", name: "Kumaş Tunik", desc: "Yolculuğun ilk günü: yumuşak keten, cebinde bir parça ekmek.",
    draw: (c) => armor(c, { base: "#c9b48a", shade: "#a8916a", light: "#e6d3a8", trim: "#8a6a4a", belt: "#6b4a35", buckle: "#c8b088" }) },
  { id: "tahta-kilic", level: 2, kind: "Silah", owner: "Cengiz", name: "Tahta Kılıç", desc: "Antrenman kılıcı. Kum torbası ilk rakibiydi.",
    draw: (c) => sword(c, { blade: "#b88a5c", edge: "#d8b080", groove: "#8c6448", guard: "#6b4a35", grip: "#4a3224", wrap: "#2a1c16", pommel: "#8c6448" }, 12) },
  { id: "isik", level: 3, kind: "Büyü", owner: "İkiniz", name: "Işık Kıvılcımı", desc: "Karanlık koridorları aydınlatan küçük bir yıldız.", draw: spark },
  { id: "avci-yayi", level: 4, kind: "Silah", owner: "Ayşenur", name: "Avcı Yayı", desc: "Dişbudak yay; sabırlı ve keskin gözler için.", draw: (c) => bow(c, "#8c6448", "#b88a5c", "#6b4a35", "#4a3224") },
  { id: "sifa", level: 5, kind: "Büyü", owner: "İkiniz", name: "İyileştirme", desc: "Yorgun kaslara ve uykusuz gözlere şifa.", draw: heal },
  { id: "deri-zirh", level: 6, kind: "Zırh", owner: "İkiniz", name: "Deri Zırh", desc: "Kaynatılmış deri, bakır perçinler. Düldül tırmalasa da dayanır.",
    draw: (c) => armor(c, { base: "#8a5a36", shade: "#6a4226", light: "#a8744a", trim: "#c88a48", belt: "#4a3224", buckle: "#d8a050" }) },
  { id: "demir-kilic", level: 7, kind: "Silah", owner: "Cengiz", name: "Demir Kılıç", desc: "Dengeli ve sağlam; kabzasına küçük bir A harfi kazınmış.", draw: (c) => sword(c, STEEL) },
  { id: "kalkan-buyusu", level: 8, kind: "Büyü", owner: "İkiniz", name: "Kalkan Büyüsü", desc: "Mavi bir kubbe; şato yağmuru bile geçemez.", draw: shieldSpell },
  { id: "elf-yayi", level: 9, kind: "Silah", owner: "Ayşenur", name: "Elf Yayı", desc: "Legolas'ın hediyesi; okları rüzgârla konuşur.", draw: (c) => bow(c, "#e2b45a", "#f8dc88", "#4f6a3a", "#5fae6e", "#5fae6e") },
  { id: "gumus-hancer", level: 11, kind: "Silah", owner: "Ayşenur", name: "Gümüş Hançer", desc: "Ay ışığında parlar, gölgeleri keser.",
    draw: (c) => sword(c, { blade: "#c8ccd8", edge: "#ffffff", groove: "#9aa0ae", guard: "#7a68a6", grip: "#3a2a40", wrap: "#5a4a7a", pommel: "#c9a6f0", gem: "#c9a6f0" }, 9) },
  { id: "celik-zirh", level: 12, kind: "Zırh", owner: "İkiniz", name: "Çelik Zırh", desc: "Cüce ocağında dövülmüş plakalar; Gimli bile beğendi.",
    draw: (c) => armor(c, { base: "#9aa0ae", shade: "#6e7482", light: "#d8dce6", trim: "#4a4f5a", belt: "#4a3224", buckle: "#e2b45a" }) },
  { id: "alev-topu", level: 13, kind: "Büyü", owner: "İkiniz", name: "Alev Topu", desc: "Şömineyi tek nefeste tutuşturur.", draw: fireball },
  { id: "ejder-kilici", level: 16, kind: "Silah", owner: "Cengiz", name: "Ejder Kılıcı", desc: "Daenerys'in ejderhasının alevinde su verildi.",
    draw: (c) => sword(c, { blade: "#4a1a22", edge: "#e85a3a", groove: "#8e3438", guard: "#2a0e14", grip: "#2a0e14", wrap: "#6a1e28", pommel: "#ffc040", gem: "#ffc040" }) },
  { id: "buz", level: 17, kind: "Büyü", owner: "İkiniz", name: "Buz Rüzgârı", desc: "Kuzeyden, Jon Snow'un nöbet yerinden esen soğuk.", draw: ice },
  { id: "altin-zirh", level: 20, kind: "Zırh", owner: "İkiniz", name: "Altın Zırh", desc: "Güneşte parlayan işlemeler, göğüste kalp arması.",
    draw: (c) => armor(c, { base: "#d8a840", shade: "#a87a24", light: "#f8dc88", trim: "#8a3a4a", belt: "#6a1e28", buckle: "#fff6c8", emblem: "#d8485a" }) },
  { id: "simsek", level: 21, kind: "Büyü", owner: "İkiniz", name: "Şimşek", desc: "Fırtınalı gecelerin gücü avucunda.", draw: lightning },
  { id: "yildiz-mizragi", level: 22, kind: "Silah", owner: "İkiniz", name: "Yıldız Mızrağı", desc: "Ucu kayan bir yıldızdan; fırlatınca geri döner.", draw: spear },
  { id: "ejder-cagrisi", level: 25, kind: "Büyü", owner: "İkiniz", name: "Ejder Çağrısı", desc: "Bir ıslık ve gökyüzünde kanat sesi.", draw: dragonEye },
  { id: "kalp-kilici", level: 28, kind: "Silah", owner: "İkiniz", name: "Kalp Kılıcı", desc: "İki kişinin aynı anda tuttuğu efsanevi kılıç.",
    draw: (c, t) => { sword(c, { blade: "#e8a8b8", edge: "#ffffff", groove: "#b56b7a", guard: "#e2b45a", grip: "#8a3a4a", wrap: "#5a1e2e", pommel: "#d8485a", gem: "#d8485a" }); twinkle(c, t, [[18, 3], [21, 9], [13, 5]], "#ffd0e0"); } },
  { id: "efsane-zirhi", level: 30, kind: "Zırh", owner: "İkiniz", name: "Efsane Zırhı", desc: "Yıldız tozuyla dokunmuş; giyeni gece bile ışıldar.",
    draw: (c, t) => { armor(c, { base: "#6a5aa8", shade: "#4a3a80", light: "#a898e8", trim: "#e2b45a", belt: "#2a1c3a", buckle: "#f3d48a", emblem: "#f3d48a" }); twinkle(c, t, [[3, 3], [21, 3], [2, 18], [22, 17]]); } },
  { id: "iki-kalp", level: 30, kind: "Büyü", owner: "İkiniz", name: "İki Kalp", desc: "En güçlü büyü: birlikte geçen her gün.", draw: twoHearts },
];
