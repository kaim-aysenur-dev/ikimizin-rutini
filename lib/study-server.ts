import "server-only";
import { sql } from "./db";
import { addDays } from "./dates";
import { type Book, type BookKind, type BookStatus, type StudyArea, type StudyColor, type StudyOverview, type StudySession, studyXp } from "./study";

// Gelişim · Çalışma odası. Görünürlük: kendi alan/kitapların + aynı hesaptaki diğerinin ortak (shared) olanları.
// Ortak olanlara ikiniz de kayıt ekler ve düzenlersiniz; arşivleme ve "ortak" ayarı yalnız sahibinde.

type U = { id: string; accountId: string };
export type Target = { kind: "area" | "book"; id: string };
type Access = { userId: string; shared: boolean };

/** Alan ya da kitap bu kişiye görünüyor mu; görünüyorsa sahibi ve ortaklığı */
async function access(user: U, t: Target): Promise<Access | null> {
  const rows = t.kind === "area"
    ? await sql()`select a.user_id, a.shared from study_areas a join users u on u.id = a.user_id
        where a.id = ${t.id} and u.account_id = ${user.accountId} and not a.archived and (a.user_id = ${user.id} or a.shared)`
    : await sql()`select b.user_id, b.shared from books b join users u on u.id = b.user_id
        where b.id = ${t.id} and u.account_id = ${user.accountId} and not b.archived and (b.user_id = ${user.id} or b.shared)`;
  return rows[0] ? { userId: rows[0].user_id, shared: rows[0].shared } : null;
}

export async function studyOverview(user: U, today: string): Promise<StudyOverview> {
  const from = addDays(today, -60);
  const [areas, books, sessions, timers, [now]] = await Promise.all([
    sql()`
      select a.id, a.user_id, a.name, a.color, a.daily_minutes, a.shared,
        coalesce(sum(s.minutes) filter (where s.day = ${today}), 0)::int as today_min,
        coalesce(sum(s.minutes), 0)::int as total_min, coalesce(sum(s.pages), 0)::int as total_pages
      from study_areas a join users u on u.id = a.user_id
      left join study_sessions s on s.area_id = a.id
      where u.account_id = ${user.accountId} and not a.archived and (a.user_id = ${user.id} or a.shared)
      group by a.id order by a.created_at`,
    sql()`
      select b.id, b.user_id, b.title, b.author, b.kind, b.total_pages, b.current_page, b.note, b.status, b.shared,
        coalesce(sum(s.minutes), 0)::int as total_min
      from books b join users u on u.id = b.user_id
      left join study_sessions s on s.book_id = b.id
      where u.account_id = ${user.accountId} and not b.archived and (b.user_id = ${user.id} or b.shared)
      group by b.id order by b.updated_at desc`,
    // günlük: kendi kayıtların + ortak alan/kitaplara diğerinin girdiği kayıtlar
    sql()`
      select s.id, s.user_id, s.area_id, s.book_id, to_char(s.day, 'YYYY-MM-DD') as day, s.minutes, s.pages, s.together, s.note
      from study_sessions s join users u on u.id = s.user_id
      left join study_areas a on a.id = s.area_id left join books b on b.id = s.book_id
      where u.account_id = ${user.accountId} and s.day >= ${from}
        and (s.user_id = ${user.id} or a.shared or b.shared)
      order by s.day desc, s.created_at desc limit 300`,
    sql()`
      select t.user_id, t.area_id, t.book_id, t.started_at from study_timers t join users u on u.id = t.user_id
      where u.account_id = ${user.accountId}`,
    sql()`select now() as now`,
  ]);
  return {
    areas: areas.map((r): StudyArea => ({
      id: r.id, userId: r.user_id, name: r.name, color: r.color, dailyMinutes: r.daily_minutes, shared: r.shared,
      todayMin: r.today_min, totalMin: r.total_min, totalPages: r.total_pages,
    })),
    books: books.map((r): Book => ({
      id: r.id, userId: r.user_id, title: r.title, author: r.author, kind: r.kind, totalPages: r.total_pages,
      currentPage: r.current_page, note: r.note, status: r.status, shared: r.shared, totalMin: r.total_min,
    })),
    sessions: sessions.map((r): StudySession => ({
      id: r.id, userId: r.user_id, areaId: r.area_id, bookId: r.book_id, day: r.day,
      minutes: r.minutes, pages: r.pages, together: r.together, note: r.note,
    })),
    timers: timers.map((r) => ({ userId: r.user_id, areaId: r.area_id, bookId: r.book_id, startedAt: new Date(r.started_at).toISOString() })),
    serverNow: new Date(now.now).toISOString(),
  };
}

