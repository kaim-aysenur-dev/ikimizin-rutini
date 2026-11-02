import "server-only";
import { isDay, todayIstanbul } from "@/lib/dates";

// İstek gövdesi doğrulama yardımcıları. Geçersizse null döner.

/** Geçmiş ya da bugün olan bir gün (gelecek günlere kayıt yapılmaz) */
export function pastDay(value: unknown): string | null {
  return isDay(value) && value <= todayIstanbul() && value >= "2020-01-01" ? value : null;
}

export function weekday(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6 ? (value as number) : null;
}

export function intIn(value: unknown, min: number, max: number): number | null {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max ? (value as number) : null;
}

/** Boş/eksik → null; aralık dışı → undefined (hata) */
export function optionalNumber(value: unknown, min: number, max: number): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 100) / 100 : undefined;
}

/** Madde listesi: boş satırlar atılır, en fazla `max` madde ve her biri `len` karakter */
export function lines(value: unknown, max = 40, len = 200): string[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().slice(0, len))
    .filter(Boolean)
    .slice(0, max);
}

export function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
