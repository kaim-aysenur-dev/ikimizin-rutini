// Panelin arka planı: şato salonu. Sütunlar, çerçeveli duvar panoları, avize, taş zemin;
// boş kalan yanda şenlik ateşi ve yanında yan yana oturan Cengiz ile Ayşenur (Düldül ateşin önünde uyur, papağan tünekte).
// Seviye ödülleri (lib/xp.ts REWARDS) salona eşya ekler; zırh rengi ünvanla yükselir; seviye atlayınca ikisi zıplar.
import { type Ctx, type Free, type V, P, drawCharacter, line, rect, rnd } from "../pixel";
import { bricks, lights, px } from "../env";
import { STAND_F, blinkAt } from "../anim";
import { duldul, parrot, perch } from "../companions";
import { wizard } from "../guests";
import { type Tier, tierOf, unlockedRewards } from "../xp";

export type HallTag = { who: "cengiz" | "aysenur" | "duldul" | "parrot" | "gandalf"; at: V };

const f = (o: Partial<Free>): Free => ({ ...STAND_F, ...o });
// yerde oturuş (dizler yukarıda), elleri dizde ya da ateşe uzatılmış
const SIT = f({ hip: [-2, -3], neck: [-1, -10], eF: [2, -7], hF: [5, -6], eB: [1, -7], hB: [4, -6], kB: [3, -7], fB: [7, 0], kF: [3, -7], fF: [7, 0] });
const WARM = f({ ...SIT, neck: [0, -10], eF: [4, -8], hF: [8, -8], eB: [3, -8], hB: [7, -7] });
const LEAN = f({ ...SIT, neck: [-3, -10], eF: [1, -7], hF: [4, -5] }); // başını Cengiz'in omzuna yaslar
export const CHEER = f({ eF: [2, -20], hF: [3, -24], eB: [-2, -20], hB: [-3, -24] }); // ayakta, kollar havada

// zırh kademesine göre kıyafet: kumaşta ev kıyafeti, sonra deri, çelik (asıl zırh), altın, efsane
export const TIERS: Record<Tier, { outfit: "home" | "armor"; tint?: { top: string; topDk: string } }> = {
  cloth: { outfit: "home" },
  leather: { outfit: "armor", tint: { top: "#8a5a36", topDk: "#6a4226" } },
  steel: { outfit: "armor" },
  gold: { outfit: "armor", tint: { top: "#d8a840", topDk: "#a87a24" } },
  legend: { outfit: "armor", tint: { top: "#6a5aa8", topDk: "#4a3a80" } },
};

const BAY = 120; // sütun aralığı
const WALL = { base: "#4a4236", dark: "#352f27", light: "#5c5342" };

function pillar(c: Ctx, x: number, top: number, fl: number) {
  rect(c, x - 1, top, 18, fl - top, P.ink);
  rect(c, x, top, 16, fl - top, "#5a5142");
  rect(c, x + 2, top, 3, fl - top, "#6e6450");
  rect(c, x + 12, top, 3, fl - top, "#40392e");
  for (let y = top + 9; y < fl - 8; y += 9) rect(c, x, y, 16, 1, "#40392e");
  // başlık ve kaide
  rect(c, x - 4, top, 24, 6, P.ink); rect(c, x - 3, top + 1, 22, 4, "#6e6450"); rect(c, x - 3, top + 4, 22, 1, "#40392e");
  rect(c, x - 4, fl - 8, 24, 8, P.ink); rect(c, x - 3, fl - 7, 22, 6, "#5a5142"); rect(c, x - 3, fl - 7, 22, 1, "#6e6450");
}

// çerçeveli duvar panosu: içinde simetrik kıvrım işlemesi
function panel(c: Ctx, x: number, y: number, w: number, h: number, seed: number) {
  rect(c, x - 1, y - 1, w + 2, h + 2, P.ink);
  rect(c, x, y, w, h, "#3c3529");
  rect(c, x, y, w, 2, "#5c5342"); rect(c, x, y, 2, h, "#5c5342");
  rect(c, x + 4, y + 4, w - 8, h - 8, "#2e2820");
  rect(c, x + 5, y + 5, w - 10, h - 10, "#433b2f");
  const cx = x + Math.floor(w / 2), cy = y + Math.floor(h / 2), ink = "#6a5f4a";
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + seed;
    const r = 5 + (i % 3);
    px(c, cx + Math.round(Math.cos(a) * r * 1.6), cy + Math.round(Math.sin(a) * r), ink);
  }
  for (const s of [-1, 1]) {
    line(c, [cx + s * 3, cy - 9], [cx + s * 10, cy - 4], 1, ink);
    line(c, [cx + s * 10, cy - 4], [cx + s * 6, cy + 1], 1, ink);
    line(c, [cx + s * 3, cy + 9], [cx + s * 10, cy + 4], 1, ink);
    px(c, cx + s * 12, cy, ink); px(c, cx + s * 13, cy - 1, ink);
  }
  px(c, cx, cy, "#6e6450");
}

