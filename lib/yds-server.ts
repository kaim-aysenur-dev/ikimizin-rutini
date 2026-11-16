import "server-only";
import { addDays } from "./dates";
import { sql } from "./db";
import {
  BUILTIN, type Card, DEFAULT_SETTINGS, type Grade, type Lock, type Mode, type Section, type YdsDay, type YdsSettings, type YdsToday, builtinByKey, isDone, nextBox, quotaFor,
} from "./yds";

// YDS Kampı. Herkes kendi kartlarını, kayıtlarını ve denemelerini görür; partner yalnız günlük kota durumunu görür.

type U = { id: string; accountId: string };

/** fallback: ayar yoksa mod (adından: Ayşenur YDS, diğeri genel İngilizce) */
export async function settingsOf(userId: string, fallback: Mode = "yds"): Promise<YdsSettings & { exists: boolean }> {
  const [r] = await sql()`select mode, to_char(exam_date, 'YYYY-MM-DD') as exam_date, target, daily_words, daily_new, daily_questions, lock from yds_settings where user_id = ${userId}`;
  if (!r) return { ...DEFAULT_SETTINGS, mode: fallback, exists: false };
  return { mode: r.mode as Mode, examDate: r.exam_date, target: r.target, dailyWords: r.daily_words, dailyNew: r.daily_new, dailyQuestions: r.daily_questions, lock: r.lock as Lock, exists: true };
}

export async function saveSettings(userId: string, s: YdsSettings) {
  await sql()`
    insert into yds_settings (user_id, mode, exam_date, target, daily_words, daily_new, daily_questions, lock, updated_at)
    values (${userId}, ${s.mode}, ${s.examDate}, ${s.target}, ${s.dailyWords}, ${s.dailyNew}, ${s.dailyQuestions}, ${s.lock}, now())
    on conflict (user_id) do update set mode = excluded.mode, exam_date = excluded.exam_date, target = excluded.target, daily_words = excluded.daily_words,
      daily_new = excluded.daily_new, daily_questions = excluded.daily_questions, lock = excluded.lock, updated_at = now()`;
}

/** Günlük kart ve soru sayıları (boş günler dahil) */
export async function daysOf(userId: string, from: string, to: string): Promise<YdsDay[]> {
  const [rev, pr] = await Promise.all([
    sql()`select to_char(day, 'YYYY-MM-DD') as day, count(*)::int as words, count(*) filter (where is_new)::int as new_words from yds_reviews where user_id = ${userId} and day between ${from} and ${to} group by day`,
    sql()`select to_char(day, 'YYYY-MM-DD') as day, sum(solved)::int as q, sum(correct)::int as c from yds_practice where user_id = ${userId} and day between ${from} and ${to} group by day`,
  ]);
  const out: YdsDay[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const r = rev.find((x) => x.day === d), p = pr.find((x) => x.day === d);
    out.push({ day: d, words: r?.words ?? 0, newWords: r?.new_words ?? 0, questions: p?.q ?? 0, correct: p?.c ?? 0 });
  }
  return out;
}

async function availableCards(userId: string, today: string, s: YdsSettings, newToday: number): Promise<{ due: number; fresh: number }> {
  const [[r], seen] = await Promise.all([
    sql()`select count(*) filter (where due <= ${today})::int as due, (select count(*) from yds_words w where w.user_id = ${userId}
      and not exists (select 1 from yds_cards c where c.user_id = ${userId} and c.word_key = 'k:' || w.id))::int as own_new from yds_cards where user_id = ${userId}`,
    sql()`select count(*)::int as n from yds_cards where user_id = ${userId} and word_key like 'b:%'`,
  ]);
  const unseen = BUILTIN.length - seen[0].n + r.own_new;
  return { due: r.due, fresh: Math.min(Math.max(0, s.dailyNew - newToday), unseen) };
}

/** Bugünün durumu: kota (telafiyle), yapılan, kalan kart */
export async function todayOf(userId: string, today: string, s?: YdsSettings): Promise<YdsToday & { settings: YdsSettings & { exists?: boolean } }> {
  const settings = s ?? (await settingsOf(userId));
  const days = await daysOf(userId, addDays(today, -3), today);
  const t = days[days.length - 1], quota = quotaFor(settings, days.slice(0, 3));
  const av = await availableCards(userId, today, settings, t.newWords);
  const base = { words: t.words, questions: t.questions, correct: t.correct, quota, availableCards: av.due + av.fresh };
  return { ...base, done: isDone(base), settings };
}

