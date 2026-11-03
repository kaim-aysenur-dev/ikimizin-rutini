// Gelişim fırtınası: gün boyu yağmur, 7 saniyelik her pencerede bir şimşek (aralık 2–12 sn).
// Zamanlama sabit tohumlu: çizim ve gök gürültüsü sesi aynı anları dinler.
import { type Ctx, rect, rnd } from "./pixel";

const WIN = 7;
const strikeAt = (win: number) => win * WIN + 0.4 + rnd(win * 5.3 + 1.7) * (WIN - 1.2);

/** Şimşek parlaklığı 0..1: kısa çift parlama */
export function stormFlash(t: number): number {
  const d = t - strikeAt(Math.floor(t / WIN));
  if (d < 0 || d > 0.7) return 0;
  const pulse = (x: number, w: number) => Math.max(0, 1 - Math.abs(d - x) / w);
  return Math.max(pulse(0.05, 0.08), pulse(0.3, 0.14) * 0.75);
}

/** En son çakan şimşeğin zamanı (gök gürültüsünü bir kez çalmak için) */
export function lastStormStrike(t: number): number {
  const win = Math.floor(t / WIN), at = strikeAt(win);
  return at <= t ? at : strikeAt(win - 1);
}

/** Şimşeğin gücü: bazıları uzak ve zayıf, bazıları tam tepede */
export const strikePower = (at: number) => 0.45 + rnd(Math.floor(at / WIN) * 2.9) * 0.55;

/** Ekran boyunca eğik yağmur (tuval pikseli) */
export function screenRain(c: Ctx, w: number, h: number, t: number, amount: number) {
  const layers: [number, number, number, string][] = [
    [0.5, 90, 3, "rgba(140,160,200,0.22)"],
    [0.3, 150, 4, "rgba(170,190,230,0.38)"],
    [0.12, 230, 6, "rgba(205,220,250,0.6)"],
  ];
  layers.forEach(([dens, sp, len, col], li) => {
    const n = Math.floor(w * dens * amount);
    for (let i = 0; i < n; i++) {
      const seed = i * 13.7 + li * 101;
      const y = (rnd(seed * 1.9) * h + t * sp * (0.8 + rnd(seed * 0.7) * 0.4)) % (h + len);
      const x = (rnd(seed) * (w + 40) - y * 0.18) | 0;
      rect(c, x, Math.round(y) - len, 1, len, col);
    }
  });
}
