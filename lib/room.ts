// Gelişim sahnelerinin ölçüleri ve yerleştirme kuralı. Hem tarayıcı (önizleme) hem sunucu (doğrulama) kullanır.
import { type Scope, itemById } from "./room-items";

export const SIZE: Record<Scope, { w: number; d: number }> = { oda: { w: 8, d: 8 }, bahce: { w: 14, d: 11 } };

// Odanın kapısı sol arka duvarda (i = 0 kenarı), j = 4 karesinde; bahçe kapıları arka duvarda (j = 0 kenarı)
export const ROOM_DOOR = { i: 0, j: 4 };
export const GARDEN_DOORS = [{ i: 3, j: 0 }, { i: 10, j: 0 }] as const;

// kapıların önü boş kalmalı ki içeri girilip çıkılabilsin
const keepClear = (scope: Scope) =>
  scope === "oda"
    ? [[0, 4], [1, 4]]
    : GARDEN_DOORS.flatMap((d) => [[d.i, 0], [d.i, 1]]);

export type Placed = { id: string; itemId: string; scope: Scope; tx: number; ty: number; userId: string };

/** Eşyanın kapladığı kareler */
export function footprint(itemId: string, tx: number, ty: number): [number, number][] {
  const it = itemById.get(itemId);
  if (!it) return [];
  const out: [number, number][] = [];
  for (let a = 0; a < it.size[0]; a++) for (let b = 0; b < it.size[1]; b++) out.push([tx + a, ty + b]);
  return out;
}

/** Bu kareye konabilir mi: sahne içinde, kapı önü boş, başka eşyayla çakışmıyor */
export function canPlace(scope: Scope, itemId: string, tx: number, ty: number, placed: Placed[]): boolean {
  const it = itemById.get(itemId);
  if (!it || it.scope !== scope || !Number.isInteger(tx) || !Number.isInteger(ty)) return false;
  const { w, d } = SIZE[scope];
  const cells = footprint(itemId, tx, ty);
  if (cells.some(([a, b]) => a < 0 || b < 0 || a >= w || b >= d)) return false;
  const busy = new Set(placed.filter((p) => p.scope === scope).flatMap((p) => footprint(p.itemId, p.tx, p.ty).map(([a, b]) => `${a},${b}`)));
  keepClear(scope).forEach(([a, b]) => busy.add(`${a},${b}`));
  return cells.every(([a, b]) => !busy.has(`${a},${b}`));
}

/** Yürürken çarpılan kareler (eşyaların kapladığı alan) */
export function blockedSet(scope: Scope, placed: Placed[]): Set<string> {
  return new Set(placed.filter((p) => p.scope === scope && p.itemId !== "hali").flatMap((p) => footprint(p.itemId, p.tx, p.ty).map(([a, b]) => `${a},${b}`)));
}

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  console.assert(canPlace("oda", "yatak", 5, 0, []) && !canPlace("oda", "yatak", 7, 0, []), "sınır");
  console.assert(!canPlace("oda", "komodin", 0, 4, []), "kapı önü");
  console.assert(!canPlace("oda", "yatak", 4, 0, [{ id: "x", itemId: "komodin", scope: "oda", tx: 5, ty: 0, userId: "u" }]), "çakışma");
  console.assert(!canPlace("bahce", "yatak", 5, 5, []), "yanlış sahne");
}
