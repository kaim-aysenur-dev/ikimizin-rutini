import "server-only";
import { sql } from "@/lib/db";
import { addDays, weekdayIndex } from "@/lib/dates";
import { getPlan, planSince, waterSince } from "@/lib/nutrition";

// Günün tamamlanması ve seri: cilt (günlük adımlar) + plandaki öğünler + su hedefi + planlı antrenman.
// Her bölüm, kurulduğu günden itibaren sayılır; öncesi "eksik" sayılmaz.

export type Streak = { current: number; best: number; todayComplete: boolean };

export async function getOverallStreak(userId: string, today: string, days = 400): Promise<Streak> {
  const from = addDays(today, -days);
  const db = sql();
  const [skinItems, skinChecks, plan, mealsSince, waterFrom, mealChecks, water, settings, training, workoutSinceRows, activity] =
    await Promise.all([
      db`select ri.id, to_char((ri.created_at at time zone 'Europe/Istanbul')::date, 'YYYY-MM-DD') as since
         from routine_items ri left join products p on p.id = ri.product_id
         where ri.user_id = ${userId} and ri.active and (p.id is null or not p.archived)
           and ri.slot in ('sabah', 'aksam', 'dus')`,
      db`select to_char(day, 'YYYY-MM-DD') as day, item_id from checks where user_id = ${userId} and day >= ${from}`,
      getPlan(userId),
      planSince(userId),
      waterSince(userId),
      db`select to_char(day, 'YYYY-MM-DD') as day, meal from meal_checks where user_id = ${userId} and day >= ${from}`,
      db`select to_char(day, 'YYYY-MM-DD') as day, water_glasses from nutrition_days where user_id = ${userId} and day >= ${from}`,
      db`select water_target, water_target_sport from users where id = ${userId}`,
      db`select distinct w.weekday from workout_plan_items w join exercises e on e.id = w.exercise_id
         where w.user_id = ${userId} and not e.archived`,
      db`select to_char((min(created_at) at time zone 'Europe/Istanbul')::date, 'YYYY-MM-DD') as since
         from workout_plan_items where user_id = ${userId}`,
      db`select to_char(day, 'YYYY-MM-DD') as day from activity_days
         where user_id = ${userId} and day >= ${from} and workout_done`,
    ]);

  const skinChecked = new Set(skinChecks.map((r) => `${r.day}|${r.item_id}`));
  const mealChecked = new Set(mealChecks.map((r) => `${r.day}|${r.meal}`));
  const waterByDay = new Map(water.map((r) => [r.day as string, r.water_glasses as number]));
  const trainingDays = new Set(training.map((r) => r.weekday as number));
  const workoutSince: string | null = workoutSinceRows[0]?.since ?? null;
  const workoutDone = new Set(activity.map((r) => r.day as string));
  const target = settings[0]?.water_target ?? 8;
  const targetSport = settings[0]?.water_target_sport ?? target;
  const mealsByWeekday = new Map<number, string[]>();
  for (const m of plan) {
    if (m.items.length || m.note) mealsByWeekday.set(m.weekday, [...(mealsByWeekday.get(m.weekday) ?? []), m.meal]);
  }

  const isComplete = (day: string) => {
    let total = 0;
    let done = 0;
    for (const item of skinItems) {
      if (day < item.since) continue;
      total++;
      if (skinChecked.has(`${day}|${item.id}`)) done++;
    }
    const wd = weekdayIndex(day);
    if (mealsSince && day >= mealsSince) {
      for (const meal of mealsByWeekday.get(wd) ?? []) {
        total++;
        if (mealChecked.has(`${day}|${meal}`)) done++;
      }
    }
    if (waterFrom && day >= waterFrom) {
      total++;
      if ((waterByDay.get(day) ?? 0) >= (trainingDays.has(wd) ? targetSport : target)) done++;
    }
    if (workoutSince && day >= workoutSince && trainingDays.has(wd)) {
      total++;
      if (workoutDone.has(day)) done++;
    }
    return total > 0 && done === total;
  };

  let best = 0;
  let run = 0;
  for (let d = from; d <= today; d = addDays(d, 1)) {
    run = isComplete(d) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  // Bugün henüz bitmediyse seri dünden sayılır, bozulmuş sayılmaz
  const todayComplete = isComplete(today);
  let current = 0;
  for (let d = todayComplete ? today : addDays(today, -1); d >= from && isComplete(d); d = addDays(d, -1)) current++;
  return { current, best, todayComplete };
}