function chandelier(c: Ctx, x: number, y: number, t: number, still: boolean) {
  rect(c, x, 0, 1, y - 6, "#2a241c");
  rect(c, x - 2, y - 6, 5, 2, "#2a241c");
  rect(c, x - 16, y, 33, 2, "#2a241c"); rect(c, x - 12, y + 2, 25, 1, "#3c3529");
  rect(c, x - 3, y + 2, 7, 4, "#2a241c"); px(c, x, y + 6, "#2a241c");
  for (let i = -2; i <= 2; i++) {
    const cx = x + i * 7;
    const fl = still ? 0 : Math.round(Math.sin(t * 8 + i * 2) * 0.7);
    rect(c, cx, y - 4, 1, 4, P.cream);
    rect(c, cx, y - 6 - (fl > 0 ? 1 : 0), 1, 2, P.amber); px(c, cx, y - 7 - (fl > 0 ? 1 : 0), P.goldLt);
    lights.push({ x: cx, y: y - 6, r: 16 + fl, color: "240,170,90" });
  }
}

// şenlik ateşi: kül yığını, odunlar, ortasına saplanmış kılıç, titreşen alev ve kıvılcımlar
function bonfire(c: Ctx, x: number, fl: number, t: number, still: boolean) {
  rect(c, x - 9, fl - 2, 19, 2, "#3a3530"); rect(c, x - 7, fl - 3, 15, 1, "#56504a");
  for (let i = 0; i < 6; i++) px(c, x - 8 + Math.round(rnd(i + 3) * 16), fl - 3 + (i % 2), "#77706a");
  line(c, [x - 7, fl - 2], [x + 5, fl - 6], 2, P.woodDk);
  line(c, [x + 7, fl - 2], [x - 4, fl - 6], 2, P.wood);
  // kılıç: kabzası yukarıda, namlu ateşe gömülü
  rect(c, x, fl - 22, 1, 18, "#8e95a3"); rect(c, x + 1, fl - 22, 1, 18, "#5e6470");
  rect(c, x - 2, fl - 23, 6, 1, P.ink); rect(c, x - 1, fl - 23, 4, 1, P.gold);
  rect(c, x, fl - 27, 2, 4, "#4a3224"); px(c, x, fl - 28, P.gold);
  for (let i = -5; i <= 5; i++) {
    const n = still ? 0.5 : (Math.sin(t * 8 + i * 1.3) + Math.sin(t * 13 + i * 2.1) + 2) / 4;
    const h = Math.max(1, Math.round(4 + n * 9 - Math.abs(i) * 1.1));
    for (let k = 0; k < h; k++) {
      const col = k < h * 0.35 ? "#ffe08a" : k < h * 0.7 ? "#f0a24a" : "#c8463a";
      px(c, x + i, fl - 4 - k, col);
    }
  }
  if (!still) for (let i = 0; i < 5; i++) {
    const k = (t * 0.6 + i * 0.2) % 1;
    px(c, x - 4 + Math.round(rnd(i + Math.floor(t * 0.6 + i * 0.2)) * 9) + Math.round(Math.sin(t * 3 + i) * 1.5), fl - 12 - Math.round(k * 26), `rgba(255,200,120,${(1 - k).toFixed(2)})`);
  }
  const fl2 = still ? 0 : Math.sin(t * 9) * 3 + Math.sin(t * 5.3) * 2;
  lights.push({ x, y: fl - 10, r: 64 + fl2, color: "255,150,70" });
  lights.push({ x, y: fl - 8, r: 22 + fl2, color: "255,210,120" });
}

