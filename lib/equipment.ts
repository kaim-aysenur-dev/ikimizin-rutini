// Gelişim: kişinin kuşandıkları. Giyilenler ayrı yuvalarda (göğüs, kask, kalkan, pelerin, eldiven, çizme, takı),
// bir silah ve en çok 4 büyü. Hem tarayıcı hem sunucu kullanır.
import { GEAR, type GearKind, TRINKETS } from "./gear";

export const WEAR_SLOTS = ["armor", "helmet", "shield", "cape", "gloves", "boots", "trinket"] as const;
export type WearSlot = (typeof WEAR_SLOTS)[number];
export const SLOT_NAME: Record<WearSlot, string> = { armor: "Göğüs", helmet: "Kask", shield: "Kalkan", cape: "Pelerin", gloves: "Eldiven", boots: "Çizme", trinket: "Takı" };
export type Equipment = Record<WearSlot, string | null> & { weapon: string | null; spells: string[] };
export const NO_EQUIPMENT: Equipment = { armor: null, helmet: null, shield: null, cape: null, gloves: null, boots: null, trinket: null, weapon: null, spells: [] };
export const SPELL_SLOTS = 4;

const byId = new Map(GEAR.map((g) => [g.id, g]));
const isKind = (id: unknown, kind: GearKind, level: number): id is string => {
  const g = typeof id === "string" ? byId.get(id) : undefined;
  return !!g && g.kind === kind && g.level <= level;
};

/** Giyilen eşyanın yuvası (kimliğinin ön ekinden) */
export function slotOf(id: string): WearSlot | null {
  if (byId.get(id)?.kind !== "Zırh") return null;
  if (TRINKETS.has(id)) return "trinket";
  if (id.startsWith("migfer-")) return "helmet";
  if (id.startsWith("kalkan-")) return "shield";
  if (id.startsWith("pelerin-")) return "cape";
  if (id.startsWith("eldiven-")) return "gloves";
  if (id.startsWith("cizme-")) return "boots";
  return "armor";
}

// iki elle tutulan silahla kalkan taşınmaz
const TWO_HANDED = /^(buyuk-kilic-|yay-|asa-|avci-yayi|elf-yayi)/;
export const twoHanded = (weapon: string | null) => !!weapon && TWO_HANDED.test(weapon);

/** Kayıttan ya da istemciden gelen kuşanmayı temizler: bilinmeyen, yanlış türde ve seviyesi yetmeyen eşyalar düşer.
 *  Eski kayıtta göğüs yuvasındaki miğfer ve kalkan kendi yuvalarına geçer. */
export function sanitizeEquipment(e: unknown, level: number): Equipment {
  if (!e || typeof e !== "object") return { ...NO_EQUIPMENT, spells: [] };
  const r = e as Record<string, unknown>;
  const out: Equipment = { ...NO_EQUIPMENT, spells: [] };
  for (const key of WEAR_SLOTS) {
    const id = r[key];
    if (!isKind(id, "Zırh", level)) continue;
    const slot = slotOf(id)!;
    if (!out[slot]) out[slot] = id;
  }
  out.weapon = isKind(r.weapon, "Silah", level) ? r.weapon : null;
  if (out.shield && twoHanded(out.weapon)) out.shield = null;
  out.spells = Array.isArray(r.spells) ? [...new Set(r.spells.filter((s) => isKind(s, "Büyü", level)))].slice(0, SPELL_SLOTS) : [];
  return out;
}

