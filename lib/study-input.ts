import "server-only";
import { UUID_RE } from "./skin";
import { BOOK_KINDS, BOOK_STATUS, type BookKind, type BookStatus, isStudyColor } from "./study";
import type { AreaInput, BookInput, SessionInput, Target } from "./study-server";
import { intIn, text } from "./validate";

// Çalışma odası isteklerinin doğrulaması. Geçersizse Türkçe hata metni döner.

type Body = Record<string, unknown> | null;

export function parseTarget(b: Body): Target | string {
  const areaId = b?.areaId, bookId = b?.bookId;
  if (typeof areaId === "string" && UUID_RE.test(areaId) && bookId == null) return { kind: "area", id: areaId };
  if (typeof bookId === "string" && UUID_RE.test(bookId) && areaId == null) return { kind: "book", id: bookId };
  return "Alan ya da kitap seçilmedi.";
}

export function parseArea(b: Body): AreaInput | string {
  const name = text(b?.name, 40);
  if (!name) return "Alan adı boş olamaz.";
  const color = isStudyColor(b?.color) ? b.color : "pm";
  const dailyMinutes = b?.dailyMinutes == null || b.dailyMinutes === "" ? null : intIn(b.dailyMinutes, 5, 720);
  if (dailyMinutes === null && b?.dailyMinutes != null && b.dailyMinutes !== "") return "Günlük hedef 5-720 dakika olmalı.";
  return { name, color, dailyMinutes, shared: b?.shared === true };
}

export function parseBook(b: Body): BookInput | string {
  const title = text(b?.title, 200);
  if (!title) return "Kitap adı boş olamaz.";
  const kind = typeof b?.kind === "string" && b.kind in BOOK_KINDS ? (b.kind as BookKind) : "kitap";
  const status = typeof b?.status === "string" && b.status in BOOK_STATUS ? (b.status as BookStatus) : "okunuyor";
  const totalPages = b?.totalPages == null || b.totalPages === "" ? null : intIn(b.totalPages, 1, 20000);
  if (totalPages === null && b?.totalPages != null && b.totalPages !== "") return "Sayfa sayısı 1-20000 olmalı.";
  const currentPage = b?.currentPage == null || b.currentPage === "" ? 0 : intIn(b.currentPage, 0, 20000);
  if (currentPage === null) return "Kaldığın sayfa geçersiz.";
  if (totalPages !== null && currentPage > totalPages) return "Kaldığın sayfa toplam sayfadan büyük olamaz.";
  return { title, author: text(b?.author, 120), kind, totalPages, currentPage, note: text(b?.note, 500), status, shared: b?.shared === true };
}

export function parseSession(b: Body): SessionInput | string {
  const target = parseTarget(b);
  if (typeof target === "string") return target;
  const fromTimer = b?.fromTimer === true;
  const minutes = fromTimer ? 0 : b?.minutes == null || b.minutes === "" ? 0 : intIn(b.minutes, 0, 720);
  if (minutes === null) return "Süre 0-720 dakika olmalı.";
  const pages = b?.pages == null || b.pages === "" ? 0 : intIn(b.pages, 0, 5000);
  if (pages === null) return "Sayfa sayısı 0-5000 olmalı.";
  const toPage = target.kind === "book" && b?.toPage != null && b.toPage !== "" ? intIn(b.toPage, 0, 20000) : null;
  if (target.kind === "book" && b?.toPage != null && b.toPage !== "" && toPage === null) return "Kaldığın sayfa geçersiz.";
  return { target, fromTimer, minutes, pages, toPage, note: text(b?.note, 500) };
}