// Cengiz ve Ayşenur: ateşe dönük, yan yana. Ara sıra ellerini ısıtır, birbirine bakar; Ayşenur omzuna yaslanır.
function couple(c: Ctx, fx: number, fl: number, t: number, still: boolean, tier: Tier, cheer: boolean) {
  const T = still ? 0 : t;
  const breathe = (s: number) => (Math.floor((T + s) / 1.6) % 2 ? 0 : -1);
  const warmC = !still && T % 14 > 9;
  const warmA = !still && (T + 5) % 16 > 11;
  const leanA = !still && (T % 22) > 13 && !warmA;
  const lookC = !still && T % 22 > 15 && T % 22 < 19; // yaslanınca Cengiz ona döner
  const lookA = !still && (T % 9) > 7.6 && !leanA;
  const cx = fx - 38, ax = fx - 19;
  const { outfit, tint } = TIERS[tier];
  const hop = (s: number) => -Math.round(Math.abs(Math.sin(t * 8 + s)) * 4);
  const hc = cheer
    ? drawCharacter(c, { who: "cengiz", x: cx, y: fl + hop(0), dir: 1, pose: CHEER, outfit, tint, blink: false, headDir: 1 })
    : drawCharacter(c, { who: "cengiz", x: cx, y: fl + breathe(0), dir: 1, pose: warmC ? WARM : SIT, outfit, tint, blink: blinkAt(T, 0.3), headDir: lookC ? -1 : 1 });
  const ha = cheer
    ? drawCharacter(c, { who: "aysenur", x: ax, y: fl + hop(1.4), dir: -1, pose: CHEER, outfit, tint, blink: false, headDir: -1 })
    : drawCharacter(c, { who: "aysenur", x: ax, y: fl + breathe(0.7), dir: 1, pose: leanA ? LEAN : warmA ? WARM : SIT, outfit, tint, blink: blinkAt(T, 1.9), headDir: lookA ? -1 : 1 });
  if (tier === "legend" && !still) {
    // efsane zırhı: üstlerinde süzülen yıldız tozu
    for (let i = 0; i < 6; i++) { const k = (t * 0.5 + i / 6) % 1; px(c, (i % 2 ? ax : cx) - 5 + ((i * 5) % 11), fl - 4 - Math.round(k * 24), `rgba(243,212,138,${(1 - k).toFixed(2)})`); }
    lights.push({ x: (cx + ax) / 2, y: fl - 12, r: 26, color: "170,150,255" });
  }
  return { cengiz: hc.head, aysenur: ha.head };
}

/* ------------------------------ seviye ödülleri ------------------------------ */

function banner(c: Ctx, x: number, top: number) {
  const h = 40;
  rect(c, x - 1, top, 11, h, P.ink);
  rect(c, x, top, 9, h - 1, "#7a2a3a");
  rect(c, x + 1, top, 1, h - 2, "#9a3a4a");
  rect(c, x, top + 3, 9, 1, P.gold); rect(c, x, top + h - 9, 9, 1, P.gold);
  // ucu çatallı
  for (let i = 0; i < 4; i++) { px(c, x + i, top + h - 1 + i, P.ink); px(c, x + 8 - i, top + h - 1 + i, P.ink); }
  rect(c, x + 3, top + h - 4, 3, 3, "#4a3236");
  px(c, x + 3, top + 14, P.goldLt); px(c, x + 5, top + 14, P.goldLt); rect(c, x + 3, top + 15, 3, 1, P.goldLt); px(c, x + 4, top + 16, P.goldLt);
}

function rug(c: Ctx, x0: number, x1: number, fl: number) {
  rect(c, x0, fl, x1 - x0, 4, "#7a3b4a");
  rect(c, x0, fl, x1 - x0, 1, P.goldLt); rect(c, x0, fl + 3, x1 - x0, 1, P.gold);
  for (let x = x0 + 3; x < x1 - 2; x += 6) px(c, x, fl + 2, P.goldLt);
  for (let x = x0; x < x1; x += 2) px(c, x, fl + 4, P.parchDk);
}

function ring(c: Ctx, x: number, y: number, r: number, col: string) {
  for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy)); rect(c, x - hw, y + dy, hw * 2 + 1, 1, col); }
}

// duvarda çapraz kılıçlar ve yuvarlak kalkan
function shieldWall(c: Ctx, x: number, y: number) {
  line(c, [x - 10, y + 10], [x + 10, y - 10], 3, P.ink); line(c, [x - 10, y + 10], [x + 10, y - 10], 1, "#c8ccd8");
  line(c, [x + 10, y + 10], [x - 10, y - 10], 3, P.ink); line(c, [x + 10, y + 10], [x - 10, y - 10], 1, "#c8ccd8");
  rect(c, x - 12, y + 9, 4, 4, P.gold); rect(c, x + 8, y + 9, 4, 4, P.gold);
  ring(c, x, y, 8, P.ink); ring(c, x, y, 7, P.gold); ring(c, x, y, 5, "#2f3b6b"); ring(c, x, y, 2, P.goldLt);
  px(c, x - 3, y - 4, "#5a6aa8");
}

