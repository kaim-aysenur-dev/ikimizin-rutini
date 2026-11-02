// Tarihler her zaman Europe/Istanbul gününe göre; "YYYY-MM-DD" metni olarak taşınır.
// Takvim hesabı UTC üzerinde yapılır, böylece cihaz saat dilimi sonucu değiştirmez.

export const TZ = "Europe/Istanbul";
export const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
export const WEEKDAYS_LONG = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export function todayIst(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const parse = (d: string) => { const [y, m, day] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, day)); };
const fmt = (dt: Date) => dt.toISOString().slice(0, 10);

// 0 = Pazartesi … 6 = Pazar
export const weekday = (d: string) => (parse(d).getUTCDay() + 6) % 7;
export const addDays = (d: string, n: number) => { const dt = parse(d); dt.setUTCDate(dt.getUTCDate() + n); return fmt(dt); };
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // m: 0-11

// Pazartesiyle başlayan ay ızgarası; ayın dışındaki günler null
export function monthGrid(y: number, m: number): (string | null)[] {
  const first = fmt(new Date(Date.UTC(y, m, 1)));
  const lead = weekday(first);
  const n = daysInMonth(y, m);
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let i = 0; i < n; i++) cells.push(addDays(first, i));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function shiftMonth(y: number, m: number, delta: number): [number, number] {
  const t = y * 12 + m + delta;
  return [Math.floor(t / 12), ((t % 12) + 12) % 12];
}

export function weekOf(d: string): string[] {
  const start = addDays(d, -weekday(d));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const longDate = (d: string) => {
  const dt = parse(d);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}, ${WEEKDAYS_LONG[weekday(d)]}`;
};

// kendi kendini denetler: artık yıl, ay uzunluğu, yıl geçişi, haftanın günü
if (process.env.NODE_ENV !== "production") {
  console.assert(daysInMonth(2024, 1) === 29 && daysInMonth(2025, 1) === 28 && daysInMonth(2100, 1) === 28 && daysInMonth(2000, 1) === 29, "artık yıl");
  console.assert(addDays("2025-12-31", 1) === "2026-01-01", "yıl geçişi");
  console.assert(weekday("2026-11-02") === 0, "2 Kasım 2026 pazartesi");
  console.assert(monthGrid(2026, 1).length % 7 === 0 && monthGrid(2026, 1)[6] === "2026-02-01", "Şubat 2026 pazar başlar");
  console.assert(shiftMonth(2026, 0, -1).join() === "2025,11", "ay geri");
}
