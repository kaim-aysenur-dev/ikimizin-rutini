// YDS Kampı: kurallar (istemci ve sunucu). Kelime kartları aralıklı tekrarla (Leitner kutuları), günlük kota,
// kaçırılan günün telafisi, deneme puanı (her doğru 1,25 puan, yanlış götürmez) ve Gelişim kilidi.
import { type Kind, YDS_WORDS } from "./yds-words";

export type Lock = "kapali" | "zindan" | "sert";
export const LOCKS: Record<Lock, { name: string; hint: string }> = {
  kapali: { name: "Kapalı", hint: "Gelişim hep açık" },
  zindan: { name: "Yumuşak", hint: "Kota bitmeden zindana girilmez" },
  sert: { name: "Sert", hint: "Kota bitmeden zindan, zırh odası, giyinme ve eşya yerleştirme kapalı" },
};
export type YdsSettings = { examDate: string | null; target: number; dailyWords: number; dailyNew: number; dailyQuestions: number; lock: Lock };
export const DEFAULT_SETTINGS: YdsSettings = { examDate: null, target: 70, dailyWords: 30, dailyNew: 15, dailyQuestions: 20, lock: "zindan" };

/** Kart kutularının tekrar aralığı (gün): bilmediğin sık, bildiğin seyrek gelir */
export const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60];
export type Grade = 0 | 1 | 2 | 3; // bilmedim, zor, bildim, kolay
export const GRADES: { g: Grade; name: string; key: string }[] = [
  { g: 0, name: "Bilmedim", key: "1" }, { g: 1, name: "Zor", key: "2" }, { g: 2, name: "Bildim", key: "3" }, { g: 3, name: "Kolay", key: "4" },
];
/** Notlamadan sonra kutu ve kaç gün sonra tekrar */
export function nextBox(box: number, g: Grade): { box: number; days: number } {
  const b = g === 0 ? 0 : g === 1 ? Math.max(1, box) : g === 2 ? Math.min(7, box + 1) : Math.min(7, box + 2);
  return { box: b, days: INTERVALS[b] };
}

export type Card = { key: string; en: string; tr: string; kind: Kind | "kendi"; isNew: boolean; box: number };
export const builtinKey = (en: string, kind: Kind) => `b:${en}:${kind}`;
export const BUILTIN = YDS_WORDS.map(([en, tr, kind]) => ({ key: builtinKey(en, kind), en, tr, kind }));
export const builtinByKey = new Map(BUILTIN.map((w) => [w.key, w]));

/* ---------------------------------- bölümler ---------------------------------- */
// Yaklaşık dağılım (toplam 80 soru); denemede her bölümün soru sayısı değiştirilebilir.
export type Section = "kelime" | "gramer" | "cloze" | "tamamlama" | "ceviri" | "okuma" | "diyalog" | "anlamca" | "ilgisiz";
export const SECTIONS: Record<Section, { name: string; count: number }> = {
  kelime: { name: "Kelime ve phrasal", count: 6 }, gramer: { name: "Dilbilgisi", count: 10 }, cloze: { name: "Cloze test", count: 10 },
  tamamlama: { name: "Cümle tamamlama", count: 10 }, ceviri: { name: "Çeviri", count: 12 }, okuma: { name: "Okuma", count: 20 },
  diyalog: { name: "Diyalog", count: 5 }, anlamca: { name: "Anlamca yakın cümle", count: 4 }, ilgisiz: { name: "Anlamı bozan cümle", count: 3 },
};
export const SECTION_ORDER = Object.keys(SECTIONS) as Section[];
export const scoreOf = (correct: number) => Math.round(correct * 1.25 * 10) / 10;
/** Hedef puan için gereken doğru sayısı */
export const correctFor = (target: number) => Math.ceil(target / 1.25);

/* ------------------------------------ günlük ------------------------------------ */

export type YdsDay = { day: string; words: number; newWords: number; questions: number; correct: number };
/** Bugünkü kota: taban + son 3 günün eksiği (en çok taban kadar): kaçırılan gün ertesi güne biner */
export function quotaFor(s: YdsSettings, last3: YdsDay[]): { words: number; questions: number; owedWords: number; owedQuestions: number } {
  const owedW = last3.reduce((n, d) => n + Math.max(0, s.dailyWords - d.words), 0), owedQ = last3.reduce((n, d) => n + Math.max(0, s.dailyQuestions - d.questions), 0);
  const ow = Math.min(s.dailyWords, owedW), oq = Math.min(s.dailyQuestions, owedQ);
  return { words: s.dailyWords + ow, questions: s.dailyQuestions + oq, owedWords: ow, owedQuestions: oq };
}

export type YdsToday = { words: number; questions: number; correct: number; quota: ReturnType<typeof quotaFor>; done: boolean; availableCards: number };
/** Kota bitti mi: kelimede gösterilecek kart kalmadıysa o kısım tamam sayılır */
export const isDone = (t: Omit<YdsToday, "done">) => (t.words >= t.quota.words || t.availableCards === 0) && t.questions >= t.quota.questions;

export const daysLeft = (examDate: string | null, today: string) => (examDate ? Math.round((Date.parse(examDate) - Date.parse(today)) / 86400000) : null);

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  console.assert(new Set(BUILTIN.map((w) => w.key)).size === BUILTIN.length, "YDS kelime kimlikleri benzersiz");
  console.assert(nextBox(3, 0).box === 0 && nextBox(3, 2).days === 7 && nextBox(6, 3).box === 7, "kutular");
  console.assert(scoreOf(64) === 80 && correctFor(70) === 56, "puan");
  console.assert(Object.values(SECTIONS).reduce((n, s) => n + s.count, 0) === 80, "80 soru");
}
