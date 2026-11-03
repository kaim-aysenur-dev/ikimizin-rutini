// Gelişim: kişinin kuşandıkları (bir zırh, bir silah, en çok 4 büyü). Hem tarayıcı hem sunucu kullanır.
import { GEAR, type GearKind } from "./gear";

export type Equipment = { armor: string | null; weapon: string | null; spells: string[] };
export const NO_EQUIPMENT: Equipment = { armor: null, weapon: null, spells: [] };
export const SPELL_SLOTS = 4;

const byId = new Map(GEAR.map((g) => [g.id, g]));
const isKind = (id: unknown, kind: GearKind, level: number): id is string => {
  const g = typeof id === "string" ? byId.get(id) : undefined;
  return !!g && g.kind === kind && g.level <= level;
};

/** Kayıttan ya da istemciden gelen kuşanmayı temizler: bilinmeyen, yanlış türde ve seviyesi yetmeyen eşyalar düşer */
export function sanitizeEquipment(e: unknown, level: number): Equipment {
  if (!e || typeof e !== "object") return { ...NO_EQUIPMENT, spells: [] };
  const r = e as Record<string, unknown>;
  const spells = Array.isArray(r.spells) ? [...new Set(r.spells.filter((s) => isKind(s, "Büyü", level)))].slice(0, SPELL_SLOTS) : [];
  return { armor: isKind(r.armor, "Zırh", level) ? r.armor : null, weapon: isKind(r.weapon, "Silah", level) ? r.weapon : null, spells };
}

/** Bir eşyayı kuşanır ya da kuşanılmışsa çıkarır. Büyü yuvaları doluysa en eski büyü düşer. Seviye denetimi sanitize'dadır. */
export function toggleEquip(e: Equipment, gearId: string): Equipment {
  const g = byId.get(gearId);
  if (!g) return e;
  if (g.kind === "Zırh") return { ...e, armor: e.armor === gearId ? null : gearId };
  if (g.kind === "Silah") return { ...e, weapon: e.weapon === gearId ? null : gearId };
  if (e.spells.includes(gearId)) return { ...e, spells: e.spells.filter((s) => s !== gearId) };
  return { ...e, spells: [...e.spells, gearId].slice(-SPELL_SLOTS) };
}

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
}
