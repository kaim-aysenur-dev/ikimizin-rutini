// Bölüm haritasını okur: engeller, tehlikeli zeminler, giriş/çıkış, doğma yerleri ve süsler. Bölüm başına bir kez (önbellek).
import { type Stage } from "./dungeon-stages";

export type Hazard = "lav" | "zehir" | "ag";
export type Cell = { ch: string; i: number; j: number };
export type StageMap = {
  w: number; d: number;
  solid: Set<string>; // yürünmez kareler (uçanlar hariç)
  hazard: Map<string, Hazard>;
  start: [number, number]; exit: [number, number]; boss: [number, number];
  spawns: [number, number][]; // yaratık doğma yerleri
  cells: Cell[]; // zemin dışındaki her karakter (çizim için)
};

// harita lejantı: dungeon-stages.ts başındaki tabloyla aynı
export const SOLID = new Set(["#", "o", "R", "T", "g", "x", "f", "c", "n", "h", "u", "e", "$", "Y", "k", "~", "t"]);
export const FLOORISH = new Set([".", "S", "E", "m", "B", "=", "L", "p", "w", "r", "i"]);
const HAZARD: Record<string, Hazard> = { L: "lav", p: "zehir", w: "ag" };
/** Tehlikeler: saniyede azami canın yüzdesi kadar yakar; ağ yavaşlatır */
export const HAZARD_EFFECT: Record<Hazard, { burn: number; slow: number; label: string }> = {
  lav: { burn: 0.07, slow: 1, label: "Lav yakıyor!" },
  zehir: { burn: 0.035, slow: 0.8, label: "Zehirleniyorsun!" },
  ag: { burn: 0, slow: 0.45, label: "Ağa takıldın" },
};

const cache = new Map<number, StageMap>();
export function stageMap(st: Stage): StageMap {
  const hit = cache.get(st.id);
  if (hit) return hit;
  const d = st.map.length, w = Math.max(...st.map.map((r) => r.length));
  const m: StageMap = { w, d, solid: new Set(), hazard: new Map(), start: [1.5, d / 2], exit: [w - 1.5, d / 2], boss: [w / 2, d / 2], spawns: [], cells: [] };
  st.map.forEach((row, j) => [...row].forEach((ch, i) => {
    const key = `${i},${j}`, c: [number, number] = [i + 0.5, j + 0.5];
    if (ch === "S") m.start = c; else if (ch === "E") m.exit = c; else if (ch === "B") m.boss = c; else if (ch === "m") m.spawns.push(c);
    if (SOLID.has(ch)) m.solid.add(key);
    if (HAZARD[ch]) m.hazard.set(key, HAZARD[ch]);
    if (ch !== ".") m.cells.push({ ch, i, j });
  }));
  cache.set(st.id, m);
  return m;
}

/** Girişten bu kareye yürünerek ulaşılabilir mi (denetim için) */
export function reachable(m: StageMap, from: [number, number]): Set<string> {
  const start = `${Math.floor(from[0])},${Math.floor(from[1])}`, seen = new Set([start]), q = [start];
  while (q.length) {
    const [i, j] = q.shift()!.split(",").map(Number);
    for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
      const k = `${a},${b}`;
      if (a < 0 || b < 0 || a >= m.w || b >= m.d || seen.has(k) || m.solid.has(k) || m.hazard.get(k) === "lav") continue;
      seen.add(k); q.push(k);
    }
  }
  return seen;
}