function egg(c: Ctx, x: number, fl: number, t: number, still: boolean) {
  const rows = [3, 5, 7, 7, 9, 9, 9, 7, 5];
  rows.forEach((wd, i) => rect(c, x - Math.floor(wd / 2) - 1, fl - 11 + i, wd + 2, 1, P.ink));
  rows.forEach((wd, i) => rect(c, x - Math.floor(wd / 2), fl - 10 + i, wd, 1, i < 4 ? "#5a3a80" : "#3a2a60"));
  for (const [dx, dy] of [[-2, -7], [1, -5], [-3, -4], [2, -3], [0, -2]] as V[]) px(c, x + dx, fl + dy, "#a8e05a");
  px(c, x - 1, fl - 9, "#9a86c4");
  const pulse = still ? 0 : Math.max(0, Math.sin(t * 2));
  lights.push({ x, y: fl - 6, r: 10 + pulse * 6, color: "160,220,90" });
}

function chest(c: Ctx, x: number, fl: number, t: number, still: boolean) {
  rect(c, x - 7, fl - 9, 15, 9, P.ink);
  rect(c, x - 6, fl - 8, 13, 7, P.wood); rect(c, x - 6, fl - 8, 13, 1, P.woodLt);
  rect(c, x - 3, fl - 8, 1, 7, P.gold); rect(c, x + 3, fl - 8, 1, 7, P.gold);
  rect(c, x - 7, fl - 14, 15, 5, P.ink); rect(c, x - 6, fl - 13, 13, 3, P.woodLt); // açık kapak
  rect(c, x - 5, fl - 10, 11, 2, P.gold); px(c, x - 2, fl - 11, P.goldLt); px(c, x + 2, fl - 11, "#d8485a"); px(c, x, fl - 11, P.goldLt);
  if (!still && Math.floor(t * 2) % 3 === 0) { px(c, x + 1, fl - 13, "#fff"); px(c, x, fl - 13, "#fff6c8"); px(c, x + 2, fl - 13, "#fff6c8"); }
  lights.push({ x, y: fl - 10, r: 14, color: "243,212,138" });
}

// ödüllere göre grubun ateşin solunda (L) ve sağında (R) kapladığı genişlik
const span = (got: Set<string>) => ({ L: got.has("chest") ? 86 : 68, R: got.has("gandalf") ? 52 : 28 });
/** Karakter grubunun sığması için gereken boşluk (dünya pikseli); sandık ve Gandalf sığmazsa onlarsız çizilir */
export const HALL_MIN = 96;
const fullSpan = (got: Set<string>) => { const { L, R } = span(got); return L + R + 8; };

