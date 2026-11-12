// Karakterin büyük çizimi: tam boy, ön cephe, 96 piksel genişlik (portre bunun üst kısmı, giydirme bebeği tamamı).
// Her parça maske olarak tanımlanır ve Raster ile kendi tonunda çizgi, gölge ve ışıkla boyanır.
// Cilt durumu (lib/care), kıyafet (lib/outfit) ve bakım animasyonları burada uygulanır.
import type { CareState, Effect } from "./care";
import { type HairKind, type Outfit, type Who, BOTTOMS, TOPS } from "./outfit";
import { type Mask, type RGB, Raster, darkOf, lightOf, mixRGB, rgb } from "./raster";

export const FIG_W = 96;
export type FigureFx = { kind: Effect; at: number };
export type FigureOpts = { who: Who; outfit: Outfit; state: CareState | null; fx: FigureFx[]; focus?: boolean; full: boolean };

const CX = 48;
const FX_DUR: Partial<Record<Effect, number>> = { maske: 3.4, kopuk: 3, serum: 3, krem: 3 };
export const fxDur = (k: Effect) => FX_DUR[k] ?? 2.4;

const BODY: Record<Who, { skin: string; hair: string; eye: string; eyeLt: string; lips: string; jaw: number; sh: number; waist: number; hip: number }> = {
  cengiz: { skin: "#eec3a0", hair: "#2b2238", eye: "#4a2e1e", eyeLt: "#8a5a3a", lips: "#b9786a", jaw: 0.3, sh: 21, waist: 15, hip: 16 },
  aysenur: { skin: "#f6d4bf", hair: "#4a2840", eye: "#3a2418", eyeLt: "#7a4a32", lips: "#c86a7a", jaw: 0.44, sh: 19, waist: 13, hip: 17 },
};
const WHITE: RGB = [255, 255, 255], INK: RGB = [24, 14, 34];
const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

/* --------------------------------- geometri --------------------------------- */

const faceHalf = (who: Who) => (y: number) => {
  const yc = 35, b = y < yc ? 20 : 24, dy = Math.abs(y - yc) / b;
  if (dy >= 1) return 0;
  let v = 17 * Math.pow(1 - Math.pow(dy, 2.5), 1 / 2.5);
  if (y > yc) v *= 1 - BODY[who].jaw * Math.pow((y - yc) / 24, 1.7);
  return v;
};
/** kafatasının yarım genişliği: saç bunun üstüne oturur (alnın üstünde yüzden geniştir) */
const skullHalf = (y: number) => 19 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 31) / 25, 2)));
const torsoHalf = (who: Who) => (y: number) => {
  const B = BODY[who];
  if (y < 64 || y > 118) return 0;
  if (y < 70) return B.sh - Math.pow(70 - y, 2) * 0.32;
  if (y < 86) return B.sh - 1.5;
  if (y < 104) return B.sh - 1.5 + ((B.waist - B.sh + 1.5) * (y - 86)) / 18;
  return B.waist + ((B.hip - B.waist) * (y - 104)) / 14;
};
// noktanın doğru parçasına uzaklığı
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return { d: Math.hypot(px - ax - vx * t, py - ay - vy * t), t };
}
const tube = (ax: number, ay: number, bx: number, by: number, r0: number, r1: number): Mask => (x, y) => { const { d, t } = segDist(x + 0.5, y + 0.5, ax, ay, bx, by); return d < r0 + (r1 - r0) * t; };
const ellipse = (cx: number, cy: number, rx: number, ry: number): Mask => (x, y) => Math.pow((x + 0.5 - cx) / rx, 2) + Math.pow((y + 0.5 - cy) / ry, 2) < 1;
const or = (...m: Mask[]): Mask => (x, y) => m.some((f) => f(x, y));
const and = (a: Mask, b: Mask): Mask => (x, y) => a(x, y) && b(x, y);
const not = (a: Mask): Mask => (x, y) => !a(x, y);

/* ----------------------------------- çizim ----------------------------------- */

