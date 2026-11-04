// Hazine: seviyeyle açılan zırhlar, silahlar ve büyüler. Her eşya 24x24 dünya pikselinde elle çizilir;
// büyüler hareketlidir. Kilitli eşyalar sayfada gri siluet olarak görünür (CSS filtresi).
import { type Ctx, type V, disc, line, poly, px, rect, sprite } from "./pixel";
import { MAX_LEVEL } from "./xp";

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

// elle çizilmiş özel eşyalar
const HANDMADE: Gear[] = [
  { id: "ikimizin-yuzugu", level: 8, kind: "Zırh", owner: "İkiniz", name: "İkimizin Yüzüğü", desc: "Çift yüzük: ikiniz de takıp yan yana olunca can ve mana iki kat hızlı dolar.", draw: (c, t) => trinket(c, { gem: "#6f86d6", metal: "#e2b45a", shape: "yuzuk" }, t) },
  { id: "mana-kolyesi", level: 14, kind: "Zırh", owner: "İkiniz", name: "Mana Kolyesi", desc: "Mavi taşı mana pınarı gibi; mana daha hızlı dolar.", draw: (c, t) => trinket(c, { gem: "#5a9ad8", metal: "#c8ccd8", shape: "kolye" }, t) },
  { id: "can-tilsimi", level: 22, kind: "Zırh", owner: "İkiniz", name: "Can Tılsımı", desc: "Kırmızı tılsım; yaralar çabuk kapanır.", draw: (c, t) => trinket(c, { gem: "#d8485a", metal: "#a87a24", shape: "tilsim" }, t) },
  { id: "ruzgar-muskasi", level: 35, kind: "Zırh", owner: "İkiniz", name: "Rüzgâr Muskası", desc: "Takan rüzgâr gibi koşar.", draw: (c, t) => trinket(c, { gem: "#9fe8ae", metal: "#c8ccd8", shape: "tilsim" }, t) },
  { id: "yildiz-kolyesi", level: 50, kind: "Zırh", owner: "İkiniz", name: "Yıldız Kolyesi", desc: "Gece gökyüzünden bir parça: can ve mana hızlı dolar.", draw: (c, t) => trinket(c, { gem: "#f3d48a", metal: "#e8ecf4", shape: "kolye" }, t) },
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
  { id: "elf-kilici", level: 10, kind: "Silah", owner: "Ayşenur", name: "Elf Kılıcı", desc: "İnce ve hafif; Legolas'ın ormanlarında dövüldü.",
    draw: (c) => sword(c, { blade: "#d8e8e0", edge: "#ffffff", groove: "#9ac8b0", guard: "#5fae6e", grip: "#2e5240", wrap: "#b8f0a0", pommel: "#e8d070", gem: "#b8f0a0" }, 15) },
  { id: "gul-kilici", level: 18, kind: "Silah", owner: "Ayşenur", name: "Gül Kılıcı", desc: "Sapına gül sarmaşığı dolanmış; her vuruşta yaprak savrulur.",
    draw: (c) => sword(c, { blade: "#e8d8dc", edge: "#ffffff", groove: "#c89aa8", guard: "#8a3a4a", grip: "#2e5240", wrap: "#5fae6e", pommel: "#e2557a", gem: "#e2557a" }) },
  { id: "ay-kilici", level: 26, kind: "Silah", owner: "Ayşenur", name: "Ay Kılıcı", desc: "Dolunayın ışığından; karanlıkta gümüş bir iz bırakır.",
    draw: (c) => sword(c, { blade: "#b8c8f0", edge: "#ffffff", groove: "#7a8ac8", guard: "#c8ccd8", grip: "#2a2a44", wrap: "#7a68a6", pommel: "#f4efd8", gem: "#c9a6f0" }, 15) },
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

/* ------------------------------ üretilen eşyalar ----------------------------- */
// Yüzlerce eşya: şekil kalıpları × malzemeler (silah, zırh) ve elementler × biçimler (büyü).
// Her biri kendi adını, açıklamasını ve seviyesini alır; çizim malzemenin renkleriyle yapılır.

type Mat = { id: string; name: string; base: string; lt: string; dk: string; gem: string; desc: string };
export const MATS: Mat[] = [
  { id: "tahta", name: "Tahta", base: "#b88a5c", lt: "#d8b080", dk: "#8c6448", gem: "#5fae6e", desc: "Atölyede yontulmuş; ilk adımlar için." },
  { id: "bakir", name: "Bakır", base: "#c8784a", lt: "#e8a070", dk: "#8a4a2a", gem: "#5fae6e", desc: "Sıcak bir parıltısı var, yumuşak ama sevimli." },
  { id: "demir", name: "Demir", base: "#8e95a3", lt: "#c8ccd8", dk: "#5e6470", gem: "#c8463a", desc: "Köy demircisinden; sağlam ve güvenilir." },
  { id: "celik", name: "Çelik", base: "#9aa0ae", lt: "#e8ecf4", dk: "#6e7482", gem: "#6f86d6", desc: "Cüce ocağında dövülmüş, jilet gibi keskin." },
  { id: "gumus", name: "Gümüş", base: "#c8ccd8", lt: "#ffffff", dk: "#9aa0ae", gem: "#c9a6f0", desc: "Ay ışığında parlar, gölgeleri ürkütür." },
  { id: "altin", name: "Altın", base: "#d8a840", lt: "#f8dc88", dk: "#a87a24", gem: "#d8485a", desc: "Krallara layık işlemelerle süslü." },
  { id: "mithril", name: "Mithril", base: "#bfe6f5", lt: "#ffffff", dk: "#7fb0c8", gem: "#5fae6e", desc: "Tüy kadar hafif; elf ustalarının işi." },
  { id: "obsidyen", name: "Obsidyen", base: "#4a3a56", lt: "#8a78b6", dk: "#1a1426", gem: "#c8463a", desc: "Volkan camından; karanlıkta kızıl parlar." },
  { id: "ejder", name: "Ejder Kemiği", base: "#e8d8b0", lt: "#fff6d8", dk: "#a89870", gem: "#ffc040", desc: "Yaşlı bir ejderhanın armağanı." },
  { id: "kristal", name: "Kristal", base: "#a8e0f0", lt: "#ffffff", dk: "#5a9ac8", gem: "#e48aa0", desc: "İçinden ışık geçer, gökkuşağı saçar." },
  { id: "yildiz", name: "Yıldız Metali", base: "#7a6ab8", lt: "#c8b8ff", dk: "#3a2a70", gem: "#f3d48a", desc: "Kayan bir yıldızdan dövüldü." },
  { id: "gok", name: "Göksel", base: "#f3d48a", lt: "#ffffff", dk: "#e2b45a", gem: "#ffffff", desc: "Gökyüzünün kendisi kadar parlak." },
];

const swordPal = (m: Mat): SwordPal => ({ blade: m.base, edge: m.lt, groove: m.dk, guard: m.dk, grip: "#4a3224", wrap: "#2a1c16", pommel: m.base, gem: m.gem });

function greatsword(c: Ctx, m: Mat) {
  const b0: V = [8, 16], tip: V = [23, 1];
  line(c, b0, tip, 6, INK); line(c, b0, tip, 4, m.base); line(c, [7, 15], [22, 0], 1, m.lt); line(c, [10, 15], [21, 4], 1, m.dk);
  line(c, [6, 18], [2, 22], 4, INK); line(c, [6, 18], [2, 22], 2, "#4a3224");
  line(c, [3, 13], [11, 21], 5, INK); line(c, [3, 13], [11, 21], 3, m.dk); px(c, 7, 17, m.gem); px(c, 6, 16, m.gem);
}
function axe(c: Ctx, m: Mat) {
  line(c, [4, 22], [17, 4], 3, INK); line(c, [4, 22], [17, 4], 1, "#8c6448");
  const head: V[] = [[13, 3], [21, 1], [23, 8], [19, 12], [15, 9]];
  poly(c, head, INK, 1); poly(c, head, m.base); line(c, [21, 2], [22, 8], 1, m.lt); px(c, 16, 7, m.dk); px(c, 17, 6, m.gem);
}
function hammer(c: Ctx, m: Mat) {
  line(c, [5, 22], [15, 7], 3, INK); line(c, [5, 22], [15, 7], 1, "#8c6448");
  const head: V[] = [[9, 4], [17, 0], [22, 8], [14, 12]];
  poly(c, head, INK, 1); poly(c, head, m.base); line(c, [17, 1], [21, 8], 1, m.lt); line(c, [10, 5], [14, 11], 1, m.dk); px(c, 15, 6, m.gem);
}
function staff(c: Ctx, m: Mat, t: number) {
  line(c, [6, 23], [15, 6], 3, INK); line(c, [6, 23], [15, 6], 1, "#6b4a35");
  line(c, [14, 7], [12, 2], 1, m.dk); line(c, [16, 7], [19, 3], 1, m.dk);
  const p = Math.round(Math.sin(t * 3)); disc(c, 16, 4, 4, INK); disc(c, 16, 4, 3, m.gem); disc(c, 15, 3, 1, "#ffffff");
  twinkle(c, t, [[20, 1 + p], [11, 6], [21, 8]], m.lt);
}
function spearOf(c: Ctx, m: Mat) {
  line(c, [2, 22], [16, 8], 3, INK); line(c, [2, 22], [16, 8], 1, "#8c6448");
  for (let i = 0; i < 3; i++) px(c, 5 + i * 3, 19 - i * 3, m.dk);
  poly(c, [[15, 9], [17, 3], [22, 2], [21, 7]], INK, 1); poly(c, [[15, 9], [17, 3], [22, 2], [21, 7]], m.base); line(c, [16, 8], [21, 3], 1, m.lt);
}
function helmet(c: Ctx, m: Mat) {
  disc(c, 12, 11, 9, INK); disc(c, 12, 11, 8, m.base); rect(c, 3, 11, 19, 10, INK); rect(c, 4, 11, 17, 9, m.base);
  rect(c, 6, 12, 13, 2, INK); rect(c, 11, 14, 3, 6, INK); // göz yarığı, burun koruması
  rect(c, 5, 6, 3, 5, m.lt); rect(c, 4, 19, 17, 2, m.dk);
  line(c, [12, 2], [12, 0], 2, m.gem); rect(c, 10, 0, 6, 2, m.gem); // sorguç
}
function shieldOf(c: Ctx, m: Mat) {
  const s: V[] = [[3, 3], [21, 3], [21, 12], [12, 22], [3, 12]];
  poly(c, s, INK, 1); poly(c, s, m.dk); poly(c, [[5, 5], [19, 5], [19, 12], [12, 19], [5, 12]], m.base);
  line(c, [12, 5], [12, 19], 1, m.dk); line(c, [5, 10], [19, 10], 1, m.dk); disc(c, 12, 10, 2, m.gem); px(c, 6, 6, m.lt);
}

function capeOf(c: Ctx, m: Mat) {
  const s: V[] = [[7, 3], [17, 3], [21, 21], [12, 19], [3, 21]];
  poly(c, s, INK, 1); poly(c, s, m.base); poly(c, [[12, 4], [17, 3], [21, 21], [14, 19]], m.dk);
  line(c, [9, 6], [6, 19], 1, m.lt); line(c, [12, 5], [12, 18], 1, m.dk);
  rect(c, 6, 2, 12, 3, INK); rect(c, 7, 2, 10, 2, m.dk); disc(c, 12, 3, 2, m.gem); // yaka ve toka
}
function glovesOf(c: Ctx, m: Mat) {
  for (const [ox, fl] of [[2, 1], [13, -1]] as [number, number][]) {
    rect(c, ox + 1, 10, 9, 11, INK); rect(c, ox + 2, 11, 7, 9, m.base); rect(c, ox + 2, 17, 7, 3, m.dk); // avuç ve bilek
    for (let f = 0; f < 3; f++) { rect(c, ox + 2 + f * 2 + (fl > 0 ? 0 : 1), 5, 2, 7, INK); rect(c, ox + 3 + f * 2 + (fl > 0 ? -1 : 0) + (fl > 0 ? 1 : 0), 6, 1, 5, m.base); }
    rect(c, fl > 0 ? ox + 9 : ox, 11, 2, 4, INK); px(c, fl > 0 ? ox + 9 : ox + 1, 12, m.base); // başparmak
    px(c, ox + 4, 18, m.gem); px(c, ox + 3, 12, m.lt);
  }
}
function bootsOf(c: Ctx, m: Mat) {
  for (const ox of [2, 12]) {
    rect(c, ox + 1, 4, 7, 15, INK); rect(c, ox + 2, 5, 5, 13, m.base); rect(c, ox + 1, 16, 10, 5, INK); rect(c, ox + 2, 17, 8, 3, m.base);
    rect(c, ox + 2, 19, 8, 1, m.dk); rect(c, ox + 2, 5, 5, 2, m.dk); px(c, ox + 3, 9, m.lt); px(c, ox + 4, 12, m.gem);
  }
}
type Trinket = { gem: string; metal: string; shape: "yuzuk" | "kolye" | "tilsim" };
function trinket(c: Ctx, p: Trinket, t: number) {
  if (p.shape === "yuzuk") {
    for (const ox of [-4, 4]) { disc(c, 12 + ox, 14, 6, INK); disc(c, 12 + ox, 14, 5, p.metal); disc(c, 12 + ox, 14, 3, INK); disc(c, 12 + ox, 14, 2, "#141020"); }
    rect(c, 6, 6, 4, 4, INK); rect(c, 7, 7, 2, 2, p.gem); rect(c, 14, 6, 4, 4, INK); rect(c, 15, 7, 2, 2, "#e48aa0"); // iki taş: ikinizin
  } else if (p.shape === "kolye") {
    for (let k = 0; k <= 10; k++) { const a = Math.PI * (k / 10); px(c, Math.round(12 - Math.cos(a) * 9), Math.round(4 + Math.sin(a) * 9), p.metal); }
    disc(c, 12, 16, 5, INK); disc(c, 12, 16, 4, p.gem); px(c, 11, 14, "#ffffff");
  } else {
    poly(c, [[12, 3], [19, 10], [12, 21], [5, 10]], INK, 1); poly(c, [[12, 3], [19, 10], [12, 21], [5, 10]], p.metal); poly(c, [[12, 7], [16, 11], [12, 17], [8, 11]], p.gem);
  }
  if (Math.floor(t * 3) % 3 === 0) { px(c, 19, 4, "#fff6c8"); px(c, 18, 4, "rgba(255,246,200,0.5)"); px(c, 20, 4, "rgba(255,246,200,0.5)"); }
}

type Tmpl = { id: string; noun: string; kind: GearKind; owner: string; off: number; desc: string; draw: (c: Ctx, m: Mat, t: number) => void };
const TEMPLATES: Tmpl[] = [
  { id: "kilic", noun: "Kılıç", kind: "Silah", owner: "Cengiz", off: 0, desc: "Dengeli bir kılıç.", draw: (c, m) => sword(c, swordPal(m)) },
  { id: "hancer", noun: "Hançer", kind: "Silah", owner: "Ayşenur", off: 1, desc: "Hızlı ve sessiz bir hançer.", draw: (c, m) => sword(c, swordPal(m), 9) },
  { id: "gogusluk", noun: "Göğüslük", kind: "Zırh", owner: "İkiniz", off: 1, desc: "Göğsü saran sağlam bir zırh.", draw: (c, m) => armor(c, { base: m.base, shade: m.dk, light: m.lt, trim: m.dk, belt: "#4a3224", buckle: m.gem, emblem: m.gem }) },
  { id: "yay", noun: "Yay", kind: "Silah", owner: "Ayşenur", off: 2, desc: "Gergin kirişli bir yay.", draw: (c, m) => bow(c, m.base, m.lt, "#6b4a35", m.gem, m.gem) },
  { id: "balta", noun: "Balta", kind: "Silah", owner: "Cengiz", off: 3, desc: "Tek vuruşta kütük yaran bir balta.", draw: (c, m) => axe(c, m) },
  { id: "migfer", noun: "Miğfer", kind: "Zırh", owner: "İkiniz", off: 3, desc: "Sorguçlu bir miğfer.", draw: (c, m) => helmet(c, m) },
  { id: "mizrak", noun: "Mızrak", kind: "Silah", owner: "İkiniz", off: 4, desc: "Uzun saplı bir mızrak.", draw: (c, m) => spearOf(c, m) },
  { id: "kalkan", noun: "Kalkan", kind: "Zırh", owner: "İkiniz", off: 5, desc: "Armalı bir kalkan.", draw: (c, m) => shieldOf(c, m) },
  { id: "cekic", noun: "Savaş Çekici", kind: "Silah", owner: "Cengiz", off: 5, desc: "Örsten fırlamış gibi ağır bir çekiç.", draw: (c, m) => hammer(c, m) },
  { id: "asa", noun: "Asa", kind: "Silah", owner: "İkiniz", off: 6, desc: "Ucunda taş parlayan bir asa.", draw: (c, m, t) => staff(c, m, t) },
  { id: "pelerin", noun: "Pelerin", kind: "Zırh", owner: "İkiniz", off: 2, desc: "Rüzgârda dalgalanan bir pelerin.", draw: (c, m) => capeOf(c, m) },
  { id: "eldiven", noun: "Eldiven", kind: "Zırh", owner: "İkiniz", off: 4, desc: "Parmakları koruyan eldivenler.", draw: (c, m) => glovesOf(c, m) },
  { id: "cizme", noun: "Çizme", kind: "Zırh", owner: "İkiniz", off: 6, desc: "Adımları hafifleten çizmeler.", draw: (c, m) => bootsOf(c, m) },
  { id: "buyuk-kilic", noun: "İki Elli Kılıç", kind: "Silah", owner: "Cengiz", off: 7, desc: "İki elle kavranan dev bir kılıç.", draw: (c, m) => greatsword(c, m) },
];

type El = { id: string; name: string; a: string; b: string; d: string; desc: string };
const ELEMENTS: El[] = [
  { id: "ates", name: "Ateş", a: "#f0a24a", b: "#ffe08a", d: "#c8463a", desc: "Şöminenin kalbinden." },
  { id: "buz", name: "Buz", a: "#7fc8e8", b: "#e8f8ff", d: "#3a7ab0", desc: "Kuzey rüzgârından." },
  { id: "doga", name: "Doğa", a: "#5fae6e", b: "#b8f0a0", d: "#2e5240", desc: "Bahçenin köklerinden." },
  { id: "isik", name: "Işık", a: "#f3d48a", b: "#ffffff", d: "#c89a3e", desc: "Sabahın ilk ışığından." },
  { id: "golge", name: "Gölge", a: "#7a68a6", b: "#c9a6f0", d: "#2a1c3a", desc: "Gecenin sessizliğinden." },
  { id: "firtina", name: "Fırtına", a: "#6f86d6", b: "#d8e0ff", d: "#2f3b6b", desc: "Şimşekli gecelerden." },
];
const ringPx = (c: Ctx, cx: number, cy: number, r: number, col: string, n = 16, phase = 0) => {
  for (let k = 0; k < n; k++) { const a = phase + (k / n) * Math.PI * 2; px(c, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), col); }
};
type Shape = { id: string; name: string; desc: string; draw: (c: Ctx, e: El, t: number) => void };
const SHAPES: Shape[] = [
  { id: "kivilcim", name: "Kıvılcımı", desc: "Avuçta dans eden küçük bir küre.", draw: (c, e, t) => {
    const r = 5 + Math.round(Math.sin(t * 4)); disc(c, 12, 12, r + 1, INK); disc(c, 12, 12, r, e.a); disc(c, 11, 11, Math.max(1, r - 3), e.b);
    for (let k = 0; k < 4; k++) { const a = t * 2 + k * 1.57; px(c, 12 + Math.round(Math.cos(a) * 9), 12 + Math.round(Math.sin(a) * 9), e.b); }
  } },
  { id: "ok", name: "Oku", desc: "Hedefini şaşırmayan bir ışın.", draw: (c, e, t) => {
    const on = Math.floor(t * 5) % 3 !== 0; line(c, [2, 21], [21, 3], 4, INK); line(c, [2, 21], [21, 3], 2, on ? e.a : e.d); line(c, [3, 19], [19, 4], 1, e.b);
    poly(c, [[17, 2], [23, 1], [22, 7]], INK, 1); poly(c, [[17, 2], [23, 1], [22, 7]], e.b);
  } },
  { id: "kalkani", name: "Kalkanı", desc: "Sevdiklerini saran koruyucu bir kubbe.", draw: (c, e, t) => {
    disc(c, 12, 12, 10, INK); disc(c, 12, 12, 9, e.d); disc(c, 12, 12, 7, e.a); disc(c, 12, 12, 5, e.d); ringPx(c, 12, 12, 8, e.b, 6, t * 2);
  } },
  { id: "muhru", name: "Mührü", desc: "Yere çizilen dönen bir rün halkası.", draw: (c, e, t) => {
    ringPx(c, 12, 12, 10, INK, 40); ringPx(c, 12, 12, 9, e.a, 40); ringPx(c, 12, 12, 6, e.d, 28);
    for (let k = 0; k < 6; k++) { const a = t + (k / 6) * Math.PI * 2; const x = 12 + Math.round(Math.cos(a) * 9), y = 12 + Math.round(Math.sin(a) * 9); rect(c, x - 1, y - 1, 3, 3, e.b); }
    disc(c, 12, 12, 2, e.b);
  } },
  { id: "yagmuru", name: "Yağmuru", desc: "Gökten süzülen parıltılar.", draw: (c, e, t) => {
    disc(c, 7, 4, 3, e.d); disc(c, 12, 3, 4, e.d); disc(c, 17, 4, 3, e.d); rect(c, 5, 4, 14, 3, e.d);
    for (let k = 0; k < 7; k++) { const q = (t * 0.9 + k / 7) % 1; line(c, [4 + k * 3, 8 + Math.round(q * 14)], [3 + k * 3, 10 + Math.round(q * 14)], 1, k % 2 ? e.a : e.b); }
  } },
  { id: "patlamasi", name: "Patlaması", desc: "Her yöne saçılan bir yıldız.", draw: (c, e, t) => {
    const r = 4 + Math.round(((t * 1.5) % 1) * 7);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; line(c, [12, 12], [12 + Math.round(Math.cos(a) * r), 12 + Math.round(Math.sin(a) * r)], 1, k % 2 ? e.a : e.b); }
    disc(c, 12, 12, 3, INK); disc(c, 12, 12, 2, e.b);
  } },
];

