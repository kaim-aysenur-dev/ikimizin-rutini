// Akşam toplanan fırtına: yağmur yoğunluğu, rüzgâr ve seyrek şimşekler gün saatine (tod) bağlı.
// Şimşek zamanlaması rastgele görünür ama zamana bağlı sabit tohumludur; ses de aynı anları dinler.
import { type Ctx, rect, rnd } from "./pixel";

// çizim sırasında sahnelerin okuduğu ortak durum (her karede renderScene ayarlar)
export const weather = { t: 0, still: false, storm: 0, flash: 0 };

// 0 = açık hava, 1 = gece fırtınası
export const stormLevel = (tod: number) => Math.max(0, Math.min(1, (tod - 0.7) / 0.2));

// Şimşek: her 9–15 saniyelik pencerede bir kez, kısa çift parlama. Yalnız gece (fırtına > 0.6).
export function lightning(t: number, storm: number): number {
  if (storm < 0.6) return 0;
  const win = Math.floor(t / 12);
  const at = win * 12 + 2 + rnd(win * 3.7) * 8;
  const d = t - at;
  if (d < 0 || d > 0.6) return 0;
  const pulse = (x: number, w: number) => Math.max(0, 1 - Math.abs(d - x) / w);
  return Math.max(pulse(0.05, 0.08), pulse(0.28, 0.12) * 0.7) * Math.min(1, (storm - 0.6) / 0.3 + 0.4);
}
// en son şimşeğin zamanı (ses gecikmesi için)
export function lastStrike(t: number, storm: number): number {
  if (storm < 0.6) return -99;
  const win = Math.floor(t / 12);
  const at = win * 12 + 2 + rnd(win * 3.7) * 8;
  return at <= t ? at : (win - 1) * 12 + 2 + rnd((win - 1) * 3.7) * 8;
}

// Katmanlı yağmur: uzak damlalar ince, soluk ve yavaş; yakındakiler uzun, parlak ve hızlı.
export function rain(c: Ctx, x0: number, x1: number, top: number, bottom: number, t: number, amount: number) {
  if (amount <= 0) return;
  const still = weather.still;
  const k = still ? 0.35 : 1;
  const layers: [number, number, number, string][] = [
    // yoğunluk, hız, boy, renk
    [0.35, 70, 2, "rgba(150,170,205,0.28)"],
    [0.22, 120, 3, "rgba(175,195,230,0.45)"],
    [0.1, 190, 5, "rgba(210,225,250,0.7)"],
  ];
  const span = Math.max(1, bottom - top);
  layers.forEach(([dens, sp, len, col], li) => {
    const n = Math.floor((x1 - x0) * dens * amount * k);
    for (let i = 0; i < n; i++) {
      const seed = i * 13.7 + li * 101;
      const sx = x0 + Math.floor(rnd(seed) * (x1 - x0));
      const y = top + ((rnd(seed * 1.9) * span + (still ? 0 : t * sp * (0.8 + rnd(seed * 0.7) * 0.4))) % span);
      const drift = Math.round((y - top) * 0.12);
      rect(c, sx - drift, Math.round(y), 1, len, col);
    }
  });
}

// zemine çarpan damlaların küçük sıçramaları
export function splashes(c: Ctx, x0: number, x1: number, y: number, t: number, amount: number) {
  if (amount <= 0 || weather.still) return;
  const n = Math.floor((x1 - x0) * 0.06 * amount);
  for (let i = 0; i < n; i++) {
    const ph = (t * 2.5 + rnd(i * 5.1)) % 1;
    if (ph > 0.25) continue;
    const sx = x0 + Math.floor(rnd(i * 7.3 + Math.floor(t * 2.5 + rnd(i * 5.1))) * (x1 - x0));
    const h = Math.round(ph * 8);
    rect(c, sx - 1 - h, y - 1 - h, 1, 1, "rgba(210,225,250,0.6)");
    rect(c, sx + 1 + h, y - 1 - h, 1, 1, "rgba(210,225,250,0.6)");
  }
}

// su birikintisi: halkalar ve yakındaki sıcak ışığın yansıması
export function puddle(c: Ctx, x: number, y: number, w: number, t: number, glow?: string) {
  rect(c, x, y, w, 2, "rgba(40,50,80,0.55)");
  if (glow) rect(c, x + Math.floor(w / 3), y, Math.ceil(w / 3), 1, glow);
  if (weather.still) return;
  for (let i = 0; i < 2; i++) {
    const ph = (t * 0.9 + i * 0.5 + rnd(x)) % 1;
    const r = Math.round(1 + ph * (w / 3));
    const cx = x + Math.floor(rnd(x + i + Math.floor(t * 0.9 + i * 0.5)) * w);
    const a = (0.5 * (1 - ph)).toFixed(2);
    rect(c, cx - r, y, 1, 1, `rgba(200,215,245,${a})`);
    rect(c, cx + r, y, 1, 1, `rgba(200,215,245,${a})`);
  }
}

// çatıdan/kemerden akan su
export function runoff(c: Ctx, x: number, top: number, bottom: number, t: number) {
  if (weather.still) { rect(c, x, top, 1, bottom - top, "rgba(170,190,230,0.3)"); return; }
  for (let y = top; y < bottom; y += 3) if ((y + Math.floor(t * 30)) % 6 < 3) rect(c, x, y, 1, 2, "rgba(190,210,245,0.55)");
}

// camda süzülen ve birleşen damlalar (pencere kırpması içinde çağrılır)
export function glassDrops(c: Ctx, x: number, y: number, w: number, h: number, t: number) {
  for (let i = 0; i < Math.floor(w * 0.5); i++) {
    const sx = x + Math.floor(rnd(i * 4.1) * w);
    const speed = weather.still ? 0 : 4 + rnd(i * 2.3) * 10;
    const sy = y + ((rnd(i * 6.7) * h + t * speed) % h);
    rect(c, sx, Math.round(sy), 1, 2, "rgba(220,232,250,0.55)");
    // iz: süzülen damlanın arkasında ince çizgi
    if (speed > 9) rect(c, sx, Math.round(sy) - 4, 1, 3, "rgba(220,232,250,0.2)");
  }
}
