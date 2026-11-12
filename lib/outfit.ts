// Gündelik kıyafetler: giydirme ekranının kataloğu, kayıtlı kombinin temizlenmesi ve görünüme çevrilmesi.
// Dilek Dolabı'nda kazanılan ödüller de giyilebilir eşyaya dönüşür (ruj, küpe, kolye, elbise, ayakkabı, çanta, parfüm, kulaklık).
// Hem tarayıcı hem sunucu kullanır.
import type { PortraitLook } from "./portrait";
import type { WishCat } from "./wishes";

export type TopKind = "tisort" | "gomlek" | "kazak" | "balikci" | "hoodie" | "crop" | "askili" | "ceket" | "elbise";
export type BottomKind = "jean" | "pantolon" | "esofman" | "sort" | "etek" | "uzun-etek";
export type ShoeKind = "spor" | "bot" | "babet" | "topuklu" | "mokasen";
export type AccKind = "canta" | "gozluk" | "gunes" | "bere" | "sapka" | "kolye" | "kupe" | "saat" | "bileklik" | "kulaklik";
export type Outfit = {
  top: { kind: TopKind; color: string; inner?: string };
  bottom: { kind: BottomKind; color: string } | null; // elbisede alt yok
  shoes: { kind: ShoeKind; color: string };
  acc: { kind: AccKind; color: string }[];
  lips: string | null;
  scent: boolean;
};

export const COLORS: { name: string; c: string }[] = [
  { name: "Siyah", c: "#24202a" }, { name: "Beyaz", c: "#f2ede4" }, { name: "Krem", c: "#e6d3a8" }, { name: "Gri", c: "#8e95a3" },
  { name: "Lacivert", c: "#2f3b6b" }, { name: "Kot mavisi", c: "#4a6a9a" }, { name: "Bebek mavisi", c: "#9fc4e8" }, { name: "Haki", c: "#5f6a3a" },
  { name: "Yeşil", c: "#4f7a4f" }, { name: "Hardal", c: "#c89a3e" }, { name: "Kahve", c: "#6b4a35" }, { name: "Bordo", c: "#7a2a3a" },
  { name: "Kırmızı", c: "#c8463a" }, { name: "Pembe", c: "#e48aa0" }, { name: "Gül kurusu", c: "#b56b7a" }, { name: "Lila", c: "#9a86c4" },
];
export const LIPS: { name: string; c: string }[] = [
  { name: "Doğal", c: "" }, { name: "Nude", c: "#c88a7a" }, { name: "Gül", c: "#d06a80" }, { name: "Pembe parlak", c: "#e86a98" }, { name: "Kırmızı", c: "#c8202e" }, { name: "Bordo", c: "#7a1a2e" },
];

export const TOPS: Record<TopKind, { name: string; neck: PortraitLook["neck"] }> = {
  tisort: { name: "Tişört", neck: "yuvarlak" }, gomlek: { name: "Gömlek", neck: "yaka" }, kazak: { name: "Kazak", neck: "yuvarlak" },
  balikci: { name: "Balıkçı yaka", neck: "balikci" }, hoodie: { name: "Kapüşonlu", neck: "kapsonlu" }, crop: { name: "Crop", neck: "yuvarlak" },
  askili: { name: "Askılı", neck: "askili" }, ceket: { name: "Ceket", neck: "v" }, elbise: { name: "Elbise", neck: "v" },
};
export const BOTTOMS: Record<BottomKind, { name: string; skirt?: boolean }> = {
  jean: { name: "Kot" }, pantolon: { name: "Kumaş pantolon" }, esofman: { name: "Eşofman" }, sort: { name: "Şort" },
  etek: { name: "Mini etek", skirt: true }, "uzun-etek": { name: "Uzun etek", skirt: true },
};
export const SHOES: Record<ShoeKind, string> = { spor: "Spor ayakkabı", bot: "Bot", babet: "Babet", topuklu: "Topuklu", mokasen: "Makosen" };
export const ACCS: Record<AccKind, string> = {
  canta: "Çanta", gozluk: "Gözlük", gunes: "Güneş gözlüğü", bere: "Bere", sapka: "Şapka", kolye: "Kolye", kupe: "Küpe", saat: "Saat", bileklik: "Bileklik", kulaklik: "Kulaklık",
};

