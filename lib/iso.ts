// İzometrik piksel çizim yardımcıları (Gelişim odası ve bahçesi).
// Kare (i, j) ekranda 16x8 piksellik bir eşkenar dörtgendir; i sağ-aşağı, j sol-aşağı akar.
import { type Ctx, type V, P, poly } from "./pixel";

export const TW = 16, TH = 8;
export type Origin = { ox: number; oy: number };

/** Kare köşesinin ekran noktası (karenin üst köşesi) */
export const at = (o: Origin, i: number, j: number): V => [o.ox + (i - j) * (TW / 2), o.oy + (i + j) * (TH / 2)];

/** Ekran noktasından kare koordinatı (fare ile yerleştirme) */
export function toTile(o: Origin, x: number, y: number): V {
  const a = (x - o.ox) / (TW / 2), b = (y - o.oy) / (TH / 2);
  return [(a + b) / 2, (b - a) / 2];
}

export function tile(c: Ctx, o: Origin, i: number, j: number, color: string, w = 1, d = 1) {
  poly(c, [at(o, i, j), at(o, i + w, j), at(o, i + w, j + d), at(o, i, j + d)], color);
}

export type Faces = { top: string; left: string; right: string };

/**
 * İzometrik kutu: (i, j) köşesinden w x d kare, h piksel yüksek; z: yerden yükseklik (piksel).
 * Önce mürekkep dış hat, sonra üç yüz.
 */
export function box(c: Ctx, o: Origin, i: number, j: number, w: number, d: number, h: number, f: Faces, z = 0, outline = true) {
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