/** Bir eşyayı kuşanır ya da kuşanılmışsa çıkarır. Büyü yuvaları doluysa en eski büyü düşer. Seviye denetimi sanitize'dadır. */
export function toggleEquip(e: Equipment, gearId: string): Equipment {
  const g = byId.get(gearId);
  if (!g) return e;
  if (g.kind === "Zırh") {
    const slot = slotOf(gearId)!;
    const next = { ...e, [slot]: e[slot] === gearId ? null : gearId };
    if (slot === "shield" && next.shield && twoHanded(next.weapon)) next.weapon = null; // kalkan için iki elli silah bırakılır
    return next;
  }
  if (g.kind === "Silah") {
    const weapon = e.weapon === gearId ? null : gearId;
    return { ...e, weapon, shield: twoHanded(weapon) ? null : e.shield };
  }
  if (e.spells.includes(gearId)) return { ...e, spells: e.spells.filter((s) => s !== gearId) };
  return { ...e, spells: [...e.spells, gearId].slice(-SPELL_SLOTS) };
}

/** Kuşanılan bütün giyilenler */
export const worn = (e: Equipment) => WEAR_SLOTS.map((k) => e[k]).filter((x): x is string => !!x);

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  const eq = (a: Equipment, b: Equipment) => JSON.stringify(a) === JSON.stringify(b);
  const s1 = sanitizeEquipment({ armor: "efsane-zirhi", weapon: "tahta-kilic", spells: [] }, 5);
  console.assert(s1.armor === null && s1.weapon === "tahta-kilic", "seviyesi yetmeyen zırh düşer, açık silah kalır");
  console.assert(sanitizeEquipment({ weapon: "alev-topu" }, 50).weapon === null, "yanlış tür düşer");
  console.assert(eq(sanitizeEquipment("çöp", 10), NO_EQUIPMENT), "bozuk veri boş kuşanma olur");
  const six = sanitizeEquipment({ spells: ["isik", "sifa", "kalkan-buyusu", "alev-topu", "buz", "simsek", "isik"] }, 100);
  console.assert(six.spells.length === 4 && new Set(six.spells).size === 4, "en çok 4 tekrarsız büyü");
  const t1 = toggleEquip(NO_EQUIPMENT, "tahta-kilic");
  console.assert(t1.weapon === "tahta-kilic" && toggleEquip(t1, "tahta-kilic").weapon === null, "kuşan, tekrar basınca çıkar");
  console.assert(toggleEquip(t1, "demir-kilic").weapon === "demir-kilic", "yeni silah eskisinin yerine geçer");
  const full: Equipment = { ...NO_EQUIPMENT, spells: ["isik", "sifa", "kalkan-buyusu", "alev-topu"] };
  const t5 = toggleEquip(full, "buz");
  console.assert(t5.spells.length === 4 && !t5.spells.includes("isik") && t5.spells.includes("buz"), "dolu yuvada en eski büyü düşer");
  console.assert(toggleEquip(full, "sifa").spells.length === 3, "kuşanılmış büyü çıkarılır");
  console.assert(toggleEquip(NO_EQUIPMENT, "tunik").armor === "tunik" && eq(toggleEquip(NO_EQUIPMENT, "yok"), NO_EQUIPMENT), "zırh ve bilinmeyen eşya");
  // yuvalar
  const set = [["migfer-demir", "helmet"], ["kalkan-demir", "shield"], ["pelerin-demir", "cape"], ["eldiven-demir", "gloves"], ["cizme-demir", "boots"], ["ikimizin-yuzugu", "trinket"], ["gogusluk-demir", "armor"]] as const;
  console.assert(set.every(([id, slot]) => byId.has(id) && slotOf(id) === slot), "her giyilen kendi yuvasında");
  const all = set.reduce((e2, [id]) => toggleEquip(e2, id), NO_EQUIPMENT);
  console.assert(worn(all).length === 7, "yedi yuva aynı anda giyilir");
  const old = sanitizeEquipment({ armor: "migfer-demir" }, 100);
  console.assert(old.helmet === "migfer-demir" && old.armor === null, "eski kayıtta miğfer kask yuvasına geçer");
  const bow = toggleEquip(toggleEquip(NO_EQUIPMENT, "kalkan-demir"), "yay-demir");
  console.assert(bow.weapon === "yay-demir" && bow.shield === null && toggleEquip(bow, "kalkan-demir").weapon === null, "iki elli silahla kalkan olmaz");
}