export function drawFigure(R: Raster, t: number, o: FigureOpts) {
  const B = BODY[o.who], of = o.outfit, s = o.state;
  const face = s?.areas.yuz ?? 0.75, hairScore = s?.areas.sac ?? 0.75, teeth = s?.areas.dis ?? 0.8;
  const study = s?.study ?? { score: 0.5, idleDays: 0, todayMin: 0 };
  const active = o.fx.map((f) => ({ ...f, p: (t - f.at) / fxDur(f.kind) })).filter((f) => f.p >= 0 && f.p < 1);
  const on = (k: Effect) => active.find((f) => f.kind === k);
  const acc = (k: string) => of.acc.find((a) => a.kind === k)?.color;
  const hw = faceHalf(o.who), th = torsoHalf(o.who);

  const dull = face < 0.55 ? ((0.55 - face) / 0.55) * 0.42 : 0;
  const skin = mixRGB(rgb(B.skin), [184, 171, 156], dull), skinDk = darkOf(skin, 0.16), skinLt = lightOf(skin, 0.25);
  const hairC = rgb(of.hairColor ?? B.hair);
  const T = TOPS[of.top.kind], top = rgb(of.top.color);
  const W = R.w, H = R.h;

  /* ---------- arka plan ---------- */
  for (let y = 0; y < H; y++) R.rect(0, y, W, 1, mixRGB([60, 42, 74], [26, 20, 38], y / H));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - CX, (y - 40) * 0.9); if (d < 44) R.set(x, y, [255, 214, 160], 0.16 * (1 - d / 44)); }
  if (o.full) { R.rect(0, H - 8, W, 8, [44, 32, 52]); for (let y = 0; y < 3; y++) R.rect(CX - 22 + y * 2, 171 + y, 44 - y * 4, 1, INK, 0.35); }

  /* ---------- arka saç ---------- */
  hairBack(R, o.who, of.hair, hairC, hw);
  if (acc("sirt-cantasi")) { const c = rgb(acc("sirt-cantasi")!); R.layer(or(ellipse(CX - 22, 70, 7, 9), ellipse(CX + 22, 70, 7, 9)), [10, 58, 86, 82], c); }

  /* ---------- bacaklar, alt giyim, ayakkabı ---------- */
  if (o.full) {
    const legL = tube(CX - 8, 112, CX - 7, 165, 6.4, 4.2), legR = tube(CX + 8, 112, CX + 7, 165, 6.4, 4.2);
    R.layer(or(legL, legR), [28, 108, 68, 168], skin, { dark: skinDk, light: skinLt });
    drawBottom(R, of, o.who);
    drawShoes(R, of);
  }

  /* ---------- boyun ---------- */
  const neckW = o.who === "cengiz" ? 7.5 : 6.5;
  R.layer((x, y) => y >= 50 && y <= 70 && Math.abs(x + 0.5 - CX) < neckW, [36, 50, 60, 70], skin, { dark: skinDk, light: skinLt });
  for (let y = 54; y < 59; y++) R.rect(Math.round(CX - neckW), y, Math.round(neckW * 2), 1, skinDk, 0.55 - (y - 54) * 0.1); // çene gölgesi

  /* ---------- üst giyim ---------- */
  drawTop(R, of, o.who, th, skin, skinDk, skinLt, o.full);

  /* ---------- kollar ve eller ---------- */
  const sx = B.sh - 1;
  for (const side of [-1, 1]) {
    const ax = CX + side * sx, wx = CX + side * (sx + 3), endY = o.full ? 116 : 116;
    const arm = tube(ax, 69, wx, endY, 5, 3.4);
    R.layer(arm, [CX - 32, 62, CX + 32, 120], skin, { dark: skinDk, light: skinLt });
    R.layer(ellipse(wx, endY + 4, 3.6, 4.6), [wx - 5, endY - 2, wx + 5, endY + 10], skin, { dark: skinDk, light: skinLt });
    if (T.sleeve) {
      const len = T.sleeve === 1 ? 84 : 112;
      R.layer(and(tube(ax, 69, wx, endY, 5.8, 4.2), (x, y) => y <= len), [CX - 32, 60, CX + 32, len + 1], top);
      if (T.sleeve === 2) R.layer(and(tube(ax, 69, wx, endY, 5.8, 4.4), (x, y) => y > len - 3 && y <= len), [CX - 32, len - 4, CX + 32, len + 1], darkOf(top, 0.15), { out: null });
      if (of.top.kind === "mont") for (const yy of [78, 90, 102]) R.line(ax + side * -3, yy, ax + side * 6, yy + 1, darkOf(top, 0.25));
    }
  }
  if (acc("saat")) { R.rect(CX + sx + 1, 112, 6, 3, INK); R.rect(CX + sx + 2, 113, 4, 1, rgb(acc("saat")!)); R.set(CX + sx + 3, 113, WHITE); }
  if (acc("bileklik")) { R.rect(CX - sx - 6, 112, 6, 2, rgb(acc("bileklik")!)); if (Math.floor(t * 2) % 3 === 0) R.set(CX - sx - 4, 112, WHITE); }

  /* ---------- gövdedeki aksesuarlar ---------- */
  if (acc("kemer") && of.bottom && !BOTTOMS[of.bottom.kind].skirt && o.full) { const c = rgb(acc("kemer")!); R.rect(CX - B.waist - 1, 103, (B.waist + 1) * 2, 3, c); R.rect(CX - 3, 102, 6, 5, [200, 160, 70]); R.rect(CX - 1, 103, 2, 3, c); }
  if (acc("sirt-cantasi")) { const c = darkOf(rgb(acc("sirt-cantasi")!), 0.2); for (const side of [-1, 1]) R.layer((x, y) => y >= 64 && y <= 100 && Math.abs(x + 0.5 - (CX + side * 11 + (y - 64) * side * 0.05)) < 2.2, [CX - 16, 64, CX + 16, 100], c); }
  if (acc("canta")) {
    const c = rgb(acc("canta")!);
    for (let k = 0; k <= 40; k++) { const x = CX - 13 + k * 0.72, y = 66 + k * 1.1; R.set(x, y, darkOf(c, 0.3)); R.set(x + 1, y, darkOf(c, 0.3)); }
    { R.layer((x, y) => x >= CX + 14 && x <= CX + 27 && y >= 108 && y <= 121, [CX + 13, 107, CX + 28, 122], c); R.rect(CX + 14, 108, 14, 4, darkOf(c, 0.18)); R.rect(CX + 20, 111, 2, 2, [220, 180, 90]); }
  }

  /* ---------- baş ---------- */
  // kulaklar
  for (const side of [-1, 1]) R.layer(ellipse(CX + side * (hw(40) + 0.4), 41, 2.6, 4.4), [CX - 26, 34, CX + 26, 48], skin, { dark: skinDk, light: skinLt });
  R.layer((x, y) => y >= 15 && y <= 59 && Math.abs(x + 0.5 - CX) < hw(y), [28, 14, 68, 60], skin, { dark: skinDk, light: skinLt, shade: 3 });
  // elmacık ışığı ve çene altı
  for (const side of [-1, 1]) for (let k = 0; k < 4; k++) R.set(CX + side * 11 - (side < 0 ? 0 : 1) + k * (side < 0 ? 1 : -1), 41, skinLt, 0.7);

  // cilt durumu
  const maske = on("maske");
  if (maske) {
    const a = maske.p < 0.15 ? maske.p / 0.15 : maske.p > 0.85 ? (1 - maske.p) / 0.15 : 1;
    for (let y = 18; y <= 58; y++) for (let x = CX - 17; x <= CX + 17; x++) if (Math.abs(x + 0.5 - CX) < hw(y) - 1 && !(y >= 34 && y <= 42 && (Math.abs(x - 37) < 6 || Math.abs(x - 59) < 6))) R.set(x, y, [150, 214, 186], 0.88 * a);
  } else {
    const circles = Math.max(face < 0.5 ? (0.5 - face) * 1.6 : 0, study.idleDays >= 3 ? 0.4 : 0, (s?.neglect ?? 0) >= 2 ? 0.3 : 0);
    if (circles > 0.05) for (const x0 of [33, 55]) { R.rect(x0 + 1, 42, 7, 1, [106, 74, 106], Math.min(0.75, circles)); R.rect(x0 + 2, 43, 5, 1, [106, 74, 106], Math.min(0.45, circles * 0.6)); }
    const SPOTS = [[36, 47], [60, 49], [41, 24], [57, 23], [51, 57], [35, 52], [62, 42], [45, 21]];
    const n = face < 0.6 ? Math.ceil(((0.6 - face) / 0.6) * SPOTS.length) : 0;
    SPOTS.slice(0, n).forEach(([x, y]) => { R.set(x, y, [200, 96, 90]); R.set(x + 1, y, [200, 96, 90], 0.5); R.set(x, y - 1, [236, 160, 144]); });
    if (face < 0.35) for (const [x, y] of [[34, 45], [33, 49], [61, 46], [63, 50], [44, 20], [52, 19], [47, 58]]) R.set(x, y, [251, 239, 226]);
    if (face >= 0.65) for (const cx of [CX - 11, CX + 11]) for (let y = -1; y <= 1; y++) for (let x = -3; x <= 3; x++) if (x * x / 9 + y * y < 1) R.set(cx + x, 47 + y, [236, 120, 140], 0.35);
    if (face >= 0.8) for (let k = 0; k < 3; k++) { const q = (t * 0.8 + k / 3) % 1; if (q < 0.4) R.set([CX - 12, CX + 12, CX + 3][k], [40, 41, 22][k], WHITE, 1 - q / 0.4); }
  }

  drawFace(R, o.who, B, skin, skinDk, of, t, study, face, teeth, s?.neglect ?? 0, o.focus ?? false, on("dis"));
  hairFront(R, o.who, of.hair, hairC, hw, skinDk, hairScore, t, on("sac"), on("sampuan"));

  /* ---------- baştaki aksesuarlar ---------- */
  if (acc("kupe")) for (const side of [-1, 1]) { const x = CX + side * (hw(39) + 1.5), c = rgb(acc("kupe")!); R.disc(x, 46, 1, c); R.set(x - 0.5, 45, WHITE); }
  const gl = acc("gunes") ? "gunes" : acc("gozluk") ? "okuma" : null;
  if (gl) {
    const fr: RGB = gl === "gunes" ? INK : rgb(acc("gozluk")!);
    for (const x0 of [31, 53]) {
      for (let y = 34; y <= 42; y++) for (let x = x0; x <= x0 + 12; x++) {
        const edge = y === 34 || y === 42 || x === x0 || x === x0 + 12;
        if (edge) R.set(x, y, fr); else if (gl === "gunes") R.set(x, y, [30, 24, 44], 0.88); else R.set(x, y, [200, 230, 255], 0.12);
      }
      R.set(x0 + 2, 36, WHITE, 0.7); R.set(x0 + 3, 36, WHITE, 0.5);
    }
    R.rect(44, 37, 9, 1, fr);
  }
  if (acc("kulaklik")) {
    const c = rgb(acc("kulaklik")!);
    for (let k = -1; k <= 1.0001; k += 0.01) { const x = CX + k * 22, y = 10 + k * k * 28; R.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, INK); }
    for (let k = -1; k <= 1.0001; k += 0.01) R.set(CX + k * 22, 10 + k * k * 28, c);
    for (const side of [-1, 1]) R.layer(ellipse(CX + side * 21, 40, 4.5, 7), [CX - 27, 32, CX + 27, 48], c);
  }
  if (acc("kurdele")) { const c = rgb(acc("kurdele")!); R.layer(or(ellipse(CX + 9, 12, 5, 3.4), ellipse(CX + 19, 12, 5, 3.4)), [CX + 3, 8, CX + 25, 16], c); R.layer(ellipse(CX + 14, 12, 2, 2), [CX + 11, 9, CX + 17, 15], darkOf(c, 0.2)); }
  const hat = acc("bere") ? "bere" : acc("sapka") ? "sapka" : acc("kep") ? "kep" : null;
  if (hat) drawHat(R, hat, rgb(acc(hat)!));
  if (acc("kolye")) { const c = rgb(acc("kolye")!); for (let x = -8; x <= 8; x++) R.set(CX + x, 66 + Math.round((1 - Math.pow(x / 8, 2)) * 6), c); R.disc(CX, 73, 2, c); R.set(CX - 1, 72, WHITE); }
  if (acc("atki")) {
    const c = rgb(acc("atki")!);
    R.layer(or((x, y) => y >= 60 && y <= 70 && Math.abs(x + 0.5 - CX) < 12 - (y - 60) * 0.2, (x, y) => y >= 66 && y <= 94 && x >= CX + 3 && x <= CX + 10), [CX - 13, 59, CX + 13, 95], c);
    for (let y = 63; y <= 69; y += 3) R.rect(CX - 10, y, 20, 1, darkOf(c, 0.2));
    for (let x = CX + 4; x <= CX + 10; x += 2) R.rect(x, 95, 1, 3, c);
  }
  if (of.scent) for (let k = 0; k < 5; k++) { const q = (t * 0.35 + k / 5) % 1; R.set(CX + 26 + Math.sin(q * 6 + k) * 5, 96 - q * 60, [240, 180, 210], 1 - q); }

  /* ---------- zihin ---------- */
  if (study.idleDays >= 5) { for (const [bx, by] of [[16, 13], [20, 4], [5, 20]]) R.line(0, 0, bx, by, [220, 220, 230], 0.5); for (const r of [6, 11]) for (let k = 0; k <= 6; k++) { const a = (k / 6) * (Math.PI / 2); R.set(Math.cos(a) * r * 1.2, Math.sin(a) * r, [220, 220, 230], 0.6); } }
  const sleepy = study.idleDays >= 3 && !o.focus;
  if (sleepy) for (let k = 0; k < 2; k++) { const q = (t * 0.4 + k / 2) % 1; const x = CX + 22 + q * 10, y = 16 - q * 12, a = 1 - q; R.rect(Math.round(x), Math.round(y), 4, 1, [243, 212, 138], a); R.set(x + 2, y + 1, [243, 212, 138], a); R.set(x + 1, y + 2, [243, 212, 138], a); R.rect(Math.round(x), Math.round(y) + 3, 4, 1, [243, 212, 138], a); }
  if (o.focus || study.score >= 0.8 || study.todayMin >= 60) {
    const q = (Math.sin(t * 3) + 1) / 2;
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [0, 2]]) R.set(CX - 24 + dx, 12 + dy, dx || dy ? [255, 236, 170] : WHITE, dx || dy ? 0.3 + 0.6 * q : 1);
    R.set(CX + 25, 8, [255, 236, 170], 1 - q);
  }

  for (const f of active) drawFx(R, f.kind, f.p, t, skin, hw);
}

