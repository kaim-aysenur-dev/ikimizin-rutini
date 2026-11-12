// Yakın plan portre: boyundan yukarısı, ön cephe, 64x72 dünya pikseli. Cilt aynası ve giyinme ekranı kullanır.
// Cilt durumu bölge puanlarından (lib/care): matlık, göz altı, sivilce, kuruluk, allık, ışıltı; saç elektriklenmesi ya da parlaklığı.
// Bakım adımı işaretlenince yüzde uygulama animasyonu oynar (köpük, serum damlası, krem, maske...).
import type { CareState, Effect } from "./care";
import { type Ctx, P, disc, line, px, rect } from "./pixel";

export const PORTRAIT_SIZE: [number, number] = [64, 72];

export type Neckline = "yuvarlak" | "v" | "yaka" | "balikci" | "askili" | "kapsonlu";
export type PortraitLook = {
  top: string; topDk: string; neck: Neckline; trim?: string;
  lips?: string | null; earrings?: string | null; necklace?: string | null;
  glasses?: "okuma" | "gunes" | null; hat?: { kind: "bere" | "sapka"; color: string } | null; headphones?: string | null; scent?: boolean;
};
export type PortraitFx = { kind: Effect; at: number };
// body: gövdeyi başkası çizer (tam boy giydirme bebeği); yoksa omuzlarıyla göğüs kısmı çizilir
export type PortraitOpts = { who: "cengiz" | "aysenur"; state: CareState | null; look: PortraitLook; fx: PortraitFx[]; focus?: boolean; body?: (c: Ctx) => void };

const BODY = {
  cengiz: { skin: "#efc4a2", dk: "#d49b7a", lt: "#f8dcc4", hair: "#2b2238", hairLt: "#4a3a5c", eye: "#4a2e1e", lips: "#b77a6a" },
  aysenur: { skin: "#f5d2bd", dk: "#dcab92", lt: "#fde6d8", hair: "#4a2840", hairLt: "#7a4a63", eye: "#3a2418", lips: "#c86a7a" },
};
export const DEFAULT_LOOK: Record<"cengiz" | "aysenur", PortraitLook> = {
  cengiz: { top: "#2f3b6b", topDk: "#232c52", neck: "yuvarlak" },
  aysenur: { top: "#b56b7a", topDk: "#8a4d5c", neck: "v" },
};
export const FX_DUR: Partial<Record<Effect, number>> = { maske: 3.4, kopuk: 3, serum: 3, krem: 3 };
const fxDur = (k: Effect) => FX_DUR[k] ?? 2.4;