const GENERATED: Gear[] = [
  ...MATS.flatMap((m, mi) => TEMPLATES.map((tp) => ({
    id: `${tp.id}-${m.id}`, level: Math.min(MAX_LEVEL, 2 + mi * 8 + tp.off), kind: tp.kind, owner: tp.owner,
    name: `${m.name} ${tp.noun}`, desc: `${tp.desc} ${m.desc}`, draw: (c: Ctx, t: number) => tp.draw(c, m, t),
  }))),
  ...ELEMENTS.flatMap((e, ei) => SHAPES.map((sh, si) => ({
    id: `buyu-${e.id}-${sh.id}`, level: Math.min(MAX_LEVEL, 4 + ei * 13 + si * 2), kind: "Büyü" as GearKind, owner: "İkiniz",
    name: `${e.name} ${sh.name}`, desc: `${sh.desc} ${e.desc}`, draw: (c: Ctx, t: number) => sh.draw(c, e, t),
  }))),
];

/** Hareketli çizilen eşyalar (büyüler ve asalar): listede yalnız bunlar oynatılır */
export const animated = (g: Gear) => g.kind === "Büyü" || g.id.startsWith("asa-") || ["kalp-kilici", "efsane-zirhi", "yildiz-mizragi", "ikimizin-yuzugu", "mana-kolyesi", "can-tilsimi", "ruzgar-muskasi", "yildiz-kolyesi"].includes(g.id);
/** Takılar (yüzük, kolye, tılsım): takı yuvasına girer */
export const TRINKETS = new Set(["ikimizin-yuzugu", "mana-kolyesi", "can-tilsimi", "ruzgar-muskasi", "yildiz-kolyesi"]);

// elle çizilmiş bir eşyayla aynı adı taşıyan üretilmiş eşya alınmaz
export const GEAR: Gear[] = [...HANDMADE, ...GENERATED.filter((g) => !HANDMADE.some((h) => h.name === g.name))].sort((a, b) => a.level - b.level);

// kendi kendini denetler: kimlikler benzersiz, seviyeler 1..100, yüzlerce eşya
if (process.env.NODE_ENV !== "production") {
  console.assert(new Set(GEAR.map((g) => g.id)).size === GEAR.length, "eşya kimlikleri benzersiz olmalı");
  console.assert(GEAR.every((g) => g.level >= 1 && g.level <= MAX_LEVEL), "seviye aralığı");
  console.assert(GEAR.length >= 150 && new Set(GEAR.map((g) => g.name)).size === GEAR.length, "yüzlerce eşya, adlar benzersiz");
}
