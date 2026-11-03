import "server-only";
import { cache } from "react";
import { sql } from "./db";
import { streakAndDays } from "./overview";
import { XP, type Stats } from "./xp";

type Counts = { checks: number; meals: number; yoga: number; sport: number };

// since: seviye sıfırlama anı (users.xp_since); öncesindeki kayıtlar sayılmaz. days: yalnız o günler (birlikte bonusu)
const counts = async (userId: string, since: string | null, days?: string[]): Promise<Counts> => {
  const only = days ?? null;
  const [r] = await sql()`
    select
      (select count(*) from checks where user_id = ${userId}
        and (${since}::timestamptz is null or checked_at >= ${since}) and (${only}::date[] is null or day = any(${only}::date[])))::int as checks,
      (select count(*) from meal_checks where user_id = ${userId}
        and (${since}::timestamptz is null or checked_at >= ${since}) and (${only}::date[] is null or day = any(${only}::date[])))::int as meals,
      (select count(*) from face_yoga_sessions where user_id = ${userId}
        and (${since}::timestamptz is null or created_at >= ${since}) and (${only}::date[] is null or day = any(${only}::date[])))::int as yoga,
      (select count(*) from sport_sessions where user_id = ${userId}
        and (${since}::timestamptz is null or created_at >= ${since}) and (${only}::date[] is null or day = any(${only}::date[])))::int as sport`;
  return r as Counts;
};
// rozetler için ek sayaçlar: spor dakikası, cilt günlüğü, su günleri, aktif gün, evdeki ve bahçedeki eşyalar
const extras = async (userId: string, since: string | null, sinceDay: string | null) => {
  const [r] = await sql()`
    select
      (select coalesce(sum(minutes), 0) from sport_sessions where user_id = ${userId} and (${since}::timestamptz is null or created_at >= ${since}))::int as sport_min,
      (select count(*) from skin_journal where user_id = ${userId} and (${sinceDay}::date is null or day >= ${sinceDay}::date))::int as journal,
      (select count(*) from nutrition_days where user_id = ${userId} and water_glasses >= 8 and (${sinceDay}::date is null or day >= ${sinceDay}::date))::int as water_days,
      (select count(distinct day) from checks where user_id = ${userId} and (${since}::timestamptz is null or checked_at >= ${since}))::int as active_days,
      (select count(*) from placed_items where user_id = ${userId} and scope = 'oda')::int as decor,
      (select count(*) from placed_items where user_id = ${userId} and scope = 'bahce')::int as garden`;
  return { sportMin: r.sport_min as number, journal: r.journal as number, waterDays: r.water_days as number, activeDays: r.active_days as number, decor: r.decor as number, garden: r.garden as number };
};
const xpOf = (c: Counts) => c.checks * XP.check + c.meals * XP.meal + c.yoga * XP.faceYoga + c.sport * XP.sport;

export type Adventure = { xp: number; stats: Stats; meToday: boolean; partnerToday: boolean; partnerName: string | null };

// Kişinin macerası (istek başına bir kez; layout ve sayfa paylaşır): toplam XP (birlikte tamamlanan günlerin XP'si iki kat), seri, rozet sayaçları.
export const adventure = cache(async (userId: string, accountId: string, today: string): Promise<Adventure> => {
  const [[me], [partner], mine] = await Promise.all([
    sql()`select xp_since, to_char((xp_since at time zone 'Europe/Istanbul')::date, 'YYYY-MM-DD') as since_day from users where id = ${userId}`,
    sql()`select id, display_name from users where account_id = ${accountId} and id <> ${userId} order by created_at limit 1`,
    streakAndDays(userId, today),
  ]);
  const since: string | null = me?.xp_since ? new Date(me.xp_since).toISOString() : null;
  const sinceDay: string = me?.since_day ?? "";
  const [all, extra, theirs] = await Promise.all([counts(userId, since), extras(userId, since, me?.since_day ?? null), partner ? streakAndDays(partner.id, today) : null]);
  const together = theirs ? [...mine.done].filter((d) => d >= sinceDay && theirs.done.has(d)) : [];
  const bonus = together.length ? xpOf(await counts(userId, since, together)) : 0;
  return {
    xp: xpOf(all) + bonus,
    stats: { ...all, ...extra, streak: mine.streak.current, best: mine.streak.best, together: together.length },
    meToday: mine.streak.todayComplete,
    partnerToday: theirs?.streak.todayComplete ?? false,
    partnerName: partner?.display_name ?? null,
  };
});