export const DEFAULT_OUTFIT: Record<"cengiz" | "aysenur", Outfit> = {
  cengiz: { top: { kind: "tisort", color: "#2f3b6b" }, bottom: { kind: "jean", color: "#4a6a9a" }, shoes: { kind: "spor", color: "#f2ede4" }, acc: [], lips: null, scent: false },
  aysenur: { top: { kind: "kazak", color: "#b56b7a" }, bottom: { kind: "etek", color: "#4a2f4a" }, shoes: { kind: "babet", color: "#6b4a35" }, acc: [], lips: null, scent: false },
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
    case "kiyafet": return { ...base, slot: "top", kind: /gömlek/.test(s) ? "gomlek" : /kazak/.test(s) ? "kazak" : /ceket/.test(s) ? "ceket" : /tişört|tisort/.test(s) ? "tisort" : "elbise", color: colorIn(s, "#9a6ad6") };
    case "ayakkabi": return { ...base, slot: "shoes", kind: /bot/.test(s) ? "bot" : /spor|sneaker/.test(s) ? "spor" : /babet/.test(s) ? "babet" : "topuklu", color: colorIn(s, "#c8202e") };
    case "canta": return { ...base, slot: "acc", kind: "canta", color: colorIn(s, "#a8454e") };
    case "taki": return { ...base, slot: "acc", kind: /küpe|kupe/.test(s) ? "kupe" : /bileklik|bilezik/.test(s) ? "bileklik" : "kolye", color: colorIn(s, "#e2b45a") };
    case "aksesuar": return { ...base, slot: "acc", kind: /saat/.test(s) ? "saat" : /şapka|sapka/.test(s) ? "sapka" : /bere/.test(s) ? "bere" : "gunes", color: colorIn(s, "#24202a") };
    case "kulaklik": return { ...base, slot: "acc", kind: "kulaklik", color: colorIn(s, "#3a3346") };
    case "makyaj": return /ruj|lip|rouge|dudak/.test(s) ? { ...base, slot: "lips", color: /glow/.test(s) ? "#e06a8a" : colorIn(s, "#c8202e") } : null;
    case "parfum": return { ...base, slot: "scent", color: "#f0b4d2" };
    default: return null;
  }
}

/* ---------------------------------- temizleme --------------------------------- */

const isColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const oneOf = <T extends string>(v: unknown, keys: Record<T, unknown>): v is T => typeof v === "string" && v in keys;

/** Kayıttan ya da istemciden gelen kombini temizler: bilinmeyen tür ve renkler varsayılana döner, en çok 5 aksesuar */
export function sanitizeOutfit(raw: unknown, who: "cengiz" | "aysenur"): Outfit {
  const d = DEFAULT_OUTFIT[who], r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const top = oneOf(r.top?.kind, TOPS) && isColor(r.top?.color) ? { kind: r.top.kind as TopKind, color: r.top.color as string, ...(isColor(r.top.inner) ? { inner: r.top.inner as string } : {}) } : d.top;
  const bottom = top.kind === "elbise" ? null : oneOf(r.bottom?.kind, BOTTOMS) && isColor(r.bottom?.color) ? { kind: r.bottom.kind as BottomKind, color: r.bottom.color as string } : d.bottom ?? DEFAULT_OUTFIT.cengiz.bottom;
  const shoes = oneOf(r.shoes?.kind, SHOES) && isColor(r.shoes?.color) ? { kind: r.shoes.kind as ShoeKind, color: r.shoes.color as string } : d.shoes;
  const acc = Array.isArray(r.acc) ? r.acc.filter((a: any) => oneOf(a?.kind, ACCS) && isColor(a?.color)).map((a: any) => ({ kind: a.kind as AccKind, color: a.color as string })) : []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const uniq = acc.filter((a: { kind: AccKind }, i: number) => acc.findIndex((b: { kind: AccKind }) => b.kind === a.kind) === i).slice(0, 5);
  return { top, bottom, shoes, acc: uniq, lips: isColor(r.lips) ? r.lips : null, scent: r.scent === true };
}

const shade = (c: string, k: number) => {
  const n = parseInt(c.slice(1), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - k))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`;
};
export const dark = (c: string) => shade(c, 0.25);

/** Dünyadaki küçük karakterin renkleri (zırh giyilmediğinde) */
export function worldTint(o: Outfit): { top: string; topDk: string; bottom: string; shoe: string; skirt?: string } {
  const skirt = o.top.kind === "elbise" ? o.top.color : o.bottom && BOTTOMS[o.bottom.kind].skirt ? o.bottom.color : undefined;
  return { top: o.top.color, topDk: dark(o.top.color), bottom: o.bottom?.color ?? o.top.color, shoe: o.shoes.color, skirt };
}

/** Portredeki görünüm: yaka, renk, ruj ve yüzdeki aksesuarlar */
export function portraitLook(o: Outfit): PortraitLook {
  const a = (k: AccKind) => o.acc.find((x) => x.kind === k)?.color ?? null;
  const hat = a("bere") ? { kind: "bere" as const, color: a("bere")! } : a("sapka") ? { kind: "sapka" as const, color: a("sapka")! } : null;
  return {
    top: o.top.color, topDk: dark(o.top.color), neck: TOPS[o.top.kind].neck, trim: o.top.kind === "ceket" ? o.top.inner ?? "#f2ede4" : undefined,
    lips: o.lips, earrings: a("kupe"), necklace: a("kolye"), glasses: a("gunes") ? "gunes" : a("gozluk") ? "okuma" : null, hat, headphones: a("kulaklik"), scent: o.scent,
  };
}

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  console.assert(sanitizeOutfit({ top: { kind: "elbise", color: "#ff0000" }, bottom: { kind: "jean", color: "#000000" } }, "aysenur").bottom === null, "elbisede alt yok");
  console.assert(sanitizeOutfit({ top: { kind: "uzay", color: "x" } }, "cengiz").top.kind === "tisort", "bilinmeyen tür varsayılana");
  console.assert(wearableOf({ id: "1", title: "İnci küpe", brand: "", cat: "taki", earned: true })?.kind === "kupe", "inci küpe");
  console.assert(wearableOf({ id: "2", title: "Addict Lip Glow", brand: "Dior", cat: "makyaj", earned: true })?.slot === "lips", "ruj");
}