/** Çalışma oturumu: vadesi gelen tekrarlar + günün yeni kelimeleri (önce kendi eklediklerin) */
export async function sessionOf(userId: string, today: string): Promise<Card[]> {
  const s = await settingsOf(userId);
  const [due, seenRows, own, [nt]] = await Promise.all([
    sql()`select word_key, box from yds_cards where user_id = ${userId} and due <= ${today} order by due, box limit 300`,
    sql()`select word_key from yds_cards where user_id = ${userId}`,
    sql()`select id, en, tr from yds_words where user_id = ${userId} order by created_at`,
    sql()`select count(*) filter (where is_new)::int as n from yds_reviews where user_id = ${userId} and day = ${today}`,
  ]);
  const seen = new Set(seenRows.map((r) => r.word_key as string)), ownBy = new Map(own.map((w) => [`k:${w.id}`, w]));
  const resolve = (key: string, box: number, isNew: boolean): Card | null => {
    const b = builtinByKey.get(key); if (b) return { key, en: b.en, tr: b.tr, kind: b.kind, isNew, box };
    const o = ownBy.get(key); return o ? { key, en: o.en, tr: o.tr, kind: "kendi", isNew, box } : null;
  };
  const cards = due.map((r) => resolve(r.word_key, r.box, false)).filter((c): c is Card => !!c);
  let fresh = Math.max(0, s.dailyNew - nt.n);
  for (const w of own) { if (!fresh) break; const k = `k:${w.id}`; if (!seen.has(k)) { cards.push(resolve(k, 0, true)!); fresh--; } }
  for (const w of BUILTIN) { if (!fresh) break; if (!seen.has(w.key)) { cards.push(resolve(w.key, 0, true)!); fresh--; } }
  return cards;
}

/** Kartı notlar: kutusu ve sonraki tekrar günü güncellenir, günün kaydına yazılır */
export async function gradeCard(userId: string, today: string, key: string, g: Grade): Promise<boolean> {
  if (!builtinByKey.has(key)) {
    const id = key.startsWith("k:") ? key.slice(2) : "";
    const [own] = /^[0-9a-f-]{36}$/.test(id) ? await sql()`select 1 from yds_words where id = ${id} and user_id = ${userId}` : [];
    if (!own) return false;
  }
  const [cur] = await sql()`select box from yds_cards where user_id = ${userId} and word_key = ${key}`;
  const nb = nextBox(cur?.box ?? 0, g), due = addDays(today, nb.days);
  await sql()`
    insert into yds_cards (user_id, word_key, box, due, reps, lapses) values (${userId}, ${key}, ${nb.box}, ${due}, 1, ${g === 0 ? 1 : 0})
    on conflict (user_id, word_key) do update set box = excluded.box, due = excluded.due, reps = yds_cards.reps + 1, lapses = yds_cards.lapses + ${g === 0 ? 1 : 0}`;
  await sql()`insert into yds_reviews (user_id, day, word_key, grade, is_new) values (${userId}, ${today}, ${key}, ${g}, ${!cur})`;
  return true;
}

/* ------------------------------ kendi kelimelerin ------------------------------ */

export async function wordsOf(userId: string) {
  const rows = await sql()`
    select w.id, w.en, w.tr, c.box, to_char(c.due, 'YYYY-MM-DD') as due from yds_words w
    left join yds_cards c on c.user_id = w.user_id and c.word_key = 'k:' || w.id
    where w.user_id = ${userId} order by w.created_at desc`;
  return rows.map((r) => ({ id: r.id as string, en: r.en as string, tr: r.tr as string, box: (r.box as number | null) ?? null, due: (r.due as string | null) ?? null }));
}
export async function addWord(userId: string, en: string, tr: string): Promise<string | { error: string }> {
  const [{ n }] = await sql()`select count(*)::int as n from yds_words where user_id = ${userId}`;
  if (n >= 3000) return { error: "En fazla 3000 kendi kelimen olabilir." };
  const [r] = await sql()`insert into yds_words (user_id, en, tr) values (${userId}, ${en}, ${tr}) returning id`;
  return r.id;
}
export async function deleteWord(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`delete from yds_words where id = ${id} and user_id = ${userId} returning id`;
  if (rows.length) await sql()`delete from yds_cards where user_id = ${userId} and word_key = ${`k:${id}`}`;
  return rows.length > 0;
}

/* -------------------------------- soru ve deneme -------------------------------- */