/* ---------------------------------- yüz ---------------------------------- */

function drawFace(R: Raster, who: Who, B: (typeof BODY)["cengiz"], skin: RGB, skinDk: RGB, of: Outfit, t: number, study: CareState["study"], face: number, teeth: number, neglect: number, focus: boolean, dis?: { p: number }) {
  const hairC = rgb(of.hairColor ?? B.hair), browC = darkOf(hairC, 0.1);
  // kaşlar: kalın başlar, dışa doğru incelir; odaklanınca iç uçlar iner
  for (const side of [-1, 1]) {
    for (let k = 0; k < 10; k++) {
      const x = side < 0 ? 32 + k : 64 - k, arch = Math.round(Math.sin((k / 9) * Math.PI) * 1.6), y = 32 - arch + (focus && k > 7 ? 1 : 0);
      R.set(x, y, browC); if (k > 3 || who === "cengiz") R.set(x, y + 1, browC);
    }
  }
  const blink = (t + (who === "cengiz" ? 0 : 1.9)) % 4.2 < 0.14, sleepy = study.idleDays >= 3 && !focus;
  const look = Math.floor(t / 3.1) % 5 === 3 ? 1 : Math.floor(t / 3.1) % 7 === 5 ? -1 : 0;
  const eye = rgb(B.eye), eyeLt = rgb(B.eyeLt);
  for (const x0 of [33, 55]) {
    const outer = x0 < CX ? x0 - 1 : x0 + 9;
    if (blink) { for (let x = x0; x <= x0 + 8; x++) R.set(x, 39 + (x === x0 || x === x0 + 8 ? -1 : 0), INK); if (who === "aysenur") R.set(outer, 37, INK); continue; }
    // göz akı
    for (let y = 36; y <= 40; y++) for (let x = x0; x <= x0 + 8; x++) { const inset = y === 36 || y === 40 ? 1 : 0; if (x >= x0 + inset && x <= x0 + 8 - inset) R.set(x, y, [250, 246, 244]); }
    // iris: üstü koyu, altı açık; bebek, iki parıltı
    const ix = x0 + 2 + look;
    for (let y = 36; y <= 40; y++) for (let x = ix; x < ix + 5; x++) { if ((y === 36 || y === 40) && (x === ix || x === ix + 4)) continue; R.set(x, y, y < 38 ? eye : eyeLt); }
    R.rect(ix + 1, 37, 3, 2, INK);
    R.set(ix + 1, 36, WHITE); R.set(ix + 2, 36, WHITE); R.set(ix + 3, 39, WHITE, 0.8);
    // üst kapak ve kirpik; alt kapak gölgesi
    for (let x = x0; x <= x0 + 8; x++) R.set(x, 35, INK);
    if (who === "aysenur") { for (let x = x0 + 2; x <= x0 + 6; x++) R.set(x, 34, INK); R.set(outer, 34, INK); R.set(x0 < CX ? outer - 1 : outer + 1, 33, INK); }
    for (let x = x0 + 1; x <= x0 + 7; x++) R.set(x, 41, skinDk, 0.8);
    if (sleepy) { R.rect(x0, 33, 9, 4, skin); for (let x = x0; x <= x0 + 8; x++) R.set(x, 37, INK); }
  }
  // burun
  for (let y = 41; y < 48; y++) R.set(CX + 1, y, skinDk, 0.7);
  R.set(CX - 1, 46, lightOf(skin, 0.4)); R.set(CX - 3, 48, skinDk); R.set(CX + 3, 48, skinDk); R.rect(CX - 2, 49, 5, 1, skinDk, 0.35);
  // ağız
  const lips = rgb(of.lips ?? B.lips), lipsLt = lightOf(lips, 0.3);
  const happy = face >= 0.6 && neglect < 2, sad = face < 0.3 || neglect >= 3, yawn = sleepy && (t % 7) < 1.2;
  if (dis) {
    R.rect(CX - 6, 51, 13, 5, INK); R.rect(CX - 5, 51, 11, 2, teeth >= 0.5 ? WHITE : [240, 226, 176]); R.rect(CX - 4, 54, 9, 1, [168, 64, 74]);
    R.set(CX + 9 + dis.p * 4, 49 - dis.p * 5, WHITE, 1 - dis.p);
  } else if (yawn) { R.layer(ellipse(CX, 53, 2.5, 3), [CX - 4, 49, CX + 4, 57], [90, 30, 40]); }
  else if (happy) {
    for (let x = -5; x <= 5; x++) R.set(CX + x, 52 - (Math.abs(x) >= 4 ? 1 : 0), lips);
    for (let x = -3; x <= 3; x++) R.set(CX + x, 53, lipsLt);
    R.set(CX - 6, 50, skinDk, 0.6); R.set(CX + 6, 50, skinDk, 0.6);
  } else if (sad) { for (let x = -4; x <= 4; x++) R.set(CX + x, 52 + (Math.abs(x) >= 3 ? 1 : 0), lips); }
  else { for (let x = -4; x <= 4; x++) R.set(CX + x, 52, lips); for (let x = -2; x <= 2; x++) R.set(CX + x, 53, lipsLt, 0.7); }
  if (of.lips) { R.set(CX - 2, 52, lightOf(lips, 0.5)); R.set(CX + 1, 53, lightOf(lips, 0.6)); }
  if (who === "cengiz") for (let y = 54; y <= 59; y++) for (let x = CX - 10; x <= CX + 10; x++) if (rnd(x * 31 + y) < 0.12) R.set(x, y, darkOf(skin, 0.18), 0.5); // hafif sakal izi
}

