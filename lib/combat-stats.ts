// Gelişim dövüşü: Hazine eşyalarının oyundaki değerleri. Seviye arttıkça eşya güçlenir.
// Dengelemek için bütün sayılar bu dosyada.
import { GEAR, MATS } from "./gear";

export type WeaponStyle = "kilic" | "hancer" | "yay" | "mizrak" | "agir" | "asa" | "iki-elli";
export type WeaponStats = { style: WeaponStyle; damage: number; cooldown: number; range: number; combo: number; trail?: string };
export type ArmorStats = { tier: "cloth" | "leather" | "steel" | "gold" | "legend"; defense: number; bonusHp: number };
export type SpellShape = "kivilcim" | "ok" | "kalkani" | "muhru" | "yagmuru" | "patlamasi" | "sifa" | "ejder" | "iki-kalp";
export type SpellStats = { shape: SpellShape; color: string; light: string; damage: number; heal: number; mana: number; cooldown: number; range: number };

const byId = new Map(GEAR.map((g) => [g.id, g]));

/* --------------------------------- silahlar -------------------------------- */

const BASE: Record<WeaponStyle, { damage: number; cooldown: number; range: number; combo: number }> = {
  kilic: { damage: 10, cooldown: 0.35, range: 1.2, combo: 3 },
  hancer: { damage: 6, cooldown: 0.22, range: 0.9, combo: 2 },
  yay: { damage: 8, cooldown: 0.6, range: 7, combo: 1 },
  mizrak: { damage: 11, cooldown: 0.5, range: 2.2, combo: 1 },
  agir: { damage: 16, cooldown: 0.75, range: 1.2, combo: 1 },
  asa: { damage: 7, cooldown: 0.55, range: 6, combo: 1 },
  "iki-elli": { damage: 18, cooldown: 0.8, range: 1.6, combo: 1 },
};
// elle çizilmiş silahların tarzı; üretilmişlerde kimliğin öneki belirler
const HAND_STYLE: Record<string, WeaponStyle> = {
  "tahta-kilic": "kilic", "demir-kilic": "kilic", "ejder-kilici": "kilic", "kalp-kilici": "kilic",
  "elf-kilici": "kilic", "gul-kilici": "kilic", "ay-kilici": "kilic",
  "avci-yayi": "yay", "elf-yayi": "yay", "gumus-hancer": "hancer", "yildiz-mizragi": "mizrak",
};
const PREFIX_STYLE: [string, WeaponStyle][] = [
  ["buyuk-kilic-", "iki-elli"], ["kilic-", "kilic"], ["hancer-", "hancer"], ["yay-", "yay"], ["mizrak-", "mizrak"],
  ["balta-", "agir"], ["cekic-", "agir"], ["asa-", "asa"],
];
const TRAIL: Record<string, string> = { "kalp-kilici": "#e48aa0", "ejder-kilici": "#f0a24a", "gul-kilici": "#e2557a", "ay-kilici": "#c8d8ff" };

/** Silahsız: yumruk */
export const FIST: WeaponStats = { style: "kilic", damage: 4, cooldown: 0.4, range: 0.9, combo: 2 };

export function weaponStats(id: string): WeaponStats | null {
  const g = byId.get(id);
  if (!g || g.kind !== "Silah") return null;
  const style = HAND_STYLE[id] ?? PREFIX_STYLE.find(([p]) => id.startsWith(p))?.[1];
  if (!style) return null;
  const b = BASE[style];
  return { style, damage: Math.round(b.damage * (1 + g.level * 0.06)), cooldown: b.cooldown, range: b.range, combo: b.combo, ...(TRAIL[id] ? { trail: TRAIL[id] } : {}) };
}

/* ---------------------------------- zırhlar --------------------------------- */

const HAND_TIER: Record<string, ArmorStats["tier"]> = { tunik: "cloth", "deri-zirh": "leather", "celik-zirh": "steel", "altin-zirh": "gold", "efsane-zirhi": "legend" };

export function armorStats(id: string): ArmorStats | null {
  const g = byId.get(id);
  if (!g || g.kind !== "Zırh") return null;
  const lv = g.level;
  const tier = HAND_TIER[id] ?? (lv < 6 ? "cloth" : lv < 12 ? "leather" : lv < 20 ? "steel" : lv < 30 ? "gold" : "legend");
  return { tier, defense: Math.round(lv * 0.8), bonusHp: lv * 2 };
}

// kuşanılan zırhın karakterdeki görünümü: her zırh kendi malzemesinin rengini giydirir
type Tint = { top: string; topDk: string; bottom?: string; skirt?: string };
const HAND_LOOK: Record<string, Tint> = {
  tunik: { top: "#c8b48a", topDk: "#9a8a64" }, "deri-zirh": { top: "#8a5a36", topDk: "#6a4226" }, "celik-zirh": { top: "#9aa0ae", topDk: "#6e7482" },
  "altin-zirh": { top: "#d8a840", topDk: "#a87a24" }, "efsane-zirhi": { top: "#6a5aa8", topDk: "#4a3a80" },
};
/** Zırh yoksa ev kıyafeti; tunik kumaş giysi, diğerleri malzeme renginde zırh */
export function armorLook(id: string | null | undefined): { outfit: "home" | "armor"; tint?: Tint } {
  if (!id || !armorStats(id)) return { outfit: "home" };
  if (id === "tunik") return { outfit: "home", tint: HAND_LOOK.tunik };
  const m = MATS.find((x) => id.endsWith(`-${x.id}`));
  const t = HAND_LOOK[id] ?? (m ? { top: m.base, topDk: m.dk } : undefined);
  return { outfit: "armor", tint: t && { ...t, bottom: t.topDk, skirt: t.top } }; // bacaklar ve etek de zırh renginde
}