export async function logPractice(userId: string, today: string, section: string, solved: number, correct: number) {
  const [r] = await sql()`insert into yds_practice (user_id, day, section, solved, correct) values (${userId}, ${today}, ${section}, ${solved}, ${correct}) returning id`;
  return r.id as string;
}
export async function deletePractice(userId: string, id: string) {
  const rows = await sql()`delete from yds_practice where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

export type Exam = { id: string; day: string; title: string; sections: Partial<Record<Section, { correct: number; total: number }>>; correct: number; total: number; minutes: number | null };
export async function addExam(userId: string, e: Omit<Exam, "id">) {
  const [r] = await sql()`
    insert into yds_exams (user_id, day, title, sections, correct, total, minutes)
    values (${userId}, ${e.day}, ${e.title}, ${JSON.stringify(e.sections)}::jsonb, ${e.correct}, ${e.total}, ${e.minutes}) returning id`;
  return r.id as string;
}
export async function deleteExam(userId: string, id: string) {
  const rows = await sql()`delete from yds_exams where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

/* ------------------------------------ özet ------------------------------------ */

/** YDS sayfası: bugün, son 30 gün, seri, kart istatistiği, bölüm doğruluğu, denemeler, bugünkü soru kayıtları, partnerin durumu */
export async function ydsOverview(user: U, today: string, fallback: Mode = "yds") {
  const settings = await settingsOf(user.id, fallback);
  const from = addDays(today, -29);
  const [t, days, [cards], sections, exams, practice, partnerRow] = await Promise.all([
    todayOf(user.id, today, settings),
    daysOf(user.id, from, today),
    sql()`select count(*)::int as seen, count(*) filter (where box >= 4)::int as learned, count(*) filter (where box between 1 and 3)::int as learning from yds_cards where user_id = ${user.id}`,
    sql()`select section, sum(solved)::int as solved, sum(correct)::int as correct from yds_practice where user_id = ${user.id} and day >= ${from} group by section`,
    sql()`select id, to_char(day, 'YYYY-MM-DD') as day, title, sections, correct, total, minutes from yds_exams where user_id = ${user.id} order by day desc, created_at desc limit 30`,
    sql()`select id, section, solved, correct from yds_practice where user_id = ${user.id} and day = ${today} order by created_at desc`,
    sql()`select u.id, u.display_name, s.mode from users u join yds_settings s on s.user_id = u.id where u.account_id = ${user.accountId} and u.id <> ${user.id} limit 1`,
  ]);
  const ok = (d: YdsDay) => d.words >= settings.dailyWords && d.questions >= settings.dailyQuestions;
  // seri: bugün bittiyse sayılır; dünden geriye kotası tutan kesintisiz günler (bugün henüz bitmediyse seri bozulmaz)
  let streak = t.done ? 1 : 0;
  for (let k = days.length - 2; k >= 0 && ok(days[k]); k--) streak++;
  const partner = partnerRow[0] ? { id: partnerRow[0].id as string, name: (partnerRow[0].display_name as string).split(" ")[0], mode: partnerRow[0].mode as Mode, today: await todayOf(partnerRow[0].id, today) } : null;
  return {
    settings, today: t, days, streak, cards: { seen: cards.seen as number, learned: cards.learned as number, learning: cards.learning as number, total: BUILTIN.length },
    sections: Object.fromEntries(sections.map((r) => [r.section, { solved: r.solved, correct: r.correct }])) as Record<string, { solved: number; correct: number }>,
    exams: exams.map((r): Exam => ({ id: r.id, day: r.day, title: r.title, sections: r.sections, correct: r.correct, total: r.total, minutes: r.minutes })),
    practice: practice.map((r) => ({ id: r.id as string, section: r.section as string, solved: r.solved as number, correct: r.correct as number })),
    partner: partner && { id: partner.id, name: partner.name, mode: partner.mode, words: partner.today.words, questions: partner.today.questions, quota: partner.today.quota, done: partner.today.done },
  };
}

/** Bugün kartı ve Gelişim kilidi için hafif durum (YDS ayarı yoksa null) */
export async function ydsStatus(userId: string, today: string) {
  const s = await settingsOf(userId);
  if (!s.exists) return null;
  const t = await todayOf(userId, today, s);
  return { done: t.done, words: t.words, questions: t.questions, quota: t.quota, lock: s.lock, examDate: s.examDate, target: s.target, mode: s.mode };
}

/** Bugün sayfasındaki kart: kendi durumun ve partnerinki (YDS ayarı olanlar) */
export async function ydsCardData(user: U, today: string) {
  const [me, partners] = await Promise.all([
    ydsStatus(user.id, today),
    sql()`select u.id, u.display_name from users u join yds_settings s on s.user_id = u.id where u.account_id = ${user.accountId} and u.id <> ${user.id} limit 1`,
  ]);
  const p = partners[0];
  const ps = p ? await ydsStatus(p.id as string, today) : null;
  return { me, partner: p && ps ? { name: (p.display_name as string).split(" ")[0], ...ps } : null };
}
