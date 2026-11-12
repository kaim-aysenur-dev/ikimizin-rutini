// Gündelik kıyafetler: giydirme ekranının kataloğu, kayıtlı kombinin temizlenmesi, dünyadaki küçük karaktere çevrilmesi.
// Dilek Dolabı'nda kazanılan ödüller de giyilebilir eşyaya dönüşür (ruj, küpe, kolye, elbise, ayakkabı, çanta, parfüm, kulaklık).
// Hem tarayıcı hem sunucu kullanır.
import type { WishCat } from "./wishes";

export type Who = "cengiz" | "aysenur";
export type TopKind = "tisort" | "atlet" | "polo" | "gomlek" | "bluz" | "kazak" | "balikci" | "hirka" | "hoodie" | "crop" | "askili" | "ceket" | "deri-ceket" | "mont" | "elbise" | "uzun-elbise";
export type Pattern = "duz" | "cizgili" | "kareli" | "puantiyeli";
export type BottomKind = "jean" | "bol-jean" | "pantolon" | "kargo" | "esofman" | "tayt" | "sort" | "etek" | "pileli-etek" | "midi-etek" | "uzun-etek";
export type ShoeKind = "spor" | "converse" | "bot" | "cizme" | "topuklu" | "babet" | "mokasen" | "sandalet";
export type AccKind = "canta" | "sirt-cantasi" | "gozluk" | "gunes" | "bere" | "sapka" | "kep" | "atki" | "kolye" | "kupe" | "saat" | "bileklik" | "kulaklik" | "kemer" | "kurdele";
export type HairKind = "dalgali" | "atkuyrugu" | "topuz" | "orgu" | "kisa" | "daginik" | "geriye" | "kivircik";

export type Outfit = {
  top: { kind: TopKind; color: string; pattern?: Pattern; color2?: string; inner?: string };
  bottom: { kind: BottomKind; color: string } | null; // elbisede alt yok
  shoes: { kind: ShoeKind; color: string };
  acc: { kind: AccKind; color: string }[];
  hair: HairKind;
  hairColor: string | null; // null: kendi saç rengi
  lips: string | null;
  scent: boolean;
};

export const COLORS: { name: string; c: string }[] = [
  { name: "Siyah", c: "#24202a" }, { name: "Beyaz", c: "#f2ede4" }, { name: "Krem", c: "#e6d3a8" }, { name: "Bej", c: "#c8b090" }, { name: "Gri", c: "#8e95a3" },
  { name: "Antrasit", c: "#4a4e5a" }, { name: "Lacivert", c: "#2f3b6b" }, { name: "Kot mavisi", c: "#4a6a9a" }, { name: "Bebek mavisi", c: "#9fc4e8" }, { name: "Turkuaz", c: "#3a9aa0" },
  { name: "Haki", c: "#5f6a3a" }, { name: "Yeşil", c: "#4f7a4f" }, { name: "Mint", c: "#9fd0b8" }, { name: "Hardal", c: "#c89a3e" }, { name: "Turuncu", c: "#e07a3a" },
  { name: "Kahve", c: "#6b4a35" }, { name: "Taba", c: "#a8683a" }, { name: "Bordo", c: "#7a2a3a" }, { name: "Kırmızı", c: "#c8363a" }, { name: "Pembe", c: "#e48aa0" },
  { name: "Pudra", c: "#f0c4c8" }, { name: "Gül kurusu", c: "#b56b7a" }, { name: "Lila", c: "#9a86c4" }, { name: "Mor", c: "#5f3f7a" },
];
export const HAIR_COLORS: { name: string; c: string }[] = [
  { name: "Kendi rengi", c: "" }, { name: "Siyah", c: "#1e1822" }, { name: "Koyu kahve", c: "#3a2620" }, { name: "Kestane", c: "#6a3a26" },
  { name: "Bal köpüğü", c: "#a8743e" }, { name: "Sarı", c: "#d8b060" }, { name: "Kızıl", c: "#a8402a" }, { name: "Mürdüm", c: "#4a2840" }, { name: "Gece mavisi", c: "#2a2e52" },
];
export const LIPS: { name: string; c: string }[] = [
  { name: "Doğal", c: "" }, { name: "Nude", c: "#c88a7a" }, { name: "Gül", c: "#d06a80" }, { name: "Pembe parlak", c: "#e86a98" }, { name: "Mercan", c: "#e8705a" }, { name: "Kırmızı", c: "#c8202e" }, { name: "Bordo", c: "#7a1a2e" },
];
export const PATTERNS: Record<Pattern, string> = { duz: "Düz", cizgili: "Çizgili", kareli: "Kareli", puantiyeli: "Puantiyeli" };

