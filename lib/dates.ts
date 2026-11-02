// Tarih yardımcıları. Günler "YYYY-AA-GG" metni olarak taşınır;
// "bugün" her zaman Europe/Istanbul saatine göre hesaplanır.

export const TIME_ZONE = "Europe/Istanbul";

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** İstanbul saatine göre bugünün tarihi */
export function todayIstanbul(now: Date = new Date()): string {
  return ymdFormatter.format(now);
}

function toUtcDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function fromUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = toUtcDate(value);
  return !Number.isNaN(date.getTime()) && fromUtcDate(date) === value;
}

export function addDays(day: string, amount: number): string {
  const date = toUtcDate(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return fromUtcDate(date);
}

/** b'den a'ya kaç gün var (a - b) */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcDate(a).getTime() - toUtcDate(b).getTime()) / 86_400_000);
}

/** Pazartesi = 0 … Pazar = 6 */
export function weekdayIndex(day: string): number {
  return (toUtcDate(day).getUTCDay() + 6) % 7;
}

/** Günün içinde bulunduğu haftanın pazartesisi */
export function weekStart(day: string): string {
  return addDays(day, -weekdayIndex(day));
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export const WEEKDAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;
export const WEEKDAY_LONG = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"] as const;
const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
] as const;

function parts(day: string) {
  return { y: Number(day.slice(0, 4)), m: Number(day.slice(5, 7)), d: Number(day.slice(8, 10)) };
}

export function dayOfMonth(day: string): number {
  return parts(day).d;
}

/** "13 Ekim Salı" */
export function formatDayLong(day: string): string {
  const { m, d } = parts(day);
  return `${d} ${MONTHS[m - 1]} ${WEEKDAY_LONG[weekdayIndex(day)]}`;
}

/** "13 Ekim 2026" */
export function formatDate(day: string): string {
  const { y, m, d } = parts(day);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "13 Eki" */
export function formatDayShort(day: string): string {
  const { m, d } = parts(day);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

/** "12–18 Ekim 2026", "29 Eylül – 5 Ekim 2026", "29 Aralık 2025 – 4 Ocak 2026" */
export function formatWeekRange(monday: string): string {
  const a = parts(monday);
  const b = parts(addDays(monday, 6));
  if (a.y !== b.y) return `${a.d} ${MONTHS[a.m - 1]} ${a.y} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  if (a.m !== b.m) return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  return `${a.d}–${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
}