/* ---------------------------------- saç ---------------------------------- */

function hairBack(R: Raster, who: Who, kind: HairKind, c: RGB, hw: (y: number) => number) {
  const box: [number, number, number, number] = [10, 2, 86, 118];
  const opts = { dark: darkOf(c, 0.35), light: lightOf(c, 0.15) };
  if (who === "aysenur") {
    const head = (x: number, y: number) => y >= 6 && y <= 44 && Math.abs(x + 0.5 - CX) < skullHalf(y) + 2.5;
    if (kind === "dalgali") R.layer((x, y) => head(x, y) || (y > 30 && y <= 112 && Math.abs(x + 0.5 - CX) < 21 + Math.sin(y * 0.32) * 1.8 - Math.max(0, y - 96) * 0.25), box, c, opts);
    else if (kind === "orgu") { R.layer(head, box, c, opts); for (let k = 0; k < 7; k++) R.layer(ellipse(CX + 17 + Math.sin(k) * 0.6, 50 + k * 8, 4.6, 5.2), [CX + 10, 42, CX + 25, 110], c, opts); R.layer(ellipse(CX + 17, 106, 2.4, 3), [CX + 13, 102, CX + 21, 112], [200, 80, 110]); }
    else if (kind === "atkuyrugu") { R.layer(head, box, c, opts); R.layer(tube(CX + 18, 22, CX + 24, 82, 5, 2.4), [CX + 10, 16, CX + 32, 88], c, opts); }
    else { R.layer(head, box, c, opts); }
  } else if (kind === "kivircik") {
    R.layer((x, y) => y >= 4 && y <= 36 && Math.abs(x + 0.5 - CX) < skullHalf(y) + 4, box, c, opts);
  }
}