// sleeve: kol boyu (0 kolsuz, 1 kısa, 2 uzun); open: önü açık (içinde başka renk görünür); dress: etekli tek parça
export const TOPS: Record<TopKind, { name: string; sleeve: 0 | 1 | 2; open?: boolean; dress?: "kisa" | "uzun"; length?: number }> = {
  tisort: { name: "Tişört", sleeve: 1 }, atlet: { name: "Atlet", sleeve: 0 }, polo: { name: "Polo", sleeve: 1 }, gomlek: { name: "Gömlek", sleeve: 2 },
  bluz: { name: "Bluz", sleeve: 1 }, kazak: { name: "Kazak", sleeve: 2 }, balikci: { name: "Balıkçı yaka", sleeve: 2 }, hirka: { name: "Hırka", sleeve: 2, open: true },
  hoodie: { name: "Kapüşonlu", sleeve: 2 }, crop: { name: "Crop", sleeve: 1 }, askili: { name: "Askılı", sleeve: 0 }, ceket: { name: "Blazer ceket", sleeve: 2, open: true },
  "deri-ceket": { name: "Deri ceket", sleeve: 2, open: true }, mont: { name: "Şişme mont", sleeve: 2 }, elbise: { name: "Elbise", sleeve: 1, dress: "kisa" }, "uzun-elbise": { name: "Uzun elbise", sleeve: 0, dress: "uzun" },
};
export const BOTTOMS: Record<BottomKind, { name: string; skirt?: "mini" | "midi" | "uzun"; short?: boolean }> = {
  jean: { name: "Dar kot" }, "bol-jean": { name: "Bol kot" }, pantolon: { name: "Kumaş pantolon" }, kargo: { name: "Kargo" }, esofman: { name: "Eşofman" }, tayt: { name: "Tayt" },
  sort: { name: "Şort", short: true }, etek: { name: "Mini etek", skirt: "mini" }, "pileli-etek": { name: "Pileli etek", skirt: "mini" }, "midi-etek": { name: "Midi etek", skirt: "midi" }, "uzun-etek": { name: "Uzun etek", skirt: "uzun" },
};
export const SHOES: Record<ShoeKind, string> = { spor: "Spor ayakkabı", converse: "Bilekli kanvas", bot: "Bot", cizme: "Çizme", topuklu: "Topuklu", babet: "Babet", mokasen: "Makosen", sandalet: "Sandalet" };
export const ACCS: Record<AccKind, string> = {
  canta: "Omuz çantası", "sirt-cantasi": "Sırt çantası", gozluk: "Gözlük", gunes: "Güneş gözlüğü", bere: "Bere", sapka: "Fötr şapka", kep: "Kep", atki: "Atkı",
  kolye: "Kolye", kupe: "Küpe", saat: "Saat", bileklik: "Bileklik", kulaklik: "Kulaklık", kemer: "Kemer", kurdele: "Saç kurdelesi",
};
export const HAIRS: Record<Who, { kind: HairKind; name: string }[]> = {
  aysenur: [{ kind: "dalgali", name: "Uzun dalgalı" }, { kind: "atkuyrugu", name: "At kuyruğu" }, { kind: "topuz", name: "Topuz" }, { kind: "orgu", name: "Örgü" }],
  cengiz: [{ kind: "kisa", name: "Kısa" }, { kind: "daginik", name: "Dağınık" }, { kind: "geriye", name: "Geriye taranmış" }, { kind: "kivircik", name: "Kıvırcık" }],
};

export const DEFAULT_OUTFIT: Record<Who, Outfit> = {
  cengiz: { top: { kind: "tisort", color: "#2f3b6b" }, bottom: { kind: "jean", color: "#4a6a9a" }, shoes: { kind: "spor", color: "#f2ede4" }, acc: [], hair: "kisa", hairColor: null, lips: null, scent: false },
  aysenur: { top: { kind: "kazak", color: "#b56b7a" }, bottom: { kind: "etek", color: "#4a2f4a" }, shoes: { kind: "babet", color: "#6b4a35" }, acc: [], hair: "dalgali", hairColor: null, lips: null, scent: false },
};

/* ------------------------------ kazanılan ödüller ----------------------------- */

export type Wearable = { id: string; title: string; slot: "top" | "shoes" | "acc" | "lips" | "scent"; kind?: TopKind | ShoeKind | AccKind; color: string; earned: boolean };

