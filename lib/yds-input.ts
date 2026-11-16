import "server-only";
import { isDay } from "./dates";
import { intIn, text } from "./validate";
import { type Grade, LOCKS, type Lock, SECTIONS, type Section, type YdsSettings } from "./yds";
import type { Exam } from "./yds-server";

// YDS isteklerinin doğrulaması; geçersizse Türkçe hata metni döner.
type Body = Record<string, unknown> | null;
const num = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v);

export function parseSettings(b: Body): YdsSettings | string {
  const examDate = b?.examDate == null || b.examDate === "" ? null : isDay(b.examDate) ? (b.examDate as string) : undefined;
  if (examDate === undefined) return "Sınav tarihi geçersiz.";
  const target = intIn(num(b?.target), 1, 100), dailyWords = intIn(num(b?.dailyWords), 5, 300), dailyNew = intIn(num(b?.dailyNew), 0, 100), dailyQuestions = intIn(num(b?.dailyQuestions), 0, 300);
  if (target === null) return "Hedef puan 1-100 olmalı.";
  if (dailyWords === null) return "Günlük kart 5-300 olmalı.";
  if (dailyNew === null) return "Günlük yeni kelime 0-100 olmalı.";
  if (dailyQuestions === null) return "Günlük soru 0-300 olmalı.";
  const lock = typeof b?.lock === "string" && b.lock in LOCKS ? (b.lock as Lock) : "zindan";
  return { examDate, target, dailyWords, dailyNew, dailyQuestions, lock };
}

export function parseGrade(b: Body): { key: string; grade: Grade } | string {
  const key = typeof b?.key === "string" && b.key.length <= 120 ? b.key : null, grade = intIn(b?.grade, 0, 3);
  return key && grade !== null ? { key, grade: grade as Grade } : "Geçersiz kart.";
}

export function parseWord(b: Body): { en: string; tr: string } | string {
  const en = text(b?.en, 80), tr = text(b?.tr, 160);
  return en && tr ? { en, tr } : "Kelime ve anlamı boş olamaz.";
}

export function parsePractice(b: Body): { section: Section; solved: number; correct: number } | string {
  const section = typeof b?.section === "string" && b.section in SECTIONS ? (b.section as Section) : null;
  const solved = intIn(num(b?.solved), 1, 500), correct = intIn(num(b?.correct), 0, 500);
  if (!section) return "Bölüm seç.";
  if (solved === null) return "Çözülen soru 1-500 olmalı.";
  if (correct === null || correct > solved) return "Doğru sayısı çözülenden fazla olamaz.";
  return { section, solved, correct };
}

export function parseExam(b: Body, today: string): Omit<Exam, "id"> | string {
  const day = isDay(b?.day) ? (b!.day as string) : today;
  const raw = (b?.sections ?? {}) as Record<string, { correct?: unknown; total?: unknown }>;
  const sections: Exam["sections"] = {};
  let correct = 0, total = 0;
  for (const k of Object.keys(SECTIONS) as Section[]) {
    const r = raw[k]; if (!r) continue;
    const t = intIn(num(r.total), 0, 40), c = intIn(num(r.correct), 0, 40);
    if (t === null || c === null || c > t) return `${SECTIONS[k].name}: doğru sayısı soru sayısını geçemez.`;
    if (!t) continue;
    sections[k] = { correct: c, total: t }; correct += c; total += t;
  }
  if (!total || total > 80) return "Denemede 1-80 soru olmalı.";
  const minutes = b?.minutes == null || b.minutes === "" ? null : intIn(num(b.minutes), 1, 400);
  if (minutes === null && b?.minutes != null && b.minutes !== "") return "Süre 1-400 dakika olmalı.";
  return { day, title: text(b?.title, 80), sections, correct, total, minutes };
}
