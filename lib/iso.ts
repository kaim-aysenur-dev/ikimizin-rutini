// İzometrik piksel çizim yardımcıları (Gelişim odası ve bahçesi).
// Kare (i, j) ekranda 16x8 piksellik bir eşkenar dörtgendir; i sağ-aşağı, j sol-aşağı akar.
import { type Ctx, type V, P, poly } from "./pixel";

export const TW = 16, TH = 8;
export type Origin = { ox: number; oy: number };

// Ters çevrilmiş (180°) eşya çizimi: eşyanın kendi alanında her nokta karşı köşeye yansır ve
// her parça (kutu, kare, nokta) bildirilir; sahne parçaları önden arkaya yeniden sıralar.
export type Part = { i0: number; i1: number; j0: number; j1: number; z0: number; z1: number };
let flip: { si: number; sj: number; part: (p: Part) => void } | null = null;
let inner = false; // kutu kendi köşelerini çizerken nokta bildirilmez
export function setFlip(f: typeof flip) { flip = f; }
const raw = (o: Origin, i: number, j: number): V => [o.ox + (i - j) * (TW / 2), o.oy + (i + j) * (TH / 2)];

/** Kare köşesinin ekran noktası (karenin üst köşesi) */
export function at(o: Origin, i: number, j: number): V {
  if (!flip || inner) return raw(o, i, j);
  const fi = flip.si - i, fj = flip.sj - j;
  flip.part({ i0: fi, i1: fi, j0: fj, j1: fj, z0: 99, z1: 99 });
  return raw(o, fi, fj);
}
// ters çevirmede bir alanın (i, j, w, d) yansıması; parçası bildirilir ve köşeler ham çizilir
function flipArea(i: number, j: number, w: number, d: number, z0: number, z1: number): [number, number] {
  if (!flip) return [i, j];
  const fi = flip.si - i - w, fj = flip.sj - j - d;
  flip.part({ i0: fi, i1: fi + w, j0: fj, j1: fj + d, z0, z1 });
  return [fi, fj];
}

/** Ekran noktasından kare koordinatı (fare ile yerleştirme) */
export function toTile(o: Origin, x: number, y: number): V {
  const a = (x - o.ox) / (TW / 2), b = (y - o.oy) / (TH / 2);
  return [(a + b) / 2, (b - a) / 2];
}

export function tile(c: Ctx, o: Origin, i: number, j: number, color: string, w = 1, d = 1) {
  const own = !!flip && !inner;
  if (own) { [i, j] = flipArea(i, j, w, d, 0, 0); inner = true; }
  poly(c, [at(o, i, j), at(o, i + w, j), at(o, i + w, j + d), at(o, i, j + d)], color);
  if (own) inner = false;
}

export type Faces = { top: string; left: string; right: string };

/**
 * İzometrik kutu: (i, j) köşesinden w x d kare, h piksel yüksek; z: yerden yükseklik (piksel).
 * Önce mürekkep dış hat, sonra üç yüz.
 */
export function box(c: Ctx, o: Origin, i: number, j: number, w: number, d: number, h: number, f: Faces, z = 0, outline = true) {
  const own = !!flip && !inner;
  if (own) { [i, j] = flipArea(i, j, w, d, z, z + h); inner = true; }
  try { drawBox(c, o, i, j, w, d, h, f, z, outline); } finally { if (own) inner = false; }
}
function drawBox(c: Ctx, o: Origin, i: number, j: number, w: number, d: number, h: number, f: Faces, z: number, outline: boolean) {
  const lift = (p: V, dz: number): V => [p[0], p[1] - dz];
  const a = lift(at(o, i, j), z), b = lift(at(o, i + w, j), z), cc = lift(at(o, i + w, j + d), z), e = lift(at(o, i, j + d), z);
  const A = lift(a, h), B = lift(b, h), C = lift(cc, h), E = lift(e, h);
  if (outline) poly(c, [A, B, b, cc, e, E], P.ink, 1);
  poly(c, [e, cc, C, E], f.left);
  poly(c, [b, cc, C, B], f.right);
  poly(c, [A, B, C, E], f.top);
}

/** Kutu yüzü renklerini tek renkten türetir: üst açık, sol orta, sağ koyu */
export function shade(hex: string, light = 0.18, dark = 0.22): Faces {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const mix = (k: number) => `rgb(${ch.map((v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))).join(",")})`;
  return { top: mix(light), left: hex, right: mix(-dark) };
}