const COLOR_WORDS: [RegExp, string][] = [
  [/siyah|black|noir/, "#24202a"], [/beyaz|white|inci|pearl/, "#f4f0e8"], [/kırmızı|red|rouge/, "#c8202e"], [/bordo/, "#7a1a2e"], [/pembe|pink|rose/, "#e48aa0"],
  [/mavi|blue/, "#4a6a9a"], [/yeşil|green/, "#4f7a4f"], [/altın|gold/, "#e2b45a"], [/gümüş|silver/, "#c8ccd8"], [/mor|lila|purple/, "#9a86c4"], [/kahve|brown|deri/, "#6b4a35"],
];
const colorIn = (s: string, fallback: string) => COLOR_WORDS.find(([re]) => re.test(s))?.[1] ?? fallback;

/** Dileğin oyundaki karşılığı; giyilemeyen kategoriler (tablo, monitör...) null */
export function wearableOf(w: { id: string; title: string; brand: string; cat: WishCat; earned: boolean }): Wearable | null {
  const s = `${w.title} ${w.brand}`.toLocaleLowerCase("tr"), base = { id: `dilek:${w.id}`, title: w.title, earned: w.earned };
  switch (w.cat) {
    case "kiyafet": return { ...base, slot: "top", kind: /gömlek/.test(s) ? "gomlek" : /kazak/.test(s) ? "kazak" : /deri ceket/.test(s) ? "deri-ceket" : /ceket|blazer/.test(s) ? "ceket" : /mont/.test(s) ? "mont" : /hırka/.test(s) ? "hirka" : /bluz/.test(s) ? "bluz" : /tişört|tisort/.test(s) ? "tisort" : /uzun elbise|abiye/.test(s) ? "uzun-elbise" : "elbise", color: colorIn(s, "#9a6ad6") };
    case "ayakkabi": return { ...base, slot: "shoes", kind: /çizme/.test(s) ? "cizme" : /bot/.test(s) ? "bot" : /converse|kanvas/.test(s) ? "converse" : /spor|sneaker/.test(s) ? "spor" : /babet/.test(s) ? "babet" : /sandalet/.test(s) ? "sandalet" : "topuklu", color: colorIn(s, "#c8202e") };
    case "canta": return { ...base, slot: "acc", kind: /sırt/.test(s) ? "sirt-cantasi" : "canta", color: colorIn(s, "#a8454e") };
    case "taki": return { ...base, slot: "acc", kind: /küpe|kupe/.test(s) ? "kupe" : /bileklik|bilezik/.test(s) ? "bileklik" : "kolye", color: colorIn(s, "#e2b45a") };
    case "aksesuar": return { ...base, slot: "acc", kind: /saat/.test(s) ? "saat" : /şapka|sapka/.test(s) ? "sapka" : /bere/.test(s) ? "bere" : /atkı|şal/.test(s) ? "atki" : /kemer/.test(s) ? "kemer" : "gunes", color: colorIn(s, "#24202a") };
    case "kulaklik": return { ...base, slot: "acc", kind: "kulaklik", color: colorIn(s, "#3a3346") };
    case "makyaj": return /ruj|lip|rouge|dudak/.test(s) ? { ...base, slot: "lips", color: /glow/.test(s) ? "#e06a8a" : colorIn(s, "#c8202e") } : null;
    case "parfum": return { ...base, slot: "scent", color: "#f0b4d2" };
    default: return null;
  }
}

/* ---------------------------------- temizleme --------------------------------- */

const isColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const oneOf = <T extends string>(v: unknown, keys: Record<T, unknown>): v is T => typeof v === "string" && v in keys;
type Raw = { kind?: unknown; color?: unknown; pattern?: unknown; color2?: unknown; inner?: unknown };

/** Kayıttan ya da istemciden gelen kombini temizler: bilinmeyen tür ve renkler varsayılana döner, en çok 6 aksesuar */
export function sanitizeOutfit(raw: unknown, who: Who): Outfit {
  const d = DEFAULT_OUTFIT[who], r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const t = (r.top ?? {}) as Raw, b = (r.bottom ?? {}) as Raw, s = (r.shoes ?? {}) as Raw;
  const top = oneOf(t.kind, TOPS) && isColor(t.color) ? {
    kind: t.kind, color: t.color,
    ...(oneOf(t.pattern, PATTERNS) && t.pattern !== "duz" ? { pattern: t.pattern, color2: isColor(t.color2) ? t.color2 : "#f2ede4" } : {}),
    ...(isColor(t.inner) ? { inner: t.inner } : {}),
  } : d.top;
  const bottom = TOPS[top.kind].dress ? null : oneOf(b.kind, BOTTOMS) && isColor(b.color) ? { kind: b.kind, color: b.color } : d.bottom ?? DEFAULT_OUTFIT.cengiz.bottom;
  const shoes = oneOf(s.kind, SHOES) && isColor(s.color) ? { kind: s.kind, color: s.color } : d.shoes;
  const accRaw = Array.isArray(r.acc) ? (r.acc as Raw[]) : [];
  const acc = accRaw.filter((a) => oneOf(a?.kind, ACCS) && isColor(a?.color)).map((a) => ({ kind: a.kind as AccKind, color: a.color as string }));
  const uniq = acc.filter((a, i) => acc.findIndex((x) => x.kind === a.kind) === i).slice(0, 6);
  const hair = HAIRS[who].some((h) => h.kind === r.hair) ? (r.hair as HairKind) : d.hair;
  return { top, bottom, shoes, acc: uniq, hair, hairColor: isColor(r.hairColor) ? r.hairColor : null, lips: isColor(r.lips) ? r.lips : null, scent: r.scent === true };
}

