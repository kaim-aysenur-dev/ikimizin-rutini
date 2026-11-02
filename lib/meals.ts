// Öğün ve alışveriş listesi yardımcıları (sunucu ve tarayıcı ortak).

export const MEALS = ["kahvalti", "ara1", "ogle", "ara2", "aksam", "ara3"] as const;
export type Meal = (typeof MEALS)[number];

export const MEAL_LABEL: Record<Meal, string> = {
  kahvalti: "Kahvaltı",
  ara1: "Kuşluk ara öğün",
  ogle: "Öğle",
  ara2: "İkindi ara öğün",
  aksam: "Akşam",
  ara3: "Gece ara öğün",
};

export function isMeal(value: unknown): value is Meal {
  return typeof value === "string" && (MEALS as readonly string[]).includes(value);
}

export type PlanMeal = { weekday: number; meal: Meal; items: string[]; note: string };

/* ---------- alışveriş listesi ---------- */

const UNITS = [
  "yemek kaşığı", "tatlı kaşığı", "çay kaşığı", "su bardağı", "çay bardağı",
  "orta boy", "büyük boy", "küçük boy", "kg", "gr", "g", "ml", "lt", "l",
  "adet", "kase", "bardak", "dilim", "avuç", "porsiyon", "paket", "kutu", "şişe",
];
// Alışverişte önemsiz sıfatlar ("bol salata" ile "salata" aynı madde)
const DESCRIPTORS = ["bol", "büyük", "küçük", "orta", "az yağlı", "haşlanmış", "haşlama", "taze", "sade"];

const num = (s: string) => Number(s.replace(",", "."));

export type ShoppingEntry = {
  key: string;
  name: string;
  unit: string | null;
  min: number;
  max: number;
  hasQty: boolean;
  times: number;
};

/** "220-250 gr tavuk" → { tavuk, gr, 220–250 } */
export function parseLine(line: string): { name: string; unit: string | null; min: number; max: number; hasQty: boolean } {
  let text = line.trim().toLocaleLowerCase("tr-TR");
  let min = 0;
  let max = 0;
  let unit: string | null = null;
  let hasQty = false;
  const m = text.match(/^(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*/);
  if (m) {
    hasQty = true;
    min = num(m[1]!);
    max = m[2] ? num(m[2]) : min;
    text = text.slice(m[0].length);
    const u = UNITS.find((unitName) => text === unitName || text.startsWith(`${unitName} `));
    if (u) {
      unit = u;
      text = text.slice(u.length).trim();
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of DESCRIPTORS) {
      if (text.startsWith(`${d} `)) {
        text = text.slice(d.length + 1);
        changed = true;
      }
    }
  }
  return { name: text.trim(), unit, min, max, hasQty };
}

/** Haftalık plandaki bütün maddeleri ada (ve birime) göre toplar. */
export function buildShoppingList(meals: PlanMeal[]): ShoppingEntry[] {
  const map = new Map<string, ShoppingEntry>();
  for (const meal of meals) {
    for (const line of meal.items) {
      if (!line.trim()) continue;
      const p = parseLine(line);
      if (!p.name) continue;
      const key = `${p.name}|${p.unit ?? ""}`;
      const entry = map.get(key) ?? { key, name: p.name, unit: p.unit, min: 0, max: 0, hasQty: false, times: 0 };
      entry.times++;
      if (p.hasQty) {
        entry.hasQty = true;
        entry.min += p.min;
        entry.max += p.max;
      }
      map.set(key, entry);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function formatAmount(e: ShoppingEntry): string {
  if (!e.hasQty) return `${e.times} öğün`;
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
  const amount = e.min === e.max ? fmt(e.min) : `${fmt(e.min)}–${fmt(e.max)}`;
  return `${amount}${e.unit ? ` ${e.unit}` : ""} · ${e.times} öğün`;
}
