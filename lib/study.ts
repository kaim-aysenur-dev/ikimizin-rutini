// Gelişim · Çalışma odası: masadaki çalışma alanları, kitaplıktaki okuma listesi ve XP kuralı.
// Hem tarayıcı hem sunucu kullanır.

export const STUDY_COLORS = ["pm", "am", "shower", "ok", "week", "bad"] as const;
export type StudyColor = (typeof STUDY_COLORS)[number];
export const isStudyColor = (v: unknown): v is StudyColor => typeof v === "string" && (STUDY_COLORS as readonly string[]).includes(v);

export const BOOK_KINDS = { kitap: "Kitap", yayin: "Yayın" } as const;
export type BookKind = keyof typeof BOOK_KINDS;
export const BOOK_STATUS = { okunuyor: "Okunuyor", okunacak: "Okunacak", bitti: "Bitti" } as const;
export type BookStatus = keyof typeof BOOK_STATUS;

export type StudyArea = {
  id: string; userId: string; name: string; color: StudyColor; dailyMinutes: number | null; shared: boolean;
  todayMin: number; totalMin: number; totalPages: number;
};
export type Book = {
  id: string; userId: string; title: string; author: string; kind: BookKind; totalPages: number | null; currentPage: number;
  note: string; status: BookStatus; shared: boolean; totalMin: number;
};
export type StudySession = {
  id: string; userId: string; areaId: string | null; bookId: string | null; day: string;
  minutes: number; pages: number; together: boolean; note: string;
};
export type StudyTimer = { userId: string; areaId: string | null; bookId: string | null; startedAt: string };
export type StudyOverview = {
  areas: StudyArea[]; books: Book[]; sessions: StudySession[]; timers: StudyTimer[]; serverNow: string;
};

// XP: her 15 dakika 10 XP, her 2 sayfa 1 XP; diğeriyle aynı anda çalışılan oturum +%50.
// Aynı kural lib/xp-server.ts'teki SQL'de de var; ikisi birlikte değişmeli.
export const STUDY_XP = { quarter: 10, perTwoPages: 1, together: 1.5 } as const;
export const studyXp = (minutes: number, pages: number, together: boolean) =>
  Math.floor((Math.floor(minutes / 15) * STUDY_XP.quarter + Math.floor(pages / 2) * STUDY_XP.perTwoPages) * (together ? STUDY_XP.together : 1));

/** Masa eşyaları ve kitaplıklar (lib/room-items.ts kimlikleri) */
export const isDesk = (itemId: string) => itemId === "masa" || itemId === "bilgisayar-masasi" || itemId.startsWith("yazi-masasi-");
export const isShelf = (itemId: string) => itemId === "kitaplik" || itemId.startsWith("kitaplik-");

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  console.assert(studyXp(14, 1, false) === 0 && studyXp(15, 0, false) === 10 && studyXp(60, 20, false) === 50, "çalışma XP'si");
  console.assert(studyXp(30, 0, true) === 30 && studyXp(15, 3, true) === 16, "birlikte bonusu");
  console.assert(isDesk("masa") && isDesk("yazi-masasi-meşe") && !isDesk("yemek-masasi-meşe") && isShelf("kitaplik-ceviz"), "eşya türleri");
}