const shade = (c: string, k: number) => {
  const n = parseInt(c.slice(1), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? v * (1 - k) : v + (255 - v) * -k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`;
};
export const dark = (c: string) => shade(c, 0.25);
export const light = (c: string) => shade(c, -0.3);

/** Dünyadaki küçük karakterin renkleri (zırh giyilmediğinde) */
export function worldTint(o: Outfit) {
  const T = TOPS[o.top.kind], B = o.bottom ? BOTTOMS[o.bottom.kind] : null;
  const skirt = T.dress ? o.top.color : B?.skirt ? o.bottom!.color : undefined;
  return {
    top: o.top.color, topDk: dark(o.top.color), bottom: o.bottom?.color ?? o.top.color, shoe: o.shoes.color, skirt,
    ...(o.hairColor ? { hair: o.hairColor, hairLt: light(o.hairColor) } : {}),
    ...(o.lips ? { lips: o.lips } : {}),
  };
}

/** Dünyadaki küçük karakterin üstüne çizilen ayrıntılar: şapka, gözlük, çanta, ceketin içi, şort, bot... */
export type SpriteWear = {
  hat?: { kind: "bere" | "sapka" | "kep"; color: string }; glasses?: "okuma" | "gunes"; headphones?: string; necklace?: string; earrings?: string;
  bag?: string; backpack?: string; scarf?: string; belt?: string; bow?: string; inner?: string; hood?: string; crop?: boolean; sleeveless?: boolean;
  legs?: "sort" | "mini" | "midi"; boots?: "bot" | "cizme" | "converse"; heels?: boolean; lips?: string; scent?: boolean; pattern?: { kind: Pattern; color: string };
};
export function spriteWear(o: Outfit): SpriteWear {
  const a = (k: AccKind) => o.acc.find((x) => x.kind === k)?.color;
  const T = TOPS[o.top.kind], B = o.bottom ? BOTTOMS[o.bottom.kind] : null;
  const hat = a("bere") ? { kind: "bere" as const, color: a("bere")! } : a("sapka") ? { kind: "sapka" as const, color: a("sapka")! } : a("kep") ? { kind: "kep" as const, color: a("kep")! } : undefined;
  return {
    hat, glasses: a("gunes") ? "gunes" : a("gozluk") ? "okuma" : undefined, headphones: a("kulaklik"), necklace: a("kolye"), earrings: a("kupe"),
    bag: a("canta"), backpack: a("sirt-cantasi"), scarf: a("atki"), belt: a("kemer"), bow: a("kurdele"),
    inner: T.open ? o.top.inner ?? "#f2ede4" : undefined, hood: o.top.kind === "hoodie" ? dark(o.top.color) : undefined,
    crop: o.top.kind === "crop", sleeveless: T.sleeve === 0,
    legs: B?.short ? "sort" : B?.skirt === "mini" ? "mini" : B?.skirt === "midi" || T.dress === "kisa" ? "midi" : undefined,
    boots: o.shoes.kind === "bot" || o.shoes.kind === "cizme" || o.shoes.kind === "converse" ? o.shoes.kind : undefined, heels: o.shoes.kind === "topuklu",
    lips: o.lips ?? undefined, scent: o.scent || undefined, pattern: o.top.pattern ? { kind: o.top.pattern, color: o.top.color2 ?? "#f2ede4" } : undefined,
  };
}

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  console.assert(sanitizeOutfit({ top: { kind: "elbise", color: "#ff0000" }, bottom: { kind: "jean", color: "#000000" } }, "aysenur").bottom === null, "elbisede alt yok");
  console.assert(sanitizeOutfit({ top: { kind: "uzay", color: "x" } }, "cengiz").top.kind === "tisort", "bilinmeyen tür varsayılana");
  console.assert(sanitizeOutfit({ hair: "topuz" }, "cengiz").hair === "kisa", "saç modeli kişiye göre");
  console.assert(wearableOf({ id: "1", title: "İnci küpe", brand: "", cat: "taki", earned: true })?.kind === "kupe", "inci küpe");
}