/* ---------------------------------- büyüler --------------------------------- */

const ELEMENT: Record<string, [string, string]> = {
  ates: ["#f0a24a", "#ffe08a"], buz: ["#7fc8e8", "#e8f8ff"], doga: ["#5fae6e", "#b8f0a0"],
  isik: ["#f3d48a", "#ffffff"], golge: ["#7a68a6", "#c9a6f0"], firtina: ["#6f86d6", "#d8e0ff"],
};
const HAND_SPELL: Record<string, [SpellShape, string]> = {
  isik: ["kivilcim", "isik"], sifa: ["sifa", "doga"], "kalkan-buyusu": ["kalkani", "isik"], "alev-topu": ["kivilcim", "ates"],
  buz: ["muhru", "buz"], simsek: ["yagmuru", "firtina"], "ejder-cagrisi": ["ejder", "ates"], "iki-kalp": ["iki-kalp", "isik"],
};
const SPELL_COOLDOWN: Record<SpellShape, number> = { kivilcim: 0.6, ok: 0.8, kalkani: 6, muhru: 3, yagmuru: 4, patlamasi: 2.5, sifa: 5, ejder: 12, "iki-kalp": 10 };
const SPELL_RANGE: Record<SpellShape, number> = { kivilcim: 7, ok: 8, kalkani: 0, muhru: 2, yagmuru: 4, patlamasi: 1.5, sifa: 0, ejder: 9, "iki-kalp": 2 };
const HEALS: SpellShape[] = ["sifa", "iki-kalp"];

export function spellStats(id: string): SpellStats | null {
  const g = byId.get(id);
  if (!g || g.kind !== "Büyü") return null;
  let shape: SpellShape | undefined, el: string | undefined;
  if (HAND_SPELL[id]) [shape, el] = HAND_SPELL[id];
  else { const m = /^buyu-([a-z]+)-([a-z]+)$/.exec(id); if (m) { el = m[1]; shape = m[2] as SpellShape; } }
  if (!shape || !el || !(shape in SPELL_COOLDOWN) || !ELEMENT[el]) return null;
  const lv = g.level, heal = HEALS.includes(shape) ? 20 + lv : 0;
  const [color, light] = ELEMENT[el];
  return {
    shape, color, light,
    damage: heal || shape === "kalkani" ? 0 : Math.round(8 + lv * 0.9),
    heal, mana: Math.round(8 + lv * 0.4), cooldown: SPELL_COOLDOWN[shape], range: SPELL_RANGE[shape],
  };
}

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  const w = weaponStats, a = armorStats, s = spellStats;
  console.assert(w("tahta-kilic")?.style === "kilic" && w("tahta-kilic")?.combo === 3, "tahta kılıç: kılıç tarzı, 3'lü kombo");
  console.assert((w("kalp-kilici")?.damage ?? 0) > (w("ejder-kilici")?.damage ?? 0) && (w("ejder-kilici")?.damage ?? 0) > (w("tahta-kilic")?.damage ?? 0), "yüksek seviyeli kılıç daha güçlü");
  console.assert(w("avci-yayi")?.style === "yay" && (w("avci-yayi")?.range ?? 0) >= 6, "yay uzaktan vurur");
  console.assert((a("efsane-zirhi")?.defense ?? 0) > (a("tunik")?.defense ?? 0) && a("tunik")?.tier === "cloth", "zırh savunması");
  console.assert(armorLook(null).outfit === "home" && armorLook("altin-zirh").outfit === "armor" && armorLook("gogusluk-bakir").tint?.top === "#c8784a"
    && armorLook("gogusluk-bakir").tint?.top !== armorLook("gogusluk-demir").tint?.top, "her zırh kendi renginde");
  console.assert(s("alev-topu")?.shape === "kivilcim" && (s("sifa")?.heal ?? 0) > 0 && s("buyu-buz-muhru")?.shape === "muhru", "büyü şekilleri");
  console.assert(w("yok") === null, "bilinmeyen eşya");
  console.assert(GEAR.filter((g) => g.kind === "Silah").every((g) => w(g.id)), "her silahın değeri var");
  console.assert(GEAR.filter((g) => g.kind === "Zırh").every((g) => a(g.id)), "her zırhın değeri var");
  console.assert(GEAR.filter((g) => g.kind === "Büyü").every((g) => s(g.id)), "her büyünün değeri var");
  console.assert(["elf-kilici", "gul-kilici", "ay-kilici"].every((id) => GEAR.find((g) => g.id === id)?.kind === "Silah" && w(id)?.style === "kilic"), "Ayşenur'un kılıçları");
}