// "#rrggbb" ya da "rgb(r,g,b)" (karıştırılmış renk yeniden karıştırılabilir)
const hex = (h: string) => {
  if (h[0] === "#") { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m = h.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0];
  return [m[0], m[1], m[2]];
};
/** a ile b arasında k oranında renk */
export function mix(a: string, b: string, k: number): string {
  const x = hex(a), y = hex(b), q = Math.max(0, Math.min(1, k));
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * q)).join(",")})`;
}
const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

const CX = 32, TOP = 12, BOT = 50;
/** yüzün o satırdaki yarım genişliği (yuvarlak alın, sivrilen çene) */
function hw(y: number): number {
  const yc = 30, b = y < yc ? 18 : 20, dy = Math.abs(y - yc) / b;
  if (dy >= 1) return 0;
  let v = 12.5 * Math.pow(1 - Math.pow(dy, 2.4), 1 / 2.4);
  if (y > yc) v *= 1 - 0.35 * Math.pow((y - yc) / 20, 1.6);
  return Math.round(v);
}
const inFace = (x: number, y: number) => y >= TOP && y <= BOT && Math.abs(x - CX + 0.5) < hw(y);

export function drawPortrait(c: Ctx, w: number, h: number, t: number, o: PortraitOpts) {
  const B = BODY[o.who], L = o.look, s = o.state;
  const face = s?.areas.yuz ?? 0.7, hair = s?.areas.sac ?? 0.7, teeth = s?.areas.dis ?? 0.8;
  const study = s?.study ?? { score: 0.5, idleDays: 0, todayMin: 0 };
  const active = o.fx.map((f) => ({ ...f, p: (t - f.at) / fxDur(f.kind) })).filter((f) => f.p >= 0 && f.p < 1);
  const on = (k: Effect) => active.find((f) => f.kind === k);

  // cilt rengi: bakımsızlıkta matlaşır
  const dull = face < 0.55 ? ((0.55 - face) / 0.55) * 0.45 : 0;
  const skin = mix(B.skin, "#b8ab9c", dull), skinDk = mix(B.dk, "#9a8c80", dull), skinLt = mix(B.lt, "#cfc4b8", dull);

  /* ---------- arka plan: sıcak ayna ışığı ---------- */
  for (let y = 0; y < h; y++) rect(c, 0, y, w, 1, mix("#3a2a4a", "#1a1426", y / h));
  const g = c.createRadialGradient(CX, 26, 2, CX, 26, 46); g.addColorStop(0, "rgba(255,214,160,0.28)"); g.addColorStop(1, "rgba(255,214,160,0)");
  c.fillStyle = g; c.fillRect(0, 0, w, h);

  /* ---------- uzun saçın arkası ---------- */
  if (o.who === "aysenur") {
    for (let y = 10; y < 66; y++) {
      const half = y < 30 ? hw(Math.max(TOP, y)) + 4 : 16 - Math.max(0, (y - 50) * 0.2);
      rect(c, CX - half - 1, y, 2 * half + 2, 1, P.ink);
      rect(c, CX - half, y, 2 * half, 1, y % 7 === 0 ? B.hairLt : B.hair);
    }
  }

  /* ---------- gövde ve kıyafet ---------- */
  if (o.body) o.body(c); else drawTorso(c, w, h, B, L, skin, skinDk);

  /* ---------- boyun ---------- */
  rect(c, CX - 6, 45, 12, 13, P.ink); rect(c, CX - 5, 45, 10, 13, skin);
  rect(c, CX - 5, 45, 10, 4, skinDk); rect(c, CX + 3, 49, 2, 8, skinDk);
  if (L.neck === "balikci") { for (let y = 50; y < 58; y++) { rect(c, CX - 7, y, 14, 1, y % 2 ? L.top : L.topDk); } rect(c, CX - 8, 50, 1, 8, P.ink); rect(c, CX + 7, 50, 1, 8, P.ink); }

  /* ---------- kulaklar ---------- */
  for (const side of [-1, 1]) {
    const ex = side < 0 ? CX - hw(30) - 3 : CX + hw(30);
    rect(c, ex, 26, 3, 9, P.ink); rect(c, ex + (side < 0 ? 1 : 0), 27, 2, 7, skin); px(c, ex + (side < 0 ? 1 : 1), 29, skinDk);
  }

  /* ---------- yüz ---------- */
  for (let y = TOP; y <= BOT; y++) {
    const half = hw(y); if (!half) continue;
    rect(c, CX - half - 1, y, 2 * half + 2, 1, P.ink);
  }
  rect(c, CX - hw(BOT - 1) + 1, BOT + 1, 2 * hw(BOT - 1) - 2, 1, P.ink);
  for (let y = TOP; y <= BOT; y++) {
    const half = hw(y); if (!half) continue;
    rect(c, CX - half, y, 2 * half, 1, skin);
    rect(c, CX + half - 2, y, 2, 1, skinDk); // sağ yan gölge
  }
  // elmacık kemiği ışığı
  rect(c, CX - 9, 31, 3, 1, skinLt);
  // Cengiz: hafif sakal gölgesi
  if (o.who === "cengiz") for (let y = 42; y <= BOT; y++) { const half = hw(y); rect(c, CX - half, y, 2 * half, 1, mix(skin, B.hair, y > 46 ? 0.14 : 0.08)); rect(c, CX + half - 2, y, 2, 1, mix(skinDk, B.hair, 0.12)); }

  /* ---------- cilt durumu ---------- */
  const maske = on("maske");
  if (maske) {
    const a = maske.p < 0.15 ? maske.p / 0.15 : maske.p > 0.85 ? (1 - maske.p) / 0.15 : 1;
    for (let y = TOP + 3; y <= BOT - 1; y++) { const half = hw(y) - 1; if (half > 0) rect(c, CX - half, y, 2 * half, 1, `rgba(150,214,186,${(0.9 * a).toFixed(2)})`); }
    for (let k = 0; k < 6; k++) px(c, CX - 8 + Math.floor(rnd(k + 40) * 16), 18 + Math.floor(rnd(k + 41) * 26), `rgba(110,180,150,${a.toFixed(2)})`);
  } else {
    // göz altı: cilt bakımsızlığı ve uykusuzluk (çalışmadan uzun süre) birleşir
    const circles = Math.max(face < 0.5 ? (0.5 - face) * 1.6 : 0, study.idleDays >= 3 ? 0.4 : 0, (s?.neglect ?? 0) >= 2 ? 0.3 : 0);
    if (circles > 0.05) for (const x0 of [CX - 9, CX + 4]) { rect(c, x0, 29, 5, 1, mix(skin, "#6a4a6a", Math.min(0.85, 0.9 * circles))); rect(c, x0 + 1, 30, 3, 1, mix(skin, "#6a4a6a", Math.min(0.6, 0.55 * circles))); }
    // sivilceler
    const SPOTS = [[CX - 8, 34], [CX + 7, 36], [CX - 5, 19], [CX + 6, 18], [CX + 2, 45], [CX - 7, 39], [CX + 9, 31]];
    const n = face < 0.6 ? Math.ceil(((0.6 - face) / 0.6) * SPOTS.length) : 0;
    SPOTS.slice(0, n).forEach(([x, y]) => { px(c, x, y, "#c8605a"); px(c, x + 1, y, mix(skin, "#c8605a", 0.5)); px(c, x, y - 1, "#e8a090"); });
    // kuruluk: beyaz pullar
    if (face < 0.35) for (const [x, y] of [[CX - 9, 32], [CX - 10, 35], [CX + 8, 33], [CX + 10, 36], [CX - 3, 16], [CX + 3, 15], [CX - 1, 46]]) px(c, x, y, "#fbefe2");
    // allık ve ışıltı
    if (face >= 0.7) for (const x0 of [CX - 11, CX + 8]) rect(c, x0, 33, 3, 2, "rgba(232,118,140,0.4)");
    if (face >= 0.8) for (let k = 0; k < 3; k++) { const q = (t * 0.8 + k / 3) % 1; if (q < 0.4) px(c, [CX - 9, CX + 9, CX + 2][k], [31, 32, 16][k], `rgba(255,255,255,${(1 - q / 0.4).toFixed(2)})`); }
  }

  /* ---------- kaşlar ---------- */
  const browTilt = o.focus ? 1 : 0;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? CX - 10 : CX + 4;
    rect(c, x0, 23, 6, 1, B.hair);
    if (o.who === "cengiz") rect(c, x0 + (side < 0 ? 1 : 0), 22, 5, 1, B.hair);
    px(c, side < 0 ? x0 + 5 : x0, 23 + browTilt, B.hair); // odaklanınca kaşlar içe iner
  }

  /* ---------- gözler ---------- */
  const blink = (t + (o.who === "cengiz" ? 0 : 1.9)) % 4.2 < 0.14;
  const sleepy = study.idleDays >= 3 && !o.focus;
  const look = Math.floor(t / 3.1) % 5 === 3 ? 1 : Math.floor(t / 3.1) % 7 === 5 ? -1 : 0; // ara sıra yana bakar
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? CX - 9 : CX + 4;
    if (blink) { rect(c, x0, 27, 5, 1, P.ink); if (o.who === "aysenur") px(c, side < 0 ? x0 - 1 : x0 + 5, 26, P.ink); continue; }
    rect(c, x0, 26, 5, 3, "#ffffff");
    rect(c, x0 + 2 + look, 26, 2, 3, B.eye); px(c, x0 + 2 + look, 27, P.ink); px(c, x0 + 2 + look, 26, "#ffffff");
    rect(c, x0 - (o.who === "aysenur" ? 1 : 0), 25, 5 + (o.who === "aysenur" ? 2 : 0), 1, P.ink); // üst kapak (Ayşenur'da kirpik)
    if (o.who === "aysenur") px(c, side < 0 ? x0 - 1 : x0 + 5, 24, P.ink);
    px(c, x0, 28, skinDk); px(c, x0 + 4, 28, skinDk);
    if (sleepy) { rect(c, x0 - 1, 24, 7, 2, skin); rect(c, x0, 26, 5, 1, P.ink); } // uykulu: kapak yarıya iner
  }

  /* ---------- burun ---------- */
  for (let y = 29; y < 34; y++) px(c, CX + 1, y, skinDk);
  px(c, CX, 33, skinLt); px(c, CX - 2, 34, skinDk); px(c, CX + 2, 34, skinDk);

  /* ---------- ağız ---------- */
  const lips = L.lips ?? B.lips;
  const neglect = s?.neglect ?? 0;
  const happy = face >= 0.6 && neglect < 2, sad = face < 0.3 || neglect >= 3;
  const dis = on("dis");
  const yawn = sleepy && (t % 7) < 1.2;
  if (dis) {
    rect(c, CX - 4, 39, 9, 4, P.ink); rect(c, CX - 3, 39, 7, 2, teeth >= 0.5 ? "#ffffff" : "#f0e2b0"); rect(c, CX - 3, 41, 7, 1, "#a8404a");
    const q = dis.p; px(c, CX + 5 + Math.round(q * 3), 37 - Math.round(q * 4), "#ffffff"); px(c, CX + 6, 38, `rgba(255,255,255,${(1 - q).toFixed(2)})`);
  } else if (yawn) {
    rect(c, CX - 1, 39, 3, 4, P.ink); px(c, CX, 41, "#a8404a");
  } else if (happy) {
    px(c, CX - 4, 39, lips); rect(c, CX - 3, 40, 7, 1, lips); px(c, CX + 4, 39, lips); rect(c, CX - 2, 41, 5, 1, mix(lips, "#ffffff", 0.25));
  } else if (sad) {
    px(c, CX - 4, 41, lips); rect(c, CX - 3, 40, 7, 1, lips); px(c, CX + 4, 41, lips);
  } else {
    rect(c, CX - 3, 40, 7, 1, lips); rect(c, CX - 2, 41, 5, 1, mix(lips, skin, 0.4));
  }
  if (L.lips) px(c, CX - 1, 40, mix(L.lips, "#ffffff", 0.45)); // rujun parlaklığı

  /* ---------- saçın önü ---------- */
  drawHairFront(c, o.who, B, hair, t, on("sac"), on("sampuan"));

  /* ---------- aksesuarlar ---------- */
  if (L.earrings) for (const x of [CX - hw(30) - 2, CX + hw(30) + 1]) { px(c, x, 35, L.earrings); px(c, x, 36, L.earrings); px(c, x, 35, "rgba(255,255,255,0.6)"); }
  if (L.glasses) {
    const fr = L.glasses === "gunes" ? P.ink : "#3a2a20", lens = L.glasses === "gunes" ? "rgba(26,20,38,0.85)" : "rgba(200,230,255,0.25)";
    for (const x0 of [CX - 10, CX + 3]) { rect(c, x0, 25, 7, 5, fr); rect(c, x0 + 1, 26, 5, 3, lens); }
    rect(c, CX - 3, 26, 6, 1, fr); px(c, CX - 9 + 1, 26, "rgba(255,255,255,0.5)");
  }
  if (L.headphones) {
    for (let k = -1; k <= 1.001; k += 0.02) { const x = Math.round(CX + k * 16), y = Math.round(7 + k * k * 18); rect(c, x - 1, y - 1, 3, 3, P.ink); }
    for (let k = -1; k <= 1.001; k += 0.02) { const x = Math.round(CX + k * 16), y = Math.round(7 + k * k * 18); px(c, x, y, L.headphones); }
    for (const x of [CX - hw(30) - 5, CX + hw(30)]) { rect(c, x, 25, 6, 10, P.ink); rect(c, x + 1, 26, 4, 8, L.headphones); px(c, x + 2, 27, "rgba(255,255,255,0.4)"); }
  }
  if (L.hat) drawHat(c, L.hat);
  if (L.necklace) {
    for (let x = CX - 6; x <= CX + 6; x++) px(c, x, 56 + Math.round(Math.pow((x - CX) / 6, 2) * -2) + 1, L.necklace);
    disc(c, CX, 59, 1, L.necklace); px(c, CX, 59, "#ffffff");
  }
  if (L.scent) for (let k = 0; k < 4; k++) { const q = (t * 0.35 + k / 4) % 1; const x = Math.round(CX + 16 + Math.sin(q * 6 + k) * 4), y = Math.round(60 - q * 40); px(c, x, y, `rgba(240,180,210,${(1 - q).toFixed(2)})`); }

  /* ---------- zihin: çalışmaya göre ---------- */
  if (study.idleDays >= 5) { // köşede örümcek ağı
    for (const b of [[12, 10], [16, 3], [4, 15]] as [number, number][]) line(c, [0, 0], b, 1, "rgba(220,220,230,0.55)");
    for (const r of [5, 9]) for (let k = 0; k <= 4; k++) { const ang = (k / 4) * (Math.PI / 2); px(c, Math.round(Math.cos(ang) * r * 1.2), Math.round(Math.sin(ang) * r), "rgba(220,220,230,0.55)"); }
  }
  if (sleepy) for (let k = 0; k < 2; k++) { const q = (t * 0.4 + k / 2) % 1; const x = Math.round(CX + 12 + q * 8), y = Math.round(14 - q * 10); rect(c, x, y, 3, 1, `rgba(243,212,138,${(1 - q).toFixed(2)})`); px(c, x + 1, y + 1, `rgba(243,212,138,${(1 - q).toFixed(2)})`); rect(c, x, y + 2, 3, 1, `rgba(243,212,138,${(1 - q).toFixed(2)})`); }
  if (o.focus || study.score >= 0.8 || study.todayMin >= 60) { // parlayan zihin: başın üstünde kıvılcım
    const q = (Math.sin(t * 3) + 1) / 2;
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) px(c, CX - 15 + dx, 9 + dy, dx || dy ? `rgba(255,236,170,${(0.4 + 0.5 * q).toFixed(2)})` : "#ffffff");
    px(c, CX + 16, 6, `rgba(255,236,170,${(1 - q).toFixed(2)})`);
  }

  /* ---------- uygulama animasyonları ---------- */
  for (const f of active) drawFx(c, f.kind, f.p, t, skin);
}

function drawTorso(c: Ctx, w: number, h: number, B: (typeof BODY)["cengiz"], L: PortraitLook, skin: string, skinDk: string) {
  for (let y = 56; y < h; y++) {
    const half = Math.min(31, 11 + (y - 56) * 3);
    rect(c, CX - half - 1, y, 2 * half + 2, 1, P.ink);
    rect(c, CX - half, y, 2 * half, 1, y > 66 ? L.topDk : L.top);
  }
  if (L.neck === "askili") { // askılı: omuzlar açık
    for (let y = 56; y < 63; y++) { const half = Math.min(31, 11 + (y - 56) * 3); rect(c, CX - half, y, 2 * half, 1, skin); }
    for (const x of [CX - 12, CX + 10]) rect(c, x, 56, 2, 8, L.top);
    rect(c, CX - 20, 63, 40, 1, L.trim ?? L.topDk);
  } else if (L.neck === "v") {
    for (let y = 56; y < 63; y++) { const half = Math.max(0, 6 - (y - 56)); rect(c, CX - half, y, 2 * half, 1, skin); }
    line(c, [CX - 7, 56], [CX, 63], 1, L.trim ?? L.topDk); line(c, [CX + 6, 56], [CX, 63], 1, L.trim ?? L.topDk);
  } else if (L.neck === "yaka") { // gömlek yakası
    rect(c, CX - 3, 56, 6, 3, skin);
    for (const side of [-1, 1]) { const x = side < 0 ? CX - 8 : CX + 3; rect(c, x, 56, 5, 3, L.trim ?? "#f4ead2"); px(c, side < 0 ? x + 4 : x, 58, P.ink); }
    for (let y = 60; y < 72; y += 3) px(c, CX, y, L.trim ?? "#f4ead2");
  } else if (L.neck === "kapsonlu") { // kapüşonlu: yaka kıvrımı ve ipler
    rect(c, CX - 14, 56, 28, 2, L.topDk); rect(c, CX - 4, 56, 8, 2, skinDk);
    line(c, [CX - 3, 58], [CX - 3, 66], 1, L.trim ?? "#f4ead2"); line(c, [CX + 2, 58], [CX + 2, 66], 1, L.trim ?? "#f4ead2");
  } else if (L.neck === "yuvarlak") {
    rect(c, CX - 5, 56, 10, 2, skin); rect(c, CX - 6, 58, 12, 1, L.trim ?? L.topDk);
  }
  void B; void w;
}

function drawHairFront(c: Ctx, who: "cengiz" | "aysenur", B: (typeof BODY)["cengiz"], score: number, t: number, sac?: { p: number }, sampuan?: { p: number }) {
  const col = (y: number, x: number) => ((x * 3 + y * 5) % 11 === 0 ? B.hairLt : B.hair);
  if (who === "cengiz") {
    // kısa saç: tepe dolu, alında sola taranmış perçem, şakaklar ince; çerçeve yalnız saçın kenarında
    const halfAt = (y: number) => Math.round(y < 12 ? 9 + (y - 8) * 1.2 : hw(Math.max(TOP, y)) + 1);
    const inHair = (x: number, y: number) => {
      if (y < 8 || y > 21) return false;
      const half = halfAt(y), d = x - CX + 0.5;
      if (Math.abs(d) >= half) return false;
      if (y <= 16) return true;
      if (Math.abs(d) > half - 3) return true; // şakaklar
      return y <= 19 && x >= CX - 9 && x <= CX + 5 - (y - 17) * 3; // perçem
    };
    for (let y = 7; y <= 22; y++) for (let x = CX - 16; x <= CX + 16; x++)
      if (!inHair(x, y) && (inHair(x - 1, y) || inHair(x + 1, y) || inHair(x, y - 1) || inHair(x, y + 1))) px(c, x, y, P.ink);
    for (let y = 8; y <= 21; y++) for (let x = CX - 15; x <= CX + 15; x++) if (inHair(x, y)) px(c, x, y, col(y, x));
    for (let y = 22; y < 27; y++) { rect(c, CX - hw(y) - 1, y, 3, 1, B.hair); rect(c, CX + hw(y) - 2, y, 3, 1, B.hair); } // favoriler
  } else {
    for (let y = 9; y <= 20; y++) {
      const half = y < 13 ? 9 + (y - 9) * 1.1 : hw(Math.max(TOP, y)) + 2;
      rect(c, CX - Math.round(half) - 1, y, 2 * Math.round(half) + 2, 1, P.ink);
      for (let x = CX - Math.round(half); x < CX + Math.round(half); x++) {
        // yandan ayrılmış kâkül: sağa doğru eğik iner
        if (y <= 15 || x < CX - 4 + (y - 15) * 2 || x > CX + hw(y) - 2) px(c, x, y, col(y, x));
      }
    }
    for (let y = 21; y < 46; y++) { const half = hw(Math.min(BOT, y)); rect(c, CX - half - 3, y, 3, 1, B.hair); rect(c, CX + half, y, 3, 1, B.hair); px(c, CX - half - 4, y, P.ink); px(c, CX + half + 3, y, P.ink); }
    rect(c, CX + 6, 11, 4, 2, P.gold); px(c, CX + 7, 11, P.goldLt); // altın toka
  }
  // saçın durumu
  if (score < 0.4) for (const [x, y] of [[CX - 12, 9], [CX - 8, 6], [CX + 3, 5], [CX + 10, 7], [CX + 13, 11], [CX - 14, 13]]) { px(c, x, y, B.hair); px(c, x + 1, y + 1, B.hair); }
  const sweep = sac ? sac.p : score >= 0.8 ? ((t * 0.25) % 1.6) : -1;
  if (sweep >= 0 && sweep <= 1) for (let k = 0; k < 6; k++) px(c, Math.round(CX - 12 + sweep * 24 + k), 10 + k, "rgba(255,255,255,0.45)");
  if (sac) for (let k = 0; k < 4; k++) { const q = (sac.p * 2 + k / 4) % 1; px(c, CX - 10 + k * 7, 8 + Math.round(q * 4), `rgba(255,236,190,${(1 - q).toFixed(2)})`); }
  if (sampuan) for (let k = 0; k < 9; k++) { const r = Math.round(1 + Math.sin(Math.PI * Math.min(1, sampuan.p * 1.5)) * (1 + (k % 2))); disc(c, CX - 12 + k * 3, 9 + (k % 3) * 2, r, "rgba(255,255,255,0.85)"); }
}

function drawHat(c: Ctx, hat: { kind: "bere" | "sapka"; color: string }) {
  if (hat.kind === "bere") {
    for (let y = 3; y <= 16; y++) { const half = Math.round(14 * Math.sqrt(Math.max(0, 1 - Math.pow((15 - y) / 12.5, 2)))); if (!half) continue; rect(c, CX - half - 1, y, 2 * half + 2, 1, P.ink); rect(c, CX - half, y, 2 * half, 1, y >= 13 ? mix(hat.color, "#000000", 0.22) : hat.color); }
    for (let x = CX - 12; x < CX + 12; x += 3) rect(c, x, 13, 1, 3, mix(hat.color, "#000000", 0.35)); // örgü kıvrımı
    disc(c, CX, 2, 2, P.ink); disc(c, CX, 2, 1, mix(hat.color, "#ffffff", 0.3));
  } else {
    rect(c, CX - 17, 14, 34, 2, P.ink); rect(c, CX - 16, 14, 32, 1, hat.color);
    for (let y = 5; y < 14; y++) { rect(c, CX - 11, y, 22, 1, P.ink); rect(c, CX - 10, y, 20, 1, hat.color); }
    rect(c, CX - 10, 11, 20, 2, mix(hat.color, "#000000", 0.35));
  }
}

function drawFx(c: Ctx, kind: Effect, p: number, t: number, skin: string) {
  const fade = (a: number) => (p < 0.1 ? p / 0.1 : p > 0.85 ? (1 - p) / 0.15 : 1) * a;
  const SPOTS = [[CX, 17], [CX - 8, 32], [CX + 8, 32], [CX, 45], [CX, 31]];
  switch (kind) {
    case "kopuk": {
      for (let k = 0; k < 14; k++) {
        const x = CX - 9 + (k % 4) * 6 + Math.floor(rnd(k) * 3), y = 16 + Math.floor(k / 4) * 8 + Math.floor(rnd(k + 20) * 4);
        const r = Math.round(1 + 1.6 * Math.sin(Math.PI * Math.min(1, p * 1.7 + rnd(k) * 0.2)));
        if (p < 0.62 && r > 0) { disc(c, x, y, r, "rgba(255,255,255,0.9)"); px(c, x - 1, y - 1, "#cfe8ff"); }
      }
      if (p >= 0.55) for (let k = 0; k < 8; k++) { const q = ((p - 0.55) * 3 + k / 8) % 1; px(c, CX - 10 + k * 3, 14 + Math.round(q * 34), `rgba(150,200,255,${(1 - q).toFixed(2)})`); }
      break;
    }
    case "tonik":
      for (let k = 0; k < 16; k++) { const q = (p * 1.4 + k / 16) % 1; const x = Math.round(2 + q * 30), y = Math.round(18 + rnd(k) * 26 + Math.sin(q * 5) * 2); if (inFace(x, y) || x < CX - 12) px(c, x, y, `rgba(180,225,255,${fade(0.9).toFixed(2)})`); }
      break;
    case "serum": {
      const py = Math.round(Math.min(1, p / 0.3) * 8); // damlalık iner
      rect(c, CX - 1, py - 8, 3, 7, "rgba(200,230,255,0.7)"); rect(c, CX - 2, py - 10, 5, 3, "#3a3346"); px(c, CX, py - 2, "#f0b860");
      if (p > 0.3) for (const [x, y] of SPOTS.slice(0, 4)) { const q = Math.min(1, (p - 0.3) / 0.25); px(c, x, Math.round(y - 4 + q * 4), "#f0b860"); if (q >= 1) px(c, x, y + 1, mix(skin, "#f0b860", 0.4)); }
      if (p > 0.6) for (let k = 0; k < 5; k++) if ((t * 4 + k) % 2 < 1) px(c, CX - 9 + k * 4, 20 + (k % 3) * 9, "rgba(255,230,160,0.9)");
      break;
    }
    case "krem":
      for (const [x, y] of SPOTS) {
        if (p < 0.5) { rect(c, x - 1, y - 1, 2, 2, "#ffffff"); px(c, x, y, "#f4ead2"); }
        else { const r = Math.round(1 + (p - 0.5) * 5); disc(c, x, y, r, `rgba(255,250,240,${((1 - p) * 1.2).toFixed(2)})`); }
      }
      if (p > 0.7) for (let k = 0; k < 3; k++) px(c, [CX - 9, CX + 9, CX + 2][k], [30, 31, 16][k], "#ffffff");
      break;
    case "gunes":
      for (let y = TOP + 2; y <= BOT - 1; y++) { const half = hw(y) - 1; if (half > 0) rect(c, CX - half, y, 2 * half, 1, `rgba(255,255,255,${fade(0.35).toFixed(2)})`); }
      disc(c, 54, 9, 4, "#f3c84a"); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + t; px(c, Math.round(54 + Math.cos(a) * 6), Math.round(9 + Math.sin(a) * 6), "#f3c84a"); }
      break;
    case "peeling":
      for (let k = 0; k < 14; k++) { const a = t * 5 + k; const x = Math.round(CX + (k % 2 ? -8 : 8) + Math.cos(a) * 3), y = Math.round(32 + (k % 3) * 4 + Math.sin(a) * 2); px(c, x, y, k % 2 ? "#e8d0b0" : "#ffffff"); }
      break;
    case "vucut":
      for (let k = 0; k < 6; k++) { const q = (p * 1.2 + k / 6) % 1; disc(c, Math.round(CX + (k % 2 ? 20 : -20) + Math.sin(q * 6) * 2), Math.round(66 - q * 18), 2, `rgba(255,255,255,${(0.5 * (1 - q)).toFixed(2)})`); }
      for (let k = 0; k < 3; k++) if ((t * 3 + k) % 2 < 1) px(c, CX - 3 + k * 3, 52, "#ffffff");
      break;
    case "deodorant":
      for (let k = 0; k < 3; k++) for (let s = 0; s < 8; s++) { const q = s / 8; px(c, Math.round(CX + 18 + q * 10), Math.round(62 - k * 4 - Math.sin(q * Math.PI + p * 6) * 2), `rgba(160,230,200,${fade(0.8 * (1 - q)).toFixed(2)})`); }
      break;
    case "onarim":
      for (let k = 0; k < 3; k++) { const q = (p + k / 3) % 1, x = CX + 10 + k * 3, y = Math.round(36 - q * 14); const col = `rgba(120,220,150,${(1 - q).toFixed(2)})`; rect(c, x - 1, y, 3, 1, col); rect(c, x, y - 1, 1, 3, col); }
      break;
    case "parilti":
    case "maske":
    case "dis":
    case "sac":
    case "sampuan":
      if (kind === "parilti") for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + p * 4; px(c, Math.round(CX + Math.cos(a) * 18), Math.round(30 + Math.sin(a) * 20), `rgba(255,236,170,${fade(1).toFixed(2)})`); }
      break;
  }
}
