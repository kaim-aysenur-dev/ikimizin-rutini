import type { Metadata } from "next";
import { TodayView } from "@/components/today/today-view";
import { requireUser } from "@/lib/auth/session";
import { formatDayLong, todayIstanbul, weekDays, weekStart, weekdayIndex } from "@/lib/dates";
import type { Meal } from "@/lib/meals";
import { getMealChecks, getNutritionDays, getPlanForWeekday, getWaterSettings, waterSince } from "@/lib/nutrition";
import { getOverallStreak } from "@/lib/overview";
import { getCheckKeys, getRoutine } from "@/lib/skin";
import { getActivity, getWorkoutPlan } from "@/lib/sport";

export const metadata: Metadata = { title: "Bugün" };

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", hourCycle: "h23" }).format(new Date()),
  );
  if (hour >= 5 && hour < 11) return "Günaydın";
  if (hour >= 11 && hour < 17) return "İyi günler";
  if (hour >= 17 && hour < 22) return "İyi akşamlar";
  return "İyi geceler";
}

export default async function TodayPage() {
  const user = await requireUser();
  const today = todayIstanbul();
  const wd = weekdayIndex(today);
  const week = weekDays(weekStart(today));
  const [items, checks, meals, mealChecks, nutritionDay, water, waterFrom, workoutPlan, activity, streak] = await Promise.all([
    getRoutine(user.id),
    getCheckKeys(user.id, week[0]!, week[6]!),
    getPlanForWeekday(user.id, wd),
    getMealChecks(user.id, today, today),
    getNutritionDays(user.id, today, today),
    getWaterSettings(user.id),
    waterSince(user.id),
    getWorkoutPlan(user.id),
    getActivity(user.id, today, today),
    getOverallStreak(user.id, today),
  ]);
  const workoutToday = workoutPlan.items.filter((i) => i.weekday === wd);
  const sportDay = workoutToday.length > 0;

  return (
    <main className="main narrow">
      <header className="page-head">
        <p className="eyebrow">
          {greeting()}, {user.displayName.split(" ")[0]}
        </p>
        <h1>{formatDayLong(today)}</h1>
      </header>
      <TodayView
        key={today}
        today={today}
        week={week}
        items={items}
        initialChecks={checks}
        meals={meals}
        mealChecks={mealChecks.map((k) => k.split("|")[1] as Meal)}
        water={{
          tracked: Boolean(waterFrom),
          initial: nutritionDay[0]?.water ?? 0,
          target: sportDay ? water.targetSport : water.target,
          glassMl: water.glassMl,
          sportDay,
        }}
        workout={{
          planned: sportDay,
          title: workoutPlan.titles[wd] ?? "",
          count: workoutToday.length,
          done: activity[0]?.workoutDone ?? false,
        }}
        streak={{ current: streak.current, todayComplete: streak.todayComplete }}
      />
    </main>
  );
}
