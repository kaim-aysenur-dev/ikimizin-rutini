// Gelişim bahçesinin havası (ana sayfanın weather.ts dosyasından ayrı): her gün İstanbul tarihine göre değişir (ikinizde de aynı). Kar yalnız kasım-mart arası yağar.
export type Weather = "firtina" | "sis" | "acik" | "kar";
export const WEATHER_NAME: Record<Weather, string> = { firtina: "Fırtına", sis: "Sisli", acik: "Açık gece", kar: "Kar" };

export function weatherToday(d = new Date()): Weather {
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d).split("-").map(Number);
  let h = (y * 372 + m * 31 + day) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
  const n = h % 10, winter = m >= 11 || m <= 3;
  if (n < 3) return "firtina";
  if (n < 5) return "sis";
  if (winter && n < 7) return "kar";
  return "acik";
}

// kendi kendini denetler: aynı gün aynı hava, bir yılda hepsi görülür
if (process.env.NODE_ENV !== "production") {
  const seen = new Set<Weather>();
  for (let k = 0; k < 365; k++) seen.add(weatherToday(new Date(Date.UTC(2026, 0, 1 + k, 9))));
  console.assert(seen.size === 4, "dört hava da görülür");
  for (let k = 0; k < 60; k++) console.assert(weatherToday(new Date(Date.UTC(2026, 5, 1 + k, 9))) !== "kar", "yazın kar yok");
  console.assert(weatherToday(new Date(Date.UTC(2026, 3, 5, 6))) === weatherToday(new Date(Date.UTC(2026, 3, 5, 18))), "gün içinde hava sabit");
}