/* ---------------------------------- alanlar ---------------------------------- */

export type AreaInput = { name: string; color: StudyColor; dailyMinutes: number | null; shared: boolean };

export async function createArea(user: U, a: AreaInput): Promise<string> {
  const [r] = await sql()`
    insert into study_areas (user_id, name, color, daily_minutes, shared)
    values (${user.id}, ${a.name}, ${a.color}, ${a.dailyMinutes}, ${a.shared}) returning id`;
  return r.id;
}

export async function updateArea(user: U, id: string, a: AreaInput): Promise<boolean> {
  const acc = await access(user, { kind: "area", id });
  if (!acc) return false;
  const shared = acc.userId === user.id ? a.shared : acc.shared;
  await sql()`update study_areas set name = ${a.name}, color = ${a.color}, daily_minutes = ${a.dailyMinutes}, shared = ${shared} where id = ${id}`;
  return true;
}

/** Yalnız sahibi kaldırır; kayıtlar ve XP'si kalır */
export async function archiveArea(user: U, id: string): Promise<boolean> {
  const rows = await sql()`update study_areas set archived = true where id = ${id} and user_id = ${user.id} returning id`;
  if (rows.length) await sql()`delete from study_timers where area_id = ${id}`;
  return rows.length > 0;
}

/* --------------------------------- kitaplar --------------------------------- */

export type BookInput = {
  title: string; author: string; kind: BookKind; totalPages: number | null; currentPage: number; note: string; status: BookStatus; shared: boolean;
};

export async function createBook(user: U, b: BookInput): Promise<string> {
  const [r] = await sql()`
    insert into books (user_id, title, author, kind, total_pages, current_page, note, status, shared)
    values (${user.id}, ${b.title}, ${b.author}, ${b.kind}, ${b.totalPages}, ${b.currentPage}, ${b.note}, ${b.status}, ${b.shared}) returning id`;
  return r.id;
}

export async function updateBook(user: U, id: string, b: BookInput): Promise<boolean> {
  const acc = await access(user, { kind: "book", id });
  if (!acc) return false;
  const shared = acc.userId === user.id ? b.shared : acc.shared;
  await sql()`
    update books set title = ${b.title}, author = ${b.author}, kind = ${b.kind}, total_pages = ${b.totalPages},
      current_page = ${b.currentPage}, note = ${b.note}, status = ${b.status}, shared = ${shared}, updated_at = now()
    where id = ${id}`;
  return true;
}

export async function archiveBook(user: U, id: string): Promise<boolean> {
  const rows = await sql()`update books set archived = true where id = ${id} and user_id = ${user.id} returning id`;
  if (rows.length) await sql()`delete from study_timers where book_id = ${id}`;
  return rows.length > 0;
}

/* ---------------------------------- sayaç ---------------------------------- */

/** Sayacı başlatır; kişinin çalışan başka sayacı varsa onun yerine geçer */
export async function startTimer(user: U, t: Target): Promise<boolean> {
  if (!(await access(user, t))) return false;
  const area = t.kind === "area" ? t.id : null, book = t.kind === "book" ? t.id : null;
  await sql()`
    insert into study_timers (user_id, area_id, book_id, started_at) values (${user.id}, ${area}, ${book}, now())
    on conflict (user_id) do update set area_id = excluded.area_id, book_id = excluded.book_id, started_at = now()`;
  return true;
}