function hairFront(R: Raster, who: Who, kind: HairKind, c: RGB, hw: (y: number) => number, skinDk: RGB, score: number, t: number, sac?: { p: number }, sampuan?: { p: number }) {
  const opts = { dark: darkOf(c, 0.35), light: lightOf(c, 0.18) };
  const half = (y: number, extra: number) => skullHalf(y) + extra;
  let m: Mask;
  if (who === "aysenur") {
    const crown = (x: number, y: number) => y >= 6 && y <= 22 && Math.abs(x + 0.5 - CX) < half(y, 1.5);
    const bangs = (x: number, y: number) => y >= 15 && y <= 27 && Math.abs(x + 0.5 - CX) < hw(y) + 1 && x + 0.5 < CX + 6 - (y - 15) * 1.9; // yandan kâkül
    const sides = (x: number, y: number) => {
      // yanlardan inen tutamlar yüzün dışında kalır; çenenin altında birleşmez, omuzlara düz iner
      const end = kind === "dalgali" || kind === "orgu" ? 70 : 40, hx = Math.max(hw(Math.min(y, 46)), skullHalf(Math.min(y, 31)) - 1.5);
      return y >= 18 && y <= end && ((x + 0.5 > CX - hx - 3.5 && x + 0.5 < CX - hx + 1) || (x + 0.5 < CX + hx + 3.5 && x + 0.5 > CX + hx - 1));
    };
    m = or(crown, bangs, sides);
  } else {
    // kısa saç: soldan sağa yükselen yana taranmış perçem, uçlarda tutamlar (kâse kesim gibi düz bitmesin)
    const fringe = (x: number) => (kind === "geriye" ? 17 : kind === "daginik" ? 24 + Math.round(rnd(x) * 3) : Math.round(18 + Math.max(0, CX + 4 - x) * 0.3 + ((x * 7) % 5 < 2 ? 1.5 : 0)));
    const topY = (x: number) => (kind === "daginik" ? 4 + (x % 6 < 3 ? -1 : 2) : kind === "geriye" ? 4 : 6);
    if (kind === "kivircik") {
      const curls: Mask[] = [];
      for (let k = 0; k < 13; k++) { const a = Math.PI + (k / 12) * Math.PI; curls.push(ellipse(CX + Math.cos(a) * 17, 22 + Math.sin(a) * 14, 4.6, 4.2)); }
      m = or(...curls, (x, y) => y >= 6 && y <= 22 && Math.abs(x + 0.5 - CX) < half(y, 1));
    } else m = (x, y) => {
      if (y < topY(x) || y > 34) return false;
      const d = Math.abs(x + 0.5 - CX), hh = half(y, kind === "daginik" ? 2.5 : 1.5);
      if (d >= hh) return false;
      if (y <= fringe(x)) return true;
      return d > hw(Math.min(59, y)) - 1.5 && y <= 31; // şakak ve favori
    };
  }
  R.layer(m, [10, 0, 86, 70], c, opts);
  // saçın alnına düşen gölgesi
  for (let x = CX - 16; x <= CX + 16; x++) for (let y = 15; y < 32; y++) if (!m(x, y) && m(x, y - 1) && Math.abs(x + 0.5 - CX) < hw(y) - 1) { R.set(x, y, skinDk, 0.55); break; }
  // tutam çizgileri ve parlak halka
  for (let k = 0; k < 14; k++) { const x = CX - 14 + k * 2.2, y0 = 10 + (k % 3); for (let y = y0; y < y0 + 6; y++) if (m(Math.round(x + (y - y0) * 0.3), y)) R.set(x + (y - y0) * 0.3, y, darkOf(c, 0.22), 0.7); }
  for (let x = CX - 11; x <= CX + 5; x++) { const y = Math.round(14 - Math.sin(((x - CX + 11) / 16) * Math.PI) * 2); if (m(x, y)) { R.set(x, y, lightOf(c, score >= 0.8 ? 0.55 : 0.35)); if (m(x, y + 1) && x % 3) R.set(x, y + 1, lightOf(c, 0.2)); } }
  if (who === "aysenur" && kind !== "topuz") { R.layer((x, y) => x >= CX + 8 && x <= CX + 13 && y >= 13 && y <= 15, [CX + 7, 12, CX + 14, 16], [226, 180, 90]); } // altın toka
  if (kind === "topuz") { R.layer(ellipse(CX + 1, 7, 8, 6.5), [CX - 8, 0, CX + 10, 14], c, opts); for (let k = 0; k < 3; k++) R.set(CX - 3 + k * 3, 5 + k, darkOf(c, 0.25)); }
  // saçın durumu
  if (score < 0.4) for (const [x, y] of [[CX - 18, 10], [CX - 12, 4], [CX + 4, 3], [CX + 14, 6], [CX + 19, 12], [CX - 20, 16], [CX + 21, 20]]) { R.set(x, y, c); R.set(x + 1, y + 1, c); R.set(x - 1, y + 2, c); }
  const sweep = sac ? sac.p : score >= 0.8 ? (t * 0.25) % 1.6 : -1;
  if (sweep >= 0 && sweep <= 1) for (let k = 0; k < 8; k++) { const x = CX - 18 + sweep * 36 + k, y = 8 + k; if (m(Math.round(x), y)) R.set(x, y, WHITE, 0.45); }
  if (sac) for (let k = 0; k < 5; k++) { const q = (sac.p * 2 + k / 5) % 1; R.set(CX - 14 + k * 7, 10 + q * 6, [255, 236, 190], 1 - q); }
  if (sampuan) for (let k = 0; k < 11; k++) R.disc(CX - 17 + k * 3.4, 10 + (k % 3) * 3, Math.round(1 + Math.sin(Math.PI * Math.min(1, sampuan.p * 1.5)) * (1 + (k % 2))), WHITE, 0.85);
}

function drawHat(R: Raster, kind: "bere" | "sapka" | "kep", c: RGB) {
  if (kind === "bere") {
    R.layer((x, y) => y >= 2 && y <= 22 && Math.abs(x + 0.5 - CX) < 20 * Math.sqrt(Math.max(0, 1 - Math.pow((21 - y) / 19.5, 2))), [24, 1, 72, 23], c);
    for (let x = CX - 18; x <= CX + 18; x += 3) R.rect(x, 18, 1, 4, darkOf(c, 0.3));
    R.rect(CX - 19, 17, 38, 1, darkOf(c, 0.2));
    R.layer(ellipse(CX, 2, 3.5, 3), [CX - 4, -2, CX + 4, 6], lightOf(c, 0.2));
  } else if (kind === "sapka") {
    R.layer(ellipse(CX, 17, 26, 3.6), [20, 12, 76, 22], c);
    R.layer((x, y) => y >= 3 && y <= 17 && Math.abs(x + 0.5 - CX) < 14 - Math.max(0, 6 - y) * 0.8, [32, 2, 64, 18], c);
    R.rect(CX - 13, 13, 26, 3, darkOf(c, 0.35));
  } else {
    R.layer((x, y) => y >= 4 && y <= 19 && Math.abs(x + 0.5 - CX) < 18 * Math.sqrt(Math.max(0, 1 - Math.pow((19 - y) / 15.5, 2))), [28, 3, 68, 20], c);
    R.layer((x, y) => y >= 18 && y <= 21 && x >= CX - 10 && x <= CX + 22, [CX - 11, 17, CX + 23, 22], darkOf(c, 0.12));
    R.rect(CX - 1, 4, 3, 2, darkOf(c, 0.3));
  }
}

