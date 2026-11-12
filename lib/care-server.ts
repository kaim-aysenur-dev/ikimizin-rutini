import "server-only";
import { type Area, type CareState, careOf } from "./care";
import { addDays } from "./dates";
import { sql } from "./db";
import { type RoutineItem, getCheckKeys, getRoutine } from "./skin";
import { DAILY_SLOTS } from "./slots";

const DAYS = 10;
const AREAS: Area[] = ["yuz", "sac", "dis", "vucut"];

/**
 * Bakım aynasının durumu. Her bölge için son 10 günün tamamlanma oranı, yakın günler daha ağır (her gün geriye %20 azalır).
 * Bugün yalnız bir şey yapıldıysa sayılır: sabah henüz bakım yapılmadı diye ayna kötüleşmez.
 */
export async function careState(userId: string, today: string, items?: RoutineItem[]): Promise<CareState> {
  const from = addDays(today, -DAYS);
  const [routine, keys, [st]] = await Promise.all([
    items ?? getRoutine(userId),
    getCheckKeys(userId, from, today),
    sql()`
      select
        coalesce(sum(minutes) filter (where day between ${addDays(today, -7)} and ${addDays(today, -1)}), 0)::int as week_min,
        coalesce(sum(minutes) filter (where day = ${today}), 0)::int as today_min,
        to_char(max(day) filter (where minutes > 0), 'YYYY-MM-DD') as last_day
      from study_sessions where user_id = ${userId}`,
  ]);
  const done = new Set(keys);
  const daily = routine.filter((i) => DAILY_SLOTS.includes(i.slot));

  const areas = {} as Record<Area, number | null>;
  for (const a of AREAS) {
    const mine = daily.filter((i) => careOf(`${i.label} ${i.productName ?? ""}`).area === a);
    let sum = 0, weight = 0;
    for (let d = 0; d <= DAYS; d++) {
      const day = addDays(today, -d);
      const due = mine.filter((i) => i.since <= day);
      if (!due.length) continue;
      const ratio = due.filter((i) => done.has(`${day}|${i.id}`)).length / due.length;
      if (d === 0 && ratio === 0) continue;
      const w = d === 0 ? 1 : Math.pow(0.8, d - 1);
      sum += ratio * w; weight += w;
    }
    areas[a] = weight ? Math.round((sum / weight) * 100) / 100 : null;
  }

  // ardışık bakımsız gün (dünden geriye)
  let neglect = 0;
  for (let d = 1; d <= DAYS; d++) {
    const day = addDays(today, -d);
    if (daily.some((i) => i.since <= day && done.has(`${day}|${i.id}`))) break;
    if (daily.some((i) => i.since <= day)) neglect++;
  }

  // alışkanlıklar: son 10 günün yüz yogası ve sporu (haftada 3 tam sayılır), son 7 günün suyu ve öğünleri
  const [h] = await sql()`
    select
      (select count(distinct day) from face_yoga_sessions where user_id = ${userId} and day > ${addDays(today, -10)})::int as yoga,
      (select count(*) from face_yoga_sessions where user_id = ${userId} and day > ${addDays(today, -60)})::int as yoga_any,
      (select count(distinct day) from (
        select day from sport_sessions where user_id = ${userId} and day > ${addDays(today, -10)}
        union select day from activity_days where user_id = ${userId} and day > ${addDays(today, -10)} and workout_done) d)::int as sport,
      (select count(*) from nutrition_days n join users u on u.id = n.user_id where n.user_id = ${userId} and n.day > ${addDays(today, -7)} and n.water_glasses >= u.water_target)::int as water,
      (select count(*) from nutrition_days where user_id = ${userId} and day > ${addDays(today, -30)})::int as water_any,
      (select count(distinct day) from (select day from meal_checks where user_id = ${userId} and day > ${addDays(today, -7)} group by day having count(*) >= 2) m)::int as meals,
      (select count(*) from meal_checks where user_id = ${userId} and day > ${addDays(today, -30)})::int as meals_any`;
  const habits = {
    yoga: h.yoga_any ? Math.min(1, h.yoga / 4.3) : null,
    sport: Math.min(1, h.sport / 4.3),
    water: h.water_any ? Math.min(1, h.water / 6) : null,
    meals: h.meals_any ? Math.min(1, h.meals / 6) : null,
  };

  const last: string | null = st?.last_day ?? null;
  const idleDays = st?.today_min > 0 ? 0 : last ? Math.round((Date.parse(today) - Date.parse(last)) / 86400000) : 7;
  return {
    areas, neglect, habits,
    // haftada günde ortalama 45 dakika "tam" sayılır
    study: { score: Math.min(1, (st?.week_min ?? 0) / 7 / 45), idleDays: Math.min(30, idleDays), todayMin: st?.today_min ?? 0 },
  };
}

/** Gelişim'de masanın tozlanması için: kişilerin son çalışmasından beri geçen gün */
export async function studyIdleOf(userIds: string[], today: string): Promise<Record<string, number>> {
  if (!userIds.length) return {};
  const rows = await sql()`
    select u.id, to_char(max(s.day) filter (where s.minutes > 0), 'YYYY-MM-DD') as last_day
    from users u left join study_sessions s on s.user_id = u.id where u.id = any(${userIds}) group by u.id`;
  return Object.fromEntries(rows.map((r) => [r.id as string, r.last_day ? Math.round((Date.parse(today) - Date.parse(r.last_day)) / 86400000) : 30]));
}
