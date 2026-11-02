import "server-only";
import type { PlanItemInput } from "@/lib/sport";
import type { SessionInput, TypeInput, VideoInput } from "@/lib/sport-activities";
import { ACTIVITY_COLORS, INTENSITIES, type ActivityColor, type Intensity } from "@/lib/sport-shared";
import { UUID_RE } from "@/lib/skin";
import { intIn, optionalNumber, pastDay, text } from "@/lib/validate";

const uuidOrNull = (v: unknown): string | null | undefined =>
  v === null || v === undefined || v === "" ? null : typeof v === "string" && UUID_RE.test(v) ? v : undefined;

const intensityOrNull = (v: unknown): Intensity | null | undefined =>
  v === null || v === undefined || v === "" ? null : INTENSITIES.includes(v as Intensity) ? (v as Intensity) : undefined;

/** Boş → null; tamsayı ve aralık içinde değilse undefined (hata) */
function optionalInt(v: unknown, min: number, max: number): number | null | undefined {
  const n = optionalNumber(v, min, max);
  return n === undefined ? undefined : n === null ? null : Number.isInteger(n) ? n : undefined;
}

/** Aktivite türü */
export function parseType(body: Record<string, unknown> | null): TypeInput | string {
  const name = text(body?.name, 40);
  if (name.length < 2) return "Tür adı en az 2 karakter olmalı.";
  const color = ACTIVITY_COLORS.includes(body?.color as ActivityColor) ? (body!.color as ActivityColor) : null;
  if (!color) return "Renk geçersiz.";
  return { name, color, tracksRounds: body?.tracksRounds === true, logsSets: body?.logsSets === true };
}

/** Video bilgileri (kimlik ayrıca doğrulanır) */
export function parseVideo(body: Record<string, unknown> | null): VideoInput | string {
  const title = text(body?.title, 200);
  if (!title) return "Video başlığı boş olamaz.";
  const typeId = uuidOrNull(body?.typeId);
  if (typeId === undefined) return "Tür geçersiz.";
  const minutes = optionalInt(body?.minutes, 1, 300);
  if (minutes === undefined) return "Süre 1 ile 300 dakika arasında olmalı.";
  const level = intensityOrNull(body?.level);
  if (level === undefined) return "Zorluk geçersiz.";
  return { title, channel: text(body?.channel, 120), typeId, minutes, level };
}

/** Spor oturumu */
export function parseSession(body: Record<string, unknown> | null): SessionInput | string {
  const day = pastDay(body?.day);
  if (!day) return "Geçersiz tarih.";
  const typeId = uuidOrNull(body?.typeId);
  const videoId = uuidOrNull(body?.videoId);
  if (typeId === undefined || videoId === undefined) return "Geçersiz istek.";
  if (!typeId && !videoId) return "Ne yaptığını seç.";
  const minutes = optionalInt(body?.minutes, 1, 600);
  if (minutes === undefined) return "Süre 1 ile 600 dakika arasında olmalı.";
  const rounds = optionalInt(body?.rounds, 1, 100);
  if (rounds === undefined) return "Tur sayısı 1 ile 100 arasında olmalı.";
  const intensity = intensityOrNull(body?.intensity);
  if (intensity === undefined) return "Yoğunluk geçersiz.";
  return { day, typeId, videoId, minutes, rounds, intensity, note: text(body?.note, 300) };
}

/** Plan maddesi (set, tekrar, ağırlık, dinlenme) doğrulaması */
export function parsePlanItem(body: Record<string, unknown> | null): PlanItemInput | string {
  const sets = intIn(body?.sets, 1, 20);
  if (sets === null) return "Set sayısı 1 ile 20 arasında olmalı.";
  const weightKg = optionalNumber(body?.weightKg, 0, 1000);
  if (weightKg === undefined) return "Ağırlık geçersiz.";
  const restSeconds = intIn(body?.restSeconds, 0, 900);
  if (restSeconds === null) return "Dinlenme 0 ile 900 saniye arasında olmalı.";
  return { sets, reps: text(body?.reps, 30), weightKg, restSeconds, note: text(body?.note, 300) };
}