/* -------------------------------- kıyafetler -------------------------------- */

function pattern(R: Raster, m: Mask, box: [number, number, number, number], of: Outfit) {
  const p = of.top.pattern; if (!p) return;
  const c2 = rgb(of.top.color2 ?? "#f2ede4");
  for (let y = box[1]; y <= box[3]; y++) for (let x = box[0]; x <= box[2]; x++) {
    if (!m(x, y)) continue;
    if (p === "cizgili" && y % 6 < 2) R.set(x, y, c2, 0.85);
    else if (p === "kareli" && (x % 8 < 2 || y % 8 < 2)) R.set(x, y, c2, x % 8 < 2 && y % 8 < 2 ? 0.75 : 0.45);
    else if (p === "puantiyeli" && (x + (Math.floor(y / 5) % 2) * 3) % 6 === 0 && y % 5 === 2) { R.set(x, y, c2); R.set(x + 1, y, c2, 0.6); }
  }
}

function drawTop(R: Raster, of: Outfit, who: Who, th: (y: number) => number, skin: RGB, skinDk: RGB, skinLt: RGB, full: boolean) {
  const kind = of.top.kind, T = TOPS[kind], c = rgb(of.top.color), B = BODY[who];
  const box: [number, number, number, number] = [CX - 26, 50, CX + 26, 170];
  const torso = (x: number, y: number) => Math.abs(x + 0.5 - CX) < th(y) + (kind === "mont" ? 2 : 0);
  const end = kind === "crop" ? 96 : kind === "mont" || kind === "hirka" || kind === "ceket" || kind === "deri-ceket" ? 120 : 112;
  const bareTop = T.sleeve === 0; // askılı, atlet, uzun elbise: omuzlar açık
  // açık yakalı ve kolsuzlarda gövde teni
  R.layer((x, y) => torso(x, y) && y >= 64 && y <= 80, box, skin, { dark: skinDk, light: skinLt, out: darkOf(skin, 0.5) });
  const neckCut = (x: number, y: number) => {
    const d = Math.abs(x + 0.5 - CX);
    if (kind === "balikci") return false;
    if (bareTop) return y < 72 && !(d > 7 && d < 11 && y >= 64);
    if (kind === "tisort" || kind === "kazak" || kind === "hoodie" || kind === "crop" || kind === "mont") return d < 7 && y < 67 + Math.max(0, 3 - d * 0.4);
    if (kind === "polo" || kind === "gomlek") return d < 4 && y < 70;
    return d < (78 - y) * 0.55 && y < 78; // V yaka: bluz, elbise, ceketler
  };
  if (T.open) {
    const inner = rgb(of.top.inner ?? "#f2ede4");
    R.layer((x, y) => torso(x, y) && y >= 64 && y <= 112 && !((Math.abs(x + 0.5 - CX) < 6) && y < 67), box, inner);
    const jacket = (x: number, y: number) => torso(x, y) && y >= 64 && y <= end && Math.abs(x + 0.5 - CX) > (y < 92 ? 3 + (92 - y) * 0.3 : 3);
    R.layer(jacket, box, c);
    pattern(R, jacket, box, of);
    const dk = darkOf(c, 0.3);
    if (kind === "ceket") { for (const side of [-1, 1]) for (let y = 66; y < 86; y++) R.set(CX + side * (3 + (92 - y) * 0.3 + 1), y, dk); for (const y of [96, 104]) R.disc(CX - 5, y, 1, [200, 160, 70]); R.rect(CX - 14, 100, 6, 1, dk); R.rect(CX + 9, 100, 6, 1, dk); }
    if (kind === "deri-ceket") { R.line(CX - 4, 68, CX + 3, 118, [200, 200, 210]); for (let k = 0; k < 6; k++) R.set(CX - 14 + k, 76 + k, lightOf(c, 0.4)); R.rect(CX - 15, 100, 7, 2, dk); }
    if (kind === "hirka") { for (const y of [80, 88, 96, 104]) R.disc(CX - 5, y, 1, lightOf(c, 0.3)); for (let y = 114; y <= 120; y += 2) R.rect(CX - B.hip, y, B.hip * 2, 1, dk); }
  } else {
    const cloth = (x: number, y: number) => torso(x, y) && y >= (bareTop ? 64 : 64) && y <= end && !neckCut(x, y);
    const neckBand = (x: number, y: number) => kind === "balikci" && y >= 54 && y <= 67 && Math.abs(x + 0.5 - CX) < 9;
    R.layer(or(cloth, neckBand), box, c);
    pattern(R, cloth, box, of);
    const dk = darkOf(c, 0.25);
    if (bareTop) { for (const side of [-1, 1]) R.layer((x, y) => y >= 63 && y < 72 && Math.abs(x + 0.5 - (CX + side * 9)) < 1.6, box, c, { out: null }); R.rect(CX - 14, 72, 28, 1, dk); }
    if (kind === "balikci" || kind === "kazak") { for (let y = 56; y <= 66; y += 2) if (kind === "balikci") R.rect(CX - 8, y, 16, 1, dk); for (let y = end - 4; y <= end; y += 2) R.rect(CX - Math.round(th(y)) + 1, y, Math.round(th(y)) * 2 - 2, 1, dk); for (let y = 76; y < end - 6; y += 4) for (let x = CX - 12; x <= CX + 12; x += 4) R.set(x + (y % 8 ? 2 : 0), y, dk, 0.45); }
    if (kind === "tisort" || kind === "crop" || kind === "mont" || kind === "hoodie") for (let x = -7; x <= 7; x++) R.set(CX + x, 67 + Math.max(0, 3 - Math.abs(x) * 0.4), dk);
    if (kind === "gomlek" || kind === "polo") {
      const col = lightOf(c, 0.15);
      for (const side of [-1, 1]) R.layer((x, y) => y >= 63 && y <= 70 && side * (x + 0.5 - CX) > 1 && side * (x + 0.5 - CX) < 9 - (y - 63) * 0.6, box, col);
      for (let y = 73; y <= (kind === "polo" ? 82 : 110); y += 6) R.set(CX, y, lightOf(c, 0.5));
      if (kind === "gomlek") R.rect(CX - 12, 80, 6, 5, dk, 0.5);
    }
    if (kind === "hoodie") { R.layer(and(ellipse(CX, 66, 15, 5), not(ellipse(CX, 64, 9, 4))), box, darkOf(c, 0.12)); R.line(CX - 4, 69, CX - 4, 82, [242, 237, 228]); R.line(CX + 3, 69, CX + 3, 82, [242, 237, 228]); R.layer((x, y) => y >= 94 && y <= 106 && Math.abs(x + 0.5 - CX) < 9 - (106 - y) * 0.15, box, darkOf(c, 0.1)); }
    if (kind === "bluz") { for (let k = 0; k < 9; k++) R.set(CX - 4 + k, 79 + (k % 2), lightOf(c, 0.35)); for (const side of [-1, 1]) R.layer(ellipse(CX + side * (B.sh + 1), 72, 6, 5), box, c); }
    if (kind === "mont") for (const y of [76, 86, 96, 106]) R.rect(CX - Math.round(th(y)) - 1, y, Math.round(th(y)) * 2 + 2, 1, dk);
    if (kind === "crop") { R.set(CX, 103, skinDk); }
  }
  // elbise eteği
  if (T.dress && full) {
    const endY = T.dress === "uzun" ? 166 : 142;
    const skirt = (x: number, y: number) => y >= 102 && y <= endY + (Math.sin(x * 0.7) > 0.6 ? 1 : 0) && Math.abs(x + 0.5 - CX) < B.waist + (y - 102) * (T.dress === "uzun" ? 0.28 : 0.42);
    R.layer(skirt, [CX - 34, 100, CX + 34, 170], c);
    pattern(R, skirt, [CX - 34, 100, CX + 34, 170], of);
    for (let k = -2; k <= 2; k++) R.line(CX + k * 7, 112, CX + k * 9, endY - 1, darkOf(c, 0.18), 0.7);
    R.rect(CX - B.waist, 102, B.waist * 2, 2, darkOf(c, 0.2));
  }
}