// gap: karakterlerin görünür kalacağı boş şerit (dünya pikseli); null = sığmıyor, yalnız salon.
// level: ödüller ve zırh; cheer: seviye atlandı, ikisi sevinçle zıplıyor.
// Dönen değer: isim etiketlerinin konacağı baş noktaları.
export function drawHall(c: Ctx, w: number, h: number, t: number, still: boolean, gap: [number, number] | null, level = 1, cheer = false): HallTag[] {
  const got: Set<string> = unlockedRewards(level);
  // dar boşlukta büyük eşyalar (sandık, Gandalf) dışarıda kalır, ikisi ve ateş yine görünür
  if (gap && gap[1] - gap[0] < fullSpan(got)) { got.delete("chest"); got.delete("gandalf"); }
  lights.length = 0;
  const fl = h - Math.max(16, Math.round(h * 0.12));
  bricks(c, 0, 0, w, fl, WALL.base, WALL.dark, WALL.light, 71);
  // tavan kirişi
  rect(c, 0, 0, w, 10, "#2e2820"); rect(c, 0, 10, w, 2, P.ink); rect(c, 0, 12, w, 1, "#5c5342");
  const top = 13, ph = Math.min(80, Math.round((fl - top) * 0.42));
  const py = top + Math.round((fl - top - ph) * 0.45);
  for (let x = -BAY / 2, i = 0; x < w + BAY; x += BAY, i++) {
    panel(c, x + 22, py, BAY - 44, ph, i * 1.7);
    if (got.has("banners")) { banner(c, x + 9, top); banner(c, x + BAY - 18, top); }
    // pano altında duvar pervazı
    rect(c, x, fl - 26, BAY, 2, "#2e2820"); rect(c, x, fl - 24, BAY, 1, "#5c5342");
  }
  for (let x = -BAY / 2, i = 0; x < w + BAY; x += BAY, i++) {
    pillar(c, x - 8, top, fl);
    chandelier(c, x + BAY / 2, Math.min(46, py - 8), t + i, still);
    if (got.has("stars")) {
      // altın avize ışıltısı
      const cy = Math.min(46, py - 8);
      lights.push({ x: x + BAY / 2, y: cy, r: 40, color: "243,212,138" });
      if (!still) for (let k = 0; k < 4; k++) if (Math.floor(t * 3 + k + i) % 4 === 0) px(c, x + BAY / 2 - 14 + k * 9, cy + 6 + (k % 2) * 3, "#fff6c8");
    }
  }
  // taş zemin
  rect(c, 0, fl, w, h - fl, "#2b2620");
  rect(c, 0, fl, w, 1, "#5c5342");
  for (let y = fl + 1, r = 0; y < h; y += 4 + r, r++) {
    rect(c, 0, y, w, 1, "#1d1915");
    for (let x = (r % 2) * 9; x < w; x += 18 + r * 2) rect(c, x, y, 1, 4 + r, "#1d1915");
  }

  const tags: HallTag[] = [];
  if (gap) {
    const mid = Math.round((gap[0] + gap[1]) / 2);
    const { L, R } = span(got);
    const fx = Math.round(mid + (L - R) / 2);
    if (got.has("shield")) shieldWall(c, fx - 28, fl - 46);
    if (got.has("rug")) rug(c, fx - 50, fx + 12, fl);
    if (got.has("chest")) chest(c, fx - 76, fl, t, still);
    const bird = perch(c, fx - 62, fl, 24);
    const pa = parrot(c, bird, 1, "perch", t, still).head;
    if (got.has("hat")) {
      // korsan şapkası
      const [hx, hy] = bird;
      rect(c, hx - 4, hy - 10, 8, 1, P.ink); rect(c, hx - 3, hy - 13, 6, 3, P.ink); px(c, hx - 1, hy - 12, "#fff"); px(c, hx, hy - 12, "#fff");
    }
    tags.push({ who: "parrot", at: [pa[0], pa[1] - (got.has("hat") ? 4 : 0)] });
    const heads = couple(c, fx, fl, t, still, tierOf(level), cheer);
    tags.push({ who: "cengiz", at: heads.cengiz }, { who: "aysenur", at: heads.aysenur });
    const cat = duldul(c, fx + 16, fl + 7, -1, cheer ? "sit" : "rest", 0, t, still).head;
    if (got.has("crown")) {
      // taç: kıvrılmışken kulakların arasında, otururken başın üstünde
      const X = fx + 16, G = fl + 7;
      const cxw = cheer ? X - 3 : X - 7, cyw = cheer ? G - 16 : G - 9;
      rect(c, cxw, cyw, 6, 2, P.ink); rect(c, cxw + 1, cyw, 4, 1, P.gold);
      px(c, cxw, cyw - 1, P.gold); px(c, cxw + 2, cyw - 2, P.gold); px(c, cxw + 2, cyw - 1, P.gold); px(c, cxw + 5, cyw - 1, P.gold); px(c, cxw + 3, cyw, "#d8485a");
    }
    tags.push({ who: "duldul", at: [cat[0], cat[1] - (got.has("crown") ? 3 : 0)] });
    bonfire(c, fx, fl, t, still);
    if (got.has("egg")) egg(c, fx + 9, fl, t, still);
    if (got.has("gandalf")) tags.push({ who: "gandalf", at: wizard(c, fx + 30, fl, t, still).head });
  }

  // genel loşluk, sonra ışıklar
  c.fillStyle = "rgba(16,10,20,0.42)";
  c.fillRect(0, 0, w, h);
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const l of lights) {
    const g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    g.addColorStop(0, `rgba(${l.color},0.2)`);
    g.addColorStop(1, `rgba(${l.color},0)`);
    c.fillStyle = g;
    c.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  c.restore();
  return tags;
}
