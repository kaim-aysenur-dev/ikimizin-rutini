// Kaydırmaya bağlı koreografi yardımcıları
import { type CharState, type Free, STAND, WALK, lerpFree, toFree } from "./pixel";

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
// p'nin [a, b] aralığındaki yerel ilerlemesi
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const ease = (k: number) => k * k * (3 - 2 * k);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const STAND_F: Free = toFree(STAND);
export const walkFrame = (dist: number) => WALK[Math.floor(Math.abs(dist) / 5) % 4];

// a'dan b'ye yürüyüş: konum, yön ve kare tek yerden (kaydırma durunca kare de durur)
export function walkTo(k: number, x0: number, x1: number): Pick<CharState, "x" | "dir" | "pose"> {
  const x = lerp(x0, x1, k);
  const moving = k > 0 && k < 1;
  return { x, dir: x1 >= x0 ? 1 : -1, pose: moving ? walkFrame(x - x0) : STAND };
}

// poz dizisinde ilerleme: her poz eşit süre, aralarında yumuşak geçiş (hold: pozda bekleme oranı)
export function sequence(k: number, poses: Free[], hold = 0.4): { pose: Free; index: number; phase: number } {
  const n = poses.length;
  const q = clamp01(k) * n;
  const index = Math.min(n - 1, Math.floor(q));
  const phase = q - index;
  const next = poses[(index + 1) % n];
  const blend = phase < hold ? 0 : ease((phase - hold) / (1 - hold));
  return { pose: lerpFree(poses[index], next, blend), index, phase };
}

export const blinkAt = (t: number, seed: number) => (t + seed) % 4.1 < 0.13;

// zaman uyumlu sabit tohumlu rastgele (ör. buhar)
export const wobble = (t: number, seed: number) => Math.sin(t * 3 + seed) * 0.5 + Math.sin(t * 5.3 + seed * 2) * 0.5;