function drawBottom(R: Raster, of: Outfit, who: Who) {
  const b = of.bottom; if (!b) return;
  const K = BOTTOMS[b.kind], c = rgb(b.color), dk = darkOf(c, 0.25), B = BODY[who];
  const box: [number, number, number, number] = [CX - 34, 98, CX + 34, 170];
  const hipBlock = (x: number, y: number) => y >= 102 && y <= 122 && Math.abs(x + 0.5 - CX) < B.hip + 0.5;
  if (K.skirt) {
    const endY = K.skirt === "mini" ? 130 : K.skirt === "midi" ? 148 : 166, flare = K.skirt === "uzun" ? 0.24 : 0.36;
    const m = (x: number, y: number) => y >= 101 && y <= endY && Math.abs(x + 0.5 - CX) < B.hip - 2 + (y - 101) * flare;
    R.layer(m, box, c);
    R.rect(CX - B.waist - 1, 101, (B.waist + 1) * 2, 3, dk);
    const pleats = b.kind === "pileli-etek" ? 6 : 3;
    for (let k = -pleats; k <= pleats; k++) R.line(CX + k * (14 / pleats), 106, CX + k * (17 / pleats) * 1.2, endY - 1, dk, b.kind === "pileli-etek" ? 0.9 : 0.5);
    return;
  }
  const endY = K.short ? 132 : b.kind === "tayt" ? 160 : 162;
  const grow = b.kind === "bol-jean" ? 3.5 : b.kind === "kargo" || b.kind === "esofman" ? 1.4 : b.kind === "tayt" ? -0.6 : 0.4;
  const leg = (side: number) => tube(CX + side * 8, 112, CX + side * (7 + (b.kind === "bol-jean" ? 1.5 : 0)), 165, 7.2, 5 + grow);
  const m = (x: number, y: number) => y >= 101 && y <= endY && (hipBlock(x, y) || leg(-1)(x, y) || leg(1)(x, y));
  R.layer(m, box, c);
  R.line(CX, 116, CX, endY, darkOf(c, 0.45)); // bacak arası
  R.rect(CX - B.waist - 1, 101, (B.waist + 1) * 2, 3, dk);
  if (b.kind === "jean" || b.kind === "bol-jean" || (b.kind === "sort" && b.color === "#4a6a9a")) {
    for (const side of [-1, 1]) { R.line(CX + side * 4, 104, CX + side * 3, endY - 1, lightOf(c, 0.25), 0.7); R.line(CX + side * 12, 106, CX + side * 8, 112, lightOf(c, 0.3), 0.8); }
    R.set(CX, 103, [210, 170, 80]); R.rect(CX - 1, 105, 1, 8, dk);
  }
  if (b.kind === "kargo") for (const side of [-1, 1]) { R.layer((x, y) => y >= 128 && y <= 140 && Math.abs(x + 0.5 - (CX + side * 13)) < 3.6, box, darkOf(c, 0.08)); R.rect(CX + side * 13 - 3, 128, 7, 2, dk); }
  if (b.kind === "esofman") for (const side of [-1, 1]) { R.line(CX + side * 14, 106, CX + side * 12, endY - 4, [242, 237, 228]); R.rect(CX + side * 7 - 6, endY - 3, 12, 3, dk); }
  if (b.kind === "pantolon") for (const side of [-1, 1]) R.line(CX + side * 8, 112, CX + side * 7, endY - 1, lightOf(c, 0.18), 0.8);
}

