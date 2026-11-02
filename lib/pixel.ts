// Piksel çizim yardımcıları ve karakter kuklası.
// Her şey düşük çözünürlüklü canvas'a tam sayı koordinatla çizilir; CSS büyütürken kenarlar net kalır.

export type Ctx = CanvasRenderingContext2D;
export type V = [number, number];

export const P = {
  ink: "#1a1426",
  night: "#141a33",
  navy: "#1f2747",
  violet: "#5b4a7a",
  lilac: "#8c7aa8",
  forest: "#1f3b2d",
  forest2: "#2e5240",
  moss: "#4f7a4f",
  stone: "#5e5a66",
  stoneLt: "#7d7884",
  stoneDk: "#3e3a46",
  stoneDeep: "#2b2833",
  rose: "#b56b7a",
  roseDk: "#8a4d5c",
  gold: "#e2b45a",
  goldLt: "#f3d48a",
  amber: "#f0a24a",
  wood: "#6b4a35",
  woodLt: "#8c6448",
  woodDk: "#4a3224",
  cream: "#efe3c8",
  parch: "#e6d3a8",
  parchDk: "#c9b07c",
};

export function rect(c: Ctx, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function px(c: Ctx, x: number, y: number, color: string) {
  rect(c, x, y, 1, 1, color);
}

// Bresenham ile kalın piksel çizgi
export function line(c: Ctx, a: V, b: V, w: number, color: string) {
  c.fillStyle = color;
  let [x0, y0] = [Math.round(a[0]), Math.round(a[1])];
  const [x1, y1] = [Math.round(b[0]), Math.round(b[1])];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const o = Math.floor(w / 2);
  for (;;) {
    c.fillRect(x0 - o, y0 - o, w, w);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// dış çizgili uzuv: önce koyu kalın, sonra renkli ince
export function limb(c: Ctx, a: V, b: V, w: number, color: string) {
  line(c, a, b, w + 2, P.ink);
  line(c, a, b, w, color);
}

export function disc(c: Ctx, cx: number, cy: number, r: number, color: string) {
  c.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    c.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

// pikselli dörtgen: üst kenar [xa, xb, y], alt kenar [xa, xb, y]; satır satır doldurulur (yumuşatma yok)
export function quad(c: Ctx, top: [number, number, number], bot: [number, number, number], color: string, grow = 0) {
  c.fillStyle = color;
  const y0 = Math.round(top[2]) - grow, y1 = Math.round(bot[2]) + grow;
  for (let y = y0; y <= y1; y++) {
    const k = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
    const a = top[0] + (bot[0] - top[0]) * k, b = top[1] + (bot[1] - top[1]) * k;
    const l = Math.round(Math.min(a, b)) - grow, r = Math.round(Math.max(a, b)) + grow;
    c.fillRect(l, y, r - l + 1, 1);
  }
}

// pikselli çokgen: satır satır doldurulur (yumuşatma yok). grow > 0 ise dış çizgi için kenarlar genişler.
export function poly(c: Ctx, pts: V[], color: string, grow = 0) {
  if (pts.length < 3) return;
  c.fillStyle = color;
  const ys = pts.map((p) => p[1]);
  const y0 = Math.floor(Math.min(...ys)) - grow, y1 = Math.ceil(Math.max(...ys)) + grow;
  for (let y = y0; y <= y1; y++) {
    const yy = Math.max(Math.min(...ys), Math.min(Math.max(...ys), y + 0.5));
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const l = Math.round(xs[i]) - grow, r = Math.round(xs[i + 1]) + grow;
      if (r >= l) c.fillRect(l, y, r - l + 1, 1);
    }
  }
}

// sabit tohumlu rastgele: aynı tuğla deseni her karede aynı kalsın
export function rnd(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Harf haritası: her karakter paletten bir renge karşılık gelir, "." boş
export function sprite(c: Ctx, rows: string[], x: number, y: number, pal: Record<string, string>, flip = false) {
  const w = rows[0].length;
  for (let r = 0; r < rows.length; r++) {
    for (let i = 0; i < w; i++) {
      const ch = rows[r][flip ? w - 1 - i : i];
      if (ch === "." || ch === " ") continue;
      const color = pal[ch];
      if (color) px(c, x + i, y + r, color);
    }
  }
}

/* ----------------------------- karakterler ----------------------------- */

// 12x12 kafa, sağa bakarken. o çizgi, h saç, H saç parlak, s ten, S gölge, w göz beyazı, e göz, b allık, m ağız, y altın toka
const CENGIZ_HEAD = [
  "...oooooo...",
  "..ohhhhhhho.",
  ".ohhHHhhhhho",
  "ohhhhhhhhhho",
  "ohhhhhhshhso",
  "ohhSssssssso",
  "ohhsssssweso",
  "ohhsssssweso",
  "ohSsssbsssso",
  ".oSssssssmo.",
  "..oSssssso..",
  "...oooooo...",
];
const AYSENUR_HEAD = [
  "...oooooo...",
  "..ohhhhhhho.",
  ".ohhHHhhhyho",
  "ohhhhhhhhhho",
  "ohhhhhhhhhso",
  "ohhhhhhshsso",
  "ohhhssssweso",
  "ohhhssssweso",
  "ohhsssbsssso",
  "ohhosssssmo.",
  "ohho.ossso..",
  "oho...ooo...",
];

const SERVANT_HEAD = [
  "...oooooo...",
  "..ohhhhhhho.",
  ".ohhhhhhhhho",
  "ohhhhhhhhhho",
  "ohhhhssssss.",
  "ohhSssssssso",
  "ohhsssssweso",
  "ohSsssssssso",
  "ohSssssssmso",
  ".oSssssssso.",
  "..oSssssso..",
  "...oooooo...",
];
const MAID_HEAD = [
  "..oooo......",
  ".ohhhhooooo.",
  ".ohhwwwwwwo.",
  "..ohhhhhhhho",
  ".ohhhhhhhhho",
  "ohhhhhhshsso",
  "ohhhssssweso",
  "ohhsssssssso",
  "ohhsssbssmso",
  ".ohsssssssso",
  "..oSssssso..",
  "...oooooo...",
];

const WIZARD_HEAD = [
  "...oooooo...",
  "..ohhhhhhho.",
  ".ohhhhhhhhho",
  "ohhhhhhhhhho",
  "ohhhssssssso",
  "ohhsssssweso",
  "ohhsssssssso",
  "ohhHHHHHHHHo",
  "ohHHHHHHHHHo",
  ".oHHHHHHHHo.",
  "..oHHHHHHo..",
  "...oHHHHo...",
];
const DWARF_HEAD = [
  "...oooooo...",
  "..oMMMMMMo..",
  ".oMMMMMMMMo.",
  "oyyyyyyyyyyo",
  "ohhsssssssso",
  "ohssssssweso",
  "ohhhhssshhho",
  "ohhhhhhhhhho",
  "ohhhhhhhhhho",
  ".ohhhhhhhho.",
  "..ohohhoho..",
  "...o..o..o..",
];

const JON_HEAD = [
  "...oooooo...",
  "..ohhhhhhho.",
  ".ohhHhhHhhho",
  "ohhhhhhhhhho",
  "ohhhhhhshhho",
  "ohhSssssssso",
  "ohhsssssweso",
  "ohhsssssweso",
  "ohhSSsbsSSso",
  "ohoSSSSSSmo.",
  "ohhoSSSSSo..",
  ".o..oooo....",
];

export type Outfit = "home" | "sport" | "night" | "armor";
export type Who = "cengiz" | "aysenur" | "servant" | "maid" | "wizard" | "dwarf" | "elf" | "jon";

type Look = { hair: string; hairLt: string; top: string; topDk: string; bottom: string; shoe: string; skirt?: string; glove?: string; armor?: boolean };

const SERVANT: Look = { hair: "#8a8494", hairLt: "#b0aab8", top: "#3a2e3a", topDk: "#2a222a", bottom: "#1f1a24", shoe: P.ink };
const MAID: Look = { hair: "#6b4a35", hairLt: "#8c6448", top: "#2b2838", topDk: "#1f1d2a", bottom: "#2b2838", shoe: P.ink, skirt: "#efe3c8" };

const WIZARD: Look = { hair: "#9a96a4", hairLt: "#e8e6ee", top: "#7a7684", topDk: "#5e5a68", bottom: "#6a6674", shoe: "#3a3346" };
const DWARF: Look = { hair: "#b8502a", hairLt: "#d87040", top: "#6a4a3a", topDk: "#4a3224", bottom: "#3a3346", shoe: "#2a1c16" };
const JON: Look = { hair: "#1a1418", hairLt: "#3a2c34", top: "#24202a", topDk: "#18151c", bottom: "#1c1a22", shoe: "#120e14" };
const ELF: Look = { hair: "#e8d080", hairLt: "#f8e8a8", top: "#4f6a3a", topDk: "#3a5028", bottom: "#6b5a3a", shoe: "#4a3224" };
const same = (l: Look) => ({ home: l, sport: l, night: l, armor: l });

const LOOKS: Record<Who, Record<Outfit, Look>> = {
  wizard: same(WIZARD), dwarf: same(DWARF), elf: same(ELF), jon: same(JON),
  cengiz: {
    home: { hair: "#2b2238", hairLt: "#4a3a5c", top: "#2f3b6b", topDk: "#232c52", bottom: "#3a3346", shoe: P.woodDk },
    sport: { hair: "#2b2238", hairLt: "#4a3a5c", top: "#26262e", topDk: "#18181e", bottom: "#8a2b3a", shoe: "#d8d0c0", glove: "#c0343f" },
    night: { hair: "#2b2238", hairLt: "#4a3a5c", top: "#4f5f4a", topDk: "#3c4a39", bottom: "#3a3346", shoe: "#6b4a35" },
    // koyu metal zırh, deri kemer, pelerin
    armor: { hair: "#2b2238", hairLt: "#4a3a5c", top: "#4a4f5a", topDk: "#33373f", bottom: "#2e2a33", shoe: "#1f1a22", armor: true },
  },
  aysenur: {
    home: { hair: "#4a2840", hairLt: "#7a4a63", top: "#b56b7a", topDk: "#8a4d5c", bottom: "#4a2f4a", shoe: P.woodDk, skirt: "#6b3f63" },
    sport: { hair: "#4a2840", hairLt: "#7a4a63", top: "#9a86c4", topDk: "#7a68a6", bottom: "#3b2f4f", shoe: "#e8e0f0" },
    night: { hair: "#4a2840", hairLt: "#7a4a63", top: "#c9a3b0", topDk: "#a8838f", bottom: "#4a2f4a", shoe: "#8a4d5c", skirt: "#a8838f" },
    // gümüş prenses zırhı, soluk mor etek parçaları
    armor: { hair: "#4a2840", hairLt: "#7a4a63", top: "#b8bccb", topDk: "#8e93a6", bottom: "#4a3a66", shoe: "#5a5468", skirt: "#7a68a6", armor: true },
  },
  servant: { home: SERVANT, sport: SERVANT, night: SERVANT, armor: SERVANT },
  maid: { home: MAID, sport: MAID, night: MAID, armor: MAID },
};

const SKIN: Record<Who, [string, string]> = {
  cengiz: ["#efc4a2", "#d49b7a"], aysenur: ["#f5d2bd", "#dcab92"], servant: ["#e0b090", "#c08f70"], maid: ["#f0caa8", "#d6a585"],
  wizard: ["#e8c0a0", "#c89a7c"], dwarf: ["#e0a888", "#c08868"], elf: ["#f2d8c0", "#d8b8a0"], jon: ["#e8c4a8", "#c49a80"],
};
const HEADS: Record<Who, string[]> = { cengiz: CENGIZ_HEAD, aysenur: AYSENUR_HEAD, servant: SERVANT_HEAD, maid: MAID_HEAD, wizard: WIZARD_HEAD, dwarf: DWARF_HEAD, jon: JON_HEAD, elf: AYSENUR_HEAD.map((r) => r.replace("y", "h")) };

// Yürüyüş tipi poz: kalça ve boyun gövdeye göre; el, dirsek boyuna göre; ayak x ofseti + yerden yükseklik.
// x pozitif = baktığı yön.
export type Pose = {
  bob?: number;
  lean?: number;
  eB: V; hB: V; eF: V; hF: V;
  fB: V; fF: V;
  kB?: number; kF?: number;
};

// Serbest poz: bütün eklemler ayak noktasına göre (x baktığı yön, y yukarı negatif). Spor, oturma, uzanma için.
// rot: kafa döndürme (uzanırken 1 = saat yönü, -1 = ters)
export type Free = { hip: V; neck: V; eB: V; hB: V; eF: V; hF: V; kB: V; fB: V; kF: V; fF: V; rot?: 0 | 1 | -1 };

export const STAND: Pose = { eB: [-1, 4], hB: [-1, 7], eF: [1, 4], hF: [1, 7], fB: [-1, 0], fF: [1, 0] };

// yürüyüş: 4 kare; mesafeyle seçilir, böylece kaydırma ile adım tam eşleşir
export const WALK: Pose[] = [
  { bob: 0, eB: [1, 4], hB: [2, 7], eF: [-1, 4], hF: [-2, 7], fB: [-3, 0], fF: [3, 0], kF: 0, kB: 0 },
  { bob: -1, eB: [0, 4], hB: [0, 7], eF: [0, 4], hF: [0, 7], fB: [1, 2], fF: [0, 0], kB: 2 },
  { bob: 0, eB: [-1, 4], hB: [-2, 7], eF: [1, 4], hF: [2, 7], fB: [3, 0], fF: [-3, 0] },
  { bob: -1, eB: [0, 4], hB: [0, 7], eF: [0, 4], hF: [0, 7], fB: [0, 0], fF: [1, 2], kF: 2 },
];

// düz zeminde yürüyüş pozunu serbest poza çevirir (serbest pozlarla yumuşak geçiş için)
export function toFree(p: Pose): Free {
  const hip: V = [0, -9 + (p.bob ?? 0)];
  const neck: V = [p.lean ?? 0, hip[1] - 7];
  const add = (v: V): V => [neck[0] + v[0], neck[1] + v[1]];
  const fB: V = [p.fB[0], -p.fB[1]], fF: V = [p.fF[0], -p.fF[1]];
  const knee = (f: V, bend = 0): V => [(hip[0] + f[0]) / 2 + 1 + bend, (hip[1] + f[1]) / 2];
  return { hip, neck, eB: add(p.eB), hB: add(p.hB), eF: add(p.eF), hF: add(p.hF), kB: knee(fB, p.kB), fB, kF: knee(fF, p.kF), fF };
}

const KEYS = ["hip", "neck", "eB", "hB", "eF", "hF", "kB", "fB", "kF", "fF"] as const;
export function lerpFree(a: Free, b: Free, t: number): Free {
  const k = Math.max(0, Math.min(1, t));
  const out = { rot: k < 0.5 ? a.rot : b.rot } as Free;
  for (const key of KEYS) out[key] = [a[key][0] + (b[key][0] - a[key][0]) * k, a[key][1] + (b[key][1] - a[key][1]) * k];
  return out;
}

function rotate(rows: string[], cw: boolean): string[] {
  const h = rows.length, w = rows[0].length;
  return Array.from({ length: w }, (_, i) => Array.from({ length: h }, (_, j) => (cw ? rows[h - 1 - j][i] : rows[j][w - 1 - i])).join(""));
}

export type CharState = {
  who: Who;
  x: number; // dünya x (ayak ortası)
  y?: number; // zemin yüksekliği; verilmezse surface(x)
  dir: 1 | -1;
  pose: Pose | Free;
  surface?: (x: number) => number;
  outfit: Outfit;
  blink: boolean;
  headDir?: 1 | -1;
  hideBody?: boolean; // battaniye altında: bacaklar çizilmez
  capeTug?: number; // Düldül pelerinin ucunu yakalayınca ek savrulma
};

export type Anchors = { head: V; hand: V; handB: V; hip: V; mouth: V; shoulder: V };

const isFree = (p: Pose | Free): p is Free => "hip" in p;

export function drawCharacter(c: Ctx, s: CharState): Anchors {
  const look = LOOKS[s.who][s.outfit];
  const [skin, skinDk] = SKIN[s.who];
  const d = s.dir;
  const surf = s.surface ?? (() => s.y ?? 0);
  const R = (v: number) => Math.round(v);

  let J: Record<(typeof KEYS)[number], V>;
  let rot: 0 | 1 | -1 = 0;
  if (isFree(s.pose)) {
    const g = s.y ?? surf(s.x);
    const fp = s.pose;
    const at = (v: V): V => [R(s.x + v[0] * d), R(g + v[1])];
    J = Object.fromEntries(KEYS.map((k) => [k, at(fp[k])])) as typeof J;
    rot = fp.rot ?? 0;
  } else {
    const p = s.pose;
    const X = (dx: number) => s.x + dx * d;
    const fBx = X(p.fB[0]), fFx = X(p.fF[0]);
    const ground = (surf(fBx) + surf(fFx)) / 2;
    const hip: V = [R(s.x), R(ground - 9 + (p.bob ?? 0))];
    const neck: V = [R(hip[0] + (p.lean ?? 0) * d), hip[1] - 7];
    const rel = (v: V): V => [R(neck[0] + v[0] * d), R(neck[1] + v[1])];
    const fB: V = [R(fBx), R(surf(fBx) - p.fB[1])], fF: V = [R(fFx), R(surf(fFx) - p.fF[1])];
    const knee = (f: V, bend = 0): V => [R((hip[0] + f[0]) / 2 + (1 + bend) * d), R((hip[1] + f[1]) / 2)];
    J = { hip, neck, eB: rel(p.eB), hB: rel(p.hB), eF: rel(p.eF), hF: rel(p.hF), kB: knee(fB, p.kB), fB, kF: knee(fF, p.kF), fF };
  }

  const { hip, neck } = J;
  const sh: V = [neck[0], neck[1] + 1];
  const ux = neck[0] - hip[0], uy = neck[1] - hip[1];
  const ul = Math.hypot(ux, uy) || 1;
  const head: V = [R(neck[0] + (ux / ul) * 6), R(neck[1] + (uy / ul) * 6)];
  const hd = s.headDir ?? d;

  const pal: Record<string, string> = { o: P.ink, h: look.hair, H: look.hairLt, s: skin, S: skinDk, w: "#fff", e: "#2a1c3a", b: "#e88a8a", m: "#8a3a3a", y: P.gold, M: "#8e95a3" };
  if (s.blink) { pal.w = skin; pal.e = P.ink; }

  if ((s.who === "aysenur" || s.who === "elf") && rot === 0) {
    const x0 = hd > 0 ? head[0] - 6 : head[0] + 3;
    rect(c, x0 - 1, head[1] + 3, 5, 11, P.ink);
    rect(c, x0, head[1] + 3, 3, 10, look.hair);
  }

  const leg = (k: V, f: V) => {
    limb(c, hip, k, 2, look.bottom); limb(c, k, f, 2, look.bottom);
    rect(c, f[0] - 1 + (d > 0 ? 0 : -1), f[1] - 1, 3, 2, look.shoe);
  };
  const arm = (e: V, h: V, color: string) => {
    limb(c, sh, e, 2, color); limb(c, e, h, 2, color);
    if (look.glove) { rect(c, h[0] - 2, h[1] - 2, 4, 4, P.ink); rect(c, h[0] - 1, h[1] - 1, 3, 3, look.glove); }
    else rect(c, h[0] - 1, h[1] - 1, 2, 2, skin);
  };

  // zırhın arkada kalan parçaları: Cengiz'in pelerini, Ayşenur'un yayı ve sadağı
  if (look.armor && !s.hideBody) {
    if (s.who === "cengiz") {
      // pelerin yürürken savrulur (adım mesafesine bağlı: kaydırma durunca durur)
      const sway = Math.round((Math.sin(s.x * 0.35) + 1) * 1.2 + (s.capeTug ?? 0));
      const tx = hip[0] - d * (4 + sway), ty = Math.max(hip[1] + 7, Math.min(J.fB[1], J.fF[1]) - 2);
      quad(c, [neck[0] - d * 2, neck[0] + d * 1, neck[1] + 1], [tx - d * 2, tx + d * 4, ty], P.ink, 1);
      quad(c, [neck[0] - d * 2, neck[0] + d * 1, neck[1] + 1], [tx - d * 2, tx + d * 4, ty], "#3a1f2e", 0);
      line(c, [neck[0] - d * 1, neck[1] + 3], [tx, ty - 1], 1, "#55304a");
    } else {
      const b0: V = [neck[0] - d * 3, neck[1] - 2], b1: V = [hip[0] - d * 4, hip[1] + 1];
      limb(c, b0, b1, 2, "#6b4a35"); // sadak
      px(c, b0[0], b0[1] - 2, "#efe3c8"); px(c, b0[0] + d, b0[1] - 3, "#c8463a"); px(c, b0[0] - d, b0[1] - 2, "#efe3c8");
      // yay: sırtta çapraz
      line(c, [neck[0] - d * 5, neck[1] - 4], [neck[0] - d * 6, neck[1] + 2], 1, P.gold);
      line(c, [neck[0] - d * 6, neck[1] + 2], [hip[0] - d * 2, hip[1] + 4], 1, P.gold);
      line(c, [neck[0] - d * 5, neck[1] - 4], [hip[0] - d * 2, hip[1] + 4], 1, "#e8e0f0");
    }
  }
  arm(J.eB, J.hB, look.topDk);
  if (!s.hideBody) leg(J.kB, J.fB);
  limb(c, [neck[0], neck[1] + 1], hip, 5, look.top);
  if (look.skirt && !s.hideBody) {
    const seated = Math.abs(J.kF[1] - hip[1]) < 4;
    if (seated) limb(c, hip, J.kF, 4, look.skirt);
    else { rect(c, hip[0] - 4, hip[1] - 1, 9, 6, P.ink); rect(c, hip[0] - 3, hip[1] - 1, 7, 5, look.skirt); }
  }
  if (!s.hideBody) leg(J.kF, J.fF);
  if (look.armor) {
    // kemer + toka
    rect(c, hip[0] - 3, hip[1] - 2, 7, 2, "#4a3224"); px(c, hip[0] + d, hip[1] - 2, P.gold);
    if (s.who === "aysenur" && !s.hideBody) {
      // kınında kılıç: bele bağlı, gövdeyle birlikte döner
      limb(c, [hip[0] - d, hip[1]], [hip[0] - d * 6, hip[1] + 7], 1, "#3a2a40");
      line(c, [hip[0], hip[1] - 2], [hip[0] - d * 2, hip[1] + 1], 1, "#c8ccd8");
      line(c, [hip[0] - d * 2, hip[1] - 1], [hip[0] + d, hip[1] + 1], 1, P.gold);
      // göğüste ay-yıldız işlemesi
      px(c, neck[0] + d, neck[1] + 3, "#f4efd8"); px(c, neck[0], neck[1] + 4, "#c9a6f0");
    }
  }
  arm(J.eF, J.hF, look.top);
  if (look.armor && s.who === "cengiz") {
    // omuzluk: kolun üstünü örter
    rect(c, sh[0] - 3, sh[1] - 2, 7, 4, P.ink); rect(c, sh[0] - 2, sh[1] - 1, 5, 2, "#5e6470"); px(c, sh[0] - 1, sh[1] - 1, "#8e95a3");
    // göğüs plakasında yıpranma ve perçin
    px(c, neck[0] + d, neck[1] + 4, "#6a707c"); px(c, neck[0], neck[1] + 2, "#22252b");
  }
  let rows = HEADS[s.who];
  if (rot) rows = rotate(rows, rot > 0);
  sprite(c, rows, head[0] - 6, head[1] - 6, pal, rot ? d < 0 : hd < 0);

  return { head: [head[0], head[1] - 6], hand: J.hF, handB: J.hB, hip, mouth: [head[0] + 3 * hd, head[1] + 3], shoulder: [neck[0] - d, neck[1] - 1] };
}

/* -------------------------------- eşyalar -------------------------------- */

export type Prop = "brush" | "brushFoam" | "bottle" | "cup" | "fork" | "tray" | "jar" | "glass";

export function drawProp(c: Ctx, kind: Prop, at: V, dir: 1 | -1, steam = 0) {
  const x = Math.round(at[0]), y = Math.round(at[1]);
  switch (kind) {
    case "brush":
    case "brushFoam":
      line(c, [x, y], [x + 5 * dir, y - 2], 1, "#7fd1b9");
      rect(c, x + 5 * dir - (dir < 0 ? 1 : 0), y - 4, 2, 2, "#fff");
      if (kind === "brushFoam") { px(c, x + 7 * dir, y - 4, "#fff"); px(c, x + 6 * dir, y - 6, "#fff"); }
      break;
    case "bottle":
      rect(c, x - 2, y - 6, 4, 7, P.ink); rect(c, x - 1, y - 4, 2, 4, "#b8743a"); rect(c, x - 1, y - 8, 2, 2, "#fff");
      break;
    case "jar":
      rect(c, x - 3, y - 4, 6, 5, P.ink); rect(c, x - 2, y - 2, 4, 2, P.cream); rect(c, x - 2, y - 4, 4, 1, P.gold);
      break;
    case "cup":
    case "glass":
      rect(c, x - 2, y - 4, 5, 5, P.ink);
      rect(c, x - 1, y - 3, 3, 3, kind === "cup" ? P.cream : "#9fd0e8");
      if (kind === "cup") rect(c, dir > 0 ? x + 3 : x - 3, y - 3, 1, 2, P.ink);
      if (steam) for (let i = 0; i < 3; i++) px(c, x + ((i + Math.floor(steam * 3)) % 2), y - 6 - i * 2, "rgba(255,255,255,0.55)");
      break;
    case "fork":
      line(c, [x, y], [x + 3 * dir, y - 3], 1, "#c8c8d0");
      break;
    case "tray":
      rect(c, x - 7, y - 1, 15, 2, P.ink); rect(c, x - 6, y - 1, 13, 1, "#c8c8d0");
      rect(c, x - 4, y - 4, 9, 3, P.ink); rect(c, x - 3, y - 4, 7, 2, P.cream); rect(c, x - 1, y - 6, 3, 2, "#c86a3a");
      break;
  }
}

/* ---------------------------------- kedi ---------------------------------- */

// Düldül: sarı-turuncu tekir. y açık ton, Y parlak, d tekir çizgisi, w beyaz ağız/göğüs, n burun, k kulak içi, e göz
const CAT_BODY = [
  "..........o...o.",
  ".........oko.oko",
  ".........oyyyyyo",
  "..oooooooyyeyyeo",
  ".oydydydyyyywnwo",
  "oyyyyyyyyyywwwo.",
  "oYyydyyydyyywo..",
  ".oyyyyyyyyyyo...",
];
const CAT_SIT = [
  "......o...o.",
  ".....oko.oko",
  ".....oyyyyyo",
  ".....oyeyyeo",
  ".....oyywnwo",
  "....ooyywwwo",
  "...oyydyywo.",
  "..oyydyyyywo",
  "..oyyyyyyywo",
  ".oyydyyyyyyo",
  ".oyyyyyyyyyo",
  ".owwoyyyowwo",
  "..oo.ooo.oo.",
];
const CAT_CURL = [
  "..........o..o.",
  ".........okooko",
  "...oooooooyyyyo",
  "..oyydyydyeyyeo",
  ".oyyyydyyyyywnw",
  "oyYyyyyyyyyywwo",
  ".ooooooooooooo.",
];
// yürüyüş: arka ve ön bacak çiftlerinin sütunları (yakın, uzak)
const CAT_LEGS: [number, number, number, number][] = [[2, 4, 9, 11], [3, 3, 10, 10], [4, 2, 11, 9], [3, 3, 10, 10]];

export type CatState = "walk" | "sit" | "curl" | "stretch";

export function drawCat(c: Ctx, x: number, y: number, dir: 1 | -1, state: CatState | "curl", t: number, frame: number, eyes = 1) {
  const pal: Record<string, string> = { o: P.ink, y: "#e8a33a", Y: "#f6c56a", d: "#c27424", w: "#f7e6c4", n: "#d86a6a", k: "#e88a8a", e: eyes > 0.5 ? "#3a7a3a" : P.ink };
  const X = Math.round(x), G = Math.round(y);
  const flip = dir < 0;
  const at = (col: number, w: number) => (flip ? X + 8 - col - w : X - 8 + col);
  const wag = Math.round(Math.sin(t * 2.4) * 1.5);
  const tail = (bx: number, by: number, up: number) => {
    const b: V = [bx, by], m: V = [bx - 3 * dir, by - 2 - up + wag], tip: V = [bx - 5 * dir, by - 6 - up + wag * 2];
    limb(c, b, m, 1, "#e8a33a"); limb(c, m, tip, 1, "#e8a33a"); px(c, tip[0], tip[1], "#c27424");
  };
  if (state === "sit") {
    const left = flip ? X - 6 : X - 6;
    tail(flip ? X + 5 : X - 5, G - 2, -4);
    sprite(c, CAT_SIT, left, G - 13, pal, flip);
    px(c, flip ? X - 7 : X + 6, G - 9, "rgba(247,230,196,0.8)"); // bıyık
    return;
  }
  if (state === "curl") {
    // kuyruk öne sarılır
    line(c, [X - 6 * dir, G - 2], [X + 2 * dir, G - 1], 1, "#e8a33a");
    sprite(c, CAT_CURL, X - 7, G - 7, pal, flip);
    return;
  }
  const f = frame % 4;
  const bob = state === "walk" && (f === 1 || f === 3) ? -1 : 0;
  const top = G - 11 + bob + (state === "stretch" ? 1 : 0);
  tail(at(1, 1), top + 4, state === "stretch" ? 2 : 0);
  // uzak bacaklar (koyu), sonra gövde, sonra yakın bacaklar
  const legs = state === "stretch" ? [2, 4, 12, 14] : CAT_LEGS[f];
  const leg = (col: number, far: boolean, front: boolean) => {
    const lx = at(col, 2);
    if (state === "stretch" && front) { rect(c, lx - 1, G - 3, 4, 3, P.ink); rect(c, lx, G - 2, 3, 1, far ? "#c27424" : "#e8a33a"); return; }
    rect(c, lx - 1, top + 7, 4, G - top - 7, P.ink);
    rect(c, lx, top + 7, 2, G - top - 8, far ? "#c27424" : "#e8a33a");
    rect(c, lx, G - 1, 2, 1, "#f7e6c4");
  };
  leg(legs[1], true, false); leg(legs[3], true, true);
  sprite(c, CAT_BODY, X - 8, top, pal, flip);
  leg(legs[0], false, false); leg(legs[2], false, true);
  px(c, flip ? X - 9 : X + 8, top + 4, "rgba(247,230,196,0.8)");
  px(c, flip ? X - 9 : X + 8, top + 5, "rgba(247,230,196,0.6)");
}