/** Gelişim çubuğu için kişinin çalışan sayacı */
export async function myTimer(userId: string): Promise<{ label: string; startedAt: string } | null> {
  const [r] = await sql()`
    select t.started_at, coalesce(a.name, b.title) as label from study_timers t
    left join study_areas a on a.id = t.area_id left join books b on b.id = t.book_id
    where t.user_id = ${userId}`;
  return r ? { label: r.label ?? "Çalışma", startedAt: new Date(r.started_at).toISOString() } : null;
}

export async function cancelTimer(user: U) {
  await sql()`delete from study_timers where user_id = ${user.id}`;
}

/* --------------------------------- oturumlar -------------------------------- */

export type SessionInput = { target: Target; fromTimer: boolean; minutes: number; pages: number; toPage: number | null; note: string };
export type SaveResult = { ok: true; id: string; xp: number; together: boolean; minutes: number; pages: number } | { ok: false; status: number; error: string };

/**
 * Oturumu bugüne yazar. Sayaçtan geliyorsa süre sunucudaki başlangıçtan hesaplanır ve
 * diğer profil o sırada çalışıyorduysa (sayacı açık ya da bu arada kayıt girmişse) "birlikte" sayılır.
 * Kitapta "kaldığım sayfa" verilirse okunan sayfa ondan hesaplanır ve kitabın sayfası ilerler.
 */
export async function saveSession(user: U, today: string, s: SessionInput): Promise<SaveResult> {
  if (!(await access(user, s.target))) return { ok: false, status: 404, error: "Alan ya da kitap bulunamadı." };
  const area = s.target.kind === "area" ? s.target.id : null, book = s.target.kind === "book" ? s.target.id : null;
  let minutes = s.minutes, together = false;

  if (s.fromTimer) {
    const [t] = await sql()`select area_id, book_id, started_at from study_timers where user_id = ${user.id}`;
    if (!t || t.area_id !== area || t.book_id !== book) return { ok: false, status: 409, error: "Çalışan sayaç bulunamadı." };
    minutes = Math.min(720, Math.max(0, Math.round((Date.now() - new Date(t.started_at).getTime()) / 60000)));
    const [p] = await sql()`
      select exists (select 1 from study_timers x join users u on u.id = x.user_id
          where u.account_id = ${user.accountId} and x.user_id <> ${user.id})
        or exists (select 1 from study_sessions x join users u on u.id = x.user_id
          where u.account_id = ${user.accountId} and x.user_id <> ${user.id} and x.created_at >= ${t.started_at} and x.minutes > 0) as together`;
    together = p.together && minutes > 0;
  }

  let pages = s.pages;
  if (book && s.toPage !== null) {
    const [b] = await sql()`select current_page, total_pages from books where id = ${book}`;
    const to = b.total_pages ? Math.min(s.toPage, b.total_pages) : s.toPage;
    pages = Math.max(0, to - b.current_page);
    const done = b.total_pages !== null && to >= b.total_pages;
    await sql()`
      update books set current_page = ${to}, status = ${done ? "bitti" : "okunuyor"},
        note = case when ${s.note} = '' then note else ${s.note} end, updated_at = now()
      where id = ${book}`;
  }
  if (minutes === 0 && pages === 0) {
    if (s.fromTimer) await cancelTimer(user);
    return { ok: false, status: 400, error: "Kaydedilecek süre ya da sayfa yok." };
  }

  const [r] = await sql()`
    insert into study_sessions (user_id, area_id, book_id, day, minutes, pages, together, note)
    values (${user.id}, ${area}, ${book}, ${today}, ${minutes}, ${pages}, ${together}, ${s.note}) returning id`;
  if (s.fromTimer) await cancelTimer(user);
  return { ok: true, id: r.id, xp: studyXp(minutes, pages, together), together, minutes, pages };
}

/** Yalnız kendi kaydını siler; geri alınan XP'yi döndürür */
export async function deleteSession(user: U, id: string): Promise<number | null> {
  const [r] = await sql()`delete from study_sessions where id = ${id} and user_id = ${user.id} returning minutes, pages, together`;
  return r ? studyXp(r.minutes, r.pages, r.together) : null;
}