function drawShoes(R: Raster, of: Outfit) {
  const s = of.shoes, c = rgb(s.color), dk = darkOf(c, 0.3), sole: RGB = [242, 237, 228];
  for (const side of [-1, 1]) {
    const fx = CX + side * 8, box: [number, number, number, number] = [fx - 12, 118, fx + 12, 172];
    switch (s.kind) {
      case "cizme": R.layer((x, y) => (y >= 126 && y <= 166 && Math.abs(x + 0.5 - (fx - side)) < 5.6) || ellipse(fx + side * 1.5, 168, 7, 3.5)(x, y), box, c); R.rect(fx - 6, 126, 11, 2, dk); break;
      case "bot": R.layer((x, y) => (y >= 150 && y <= 166 && Math.abs(x + 0.5 - (fx - side)) < 5.8) || ellipse(fx + side * 1.5, 168, 7, 3.5)(x, y), box, c); R.rect(fx - 6, 169, 13, 2, darkOf(c, 0.5)); R.set(fx - side, 154, lightOf(c, 0.3)); R.set(fx - side, 158, lightOf(c, 0.3)); break;
      case "converse": R.layer((x, y) => (y >= 152 && y <= 166 && Math.abs(x + 0.5 - (fx - side)) < 5.4) || ellipse(fx + side * 1.5, 167.5, 7, 3.4)(x, y), box, c); R.layer(ellipse(fx + side * 3, 168, 3.4, 2.4), box, sole, { out: null }); R.rect(fx - 6, 170, 13, 1, sole); R.disc(fx - side * 3, 157, 1, sole); break;
      case "topuklu": R.layer(ellipse(fx + side * 1, 167, 5.6, 2.8), box, c); R.rect(fx - side * 4 - 1, 168, 2, 4, darkOf(c, 0.4)); R.set(fx + side * 2, 166, lightOf(c, 0.5)); break;
      case "babet": R.layer(ellipse(fx + side * 1.2, 168, 6.6, 2.6), box, c); R.set(fx + side * 3, 167, lightOf(c, 0.5)); break;
      case "mokasen": R.layer(ellipse(fx + side * 1.4, 167.5, 7, 3.2), box, c); R.rect(fx - 1, 166, 5, 1, dk); break;
      case "sandalet": R.rect(fx - 6, 170, 13, 2, c); for (const y of [164, 167]) R.rect(fx - 5, y, 11, 1, c); break;
      default: R.layer(ellipse(fx + side * 1.6, 167, 7.4, 3.6), box, c); R.rect(fx - 6 + side, 169, 14, 2, sole); R.line(fx - 3 + side * 2, 166, fx + 2 + side * 2, 165, dk); // spor
    }
  }
}

/* ---------------------------- bakım animasyonları ---------------------------- */

function drawFx(R: Raster, kind: Effect, p: number, t: number, skin: RGB, hw: (y: number) => number) {
  const fade = (a: number) => (p < 0.1 ? p / 0.1 : p > 0.85 ? (1 - p) / 0.15 : 1) * a;
  const SPOTS = [[CX, 24], [CX - 11, 45], [CX + 11, 45], [CX, 57], [CX, 43]];
  const inFace = (x: number, y: number) => y >= 15 && y <= 59 && Math.abs(x + 0.5 - CX) < hw(y);
  switch (kind) {
    case "kopuk":
      for (let k = 0; k < 20; k++) {
        const x = CX - 13 + (k % 5) * 6.5 + rnd(k) * 3, y = 22 + Math.floor(k / 5) * 9 + rnd(k + 20) * 4;
        const r = Math.round(1 + 2.2 * Math.sin(Math.PI * Math.min(1, p * 1.7 + rnd(k) * 0.2)));
        if (p < 0.62 && r > 0) { R.disc(x, y, r, WHITE, 0.92); R.set(x - 1, y - 1, [207, 232, 255]); }
      }
      if (p >= 0.55) for (let k = 0; k < 10; k++) { const q = ((p - 0.55) * 3 + k / 10) % 1; R.set(CX - 14 + k * 3, 20 + q * 42, [150, 200, 255], 1 - q); }
      break;
    case "tonik":
      for (let k = 0; k < 22; k++) { const q = (p * 1.4 + k / 22) % 1, x = 2 + q * 46, y = 24 + rnd(k) * 34 + Math.sin(q * 5) * 2; if (inFace(Math.round(x), Math.round(y)) || x < CX - 17) R.set(x, y, [180, 225, 255], fade(0.9)); }
      break;
    case "serum": {
      const py = Math.min(1, p / 0.3) * 12;
      R.rect(CX - 1, py - 12, 3, 10, [200, 230, 255], 0.75); R.rect(CX - 2, py - 15, 5, 4, [58, 51, 70]); R.set(CX, py - 2, [240, 184, 96]);
      if (p > 0.3) for (const [x, y] of SPOTS.slice(0, 4)) { const q = Math.min(1, (p - 0.3) / 0.25); R.set(x, y - 5 + q * 5, [240, 184, 96]); if (q >= 1) R.set(x, y + 1, mixRGB(skin, [240, 184, 96], 0.4)); }
      if (p > 0.6) for (let k = 0; k < 6; k++) if ((t * 4 + k) % 2 < 1) R.set(CX - 12 + k * 5, 26 + (k % 3) * 11, [255, 230, 160], 0.9);
      break;
    }
    case "krem":
      for (const [x, y] of SPOTS) {
        if (p < 0.5) { R.rect(x - 1, y - 1, 3, 2, WHITE); R.set(x, y, [244, 234, 210]); }
        else R.disc(x, y, Math.round(1 + (p - 0.5) * 7), [255, 250, 240], Math.max(0, (1 - p) * 1.1));
      }
      if (p > 0.7) for (let k = 0; k < 3; k++) R.set([CX - 12, CX + 12, CX + 3][k], [40, 41, 22][k], WHITE);
      break;
    case "gunes":
      for (let y = 17; y <= 58; y++) for (let x = CX - 17; x <= CX + 17; x++) if (inFace(x, y)) R.set(x, y, WHITE, fade(0.32));
      R.disc(84, 12, 5, [243, 200, 74]); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + t; R.set(84 + Math.cos(a) * 8, 12 + Math.sin(a) * 8, [243, 200, 74]); }
      break;
    case "peeling":
      for (let k = 0; k < 18; k++) { const a = t * 5 + k; R.set(CX + (k % 2 ? -11 : 11) + Math.cos(a) * 4, 44 + (k % 3) * 5 + Math.sin(a) * 2, k % 2 ? [232, 208, 176] : WHITE); }
      break;
    case "vucut":
      for (let k = 0; k < 8; k++) { const q = (p * 1.2 + k / 8) % 1; R.disc(CX + (k % 2 ? 28 : -28) + Math.sin(q * 6) * 3, 100 - q * 26, 2, WHITE, 0.5 * (1 - q)); }
      for (let k = 0; k < 4; k++) if ((t * 3 + k) % 2 < 1) R.set(CX - 5 + k * 3, 64, WHITE);
      break;
    case "deodorant":
      for (let k = 0; k < 3; k++) for (let s = 0; s < 12; s++) { const q = s / 12; R.set(CX + 24 + q * 14, 92 - k * 5 - Math.sin(q * Math.PI + p * 6) * 3, [160, 230, 200], fade(0.8 * (1 - q))); }
      break;
    case "onarim":
      for (let k = 0; k < 3; k++) { const q = (p + k / 3) % 1, x = CX + 14 + k * 4, y = 48 - q * 18, a = 1 - q; R.rect(x - 1, Math.round(y), 3, 1, [120, 220, 150], a); R.rect(x, Math.round(y) - 1, 1, 3, [120, 220, 150], a); }
      break;
    case "parilti":
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + p * 4; R.set(CX + Math.cos(a) * 26, 40 + Math.sin(a) * 28, [255, 236, 170], fade(1)); }
      break;
    default:
  }
}
