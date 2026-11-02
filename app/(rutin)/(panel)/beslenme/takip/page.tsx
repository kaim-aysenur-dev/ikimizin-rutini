import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DailyTracking } from "@/components/nutrition/daily-tracking";
import { requireUser } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { addDays, formatDayLong, isDay, todayIstanbul, weekdayIndex } from "@/lib/dates";
import type { Meal } from "@/lib/meals";
import { getMealChecks, getNutritionDays, getPlanForWeekday, getWaterSettings } from "@/lib/nutrition";

export const metadata: Metadata = { title: "Beslenme · Takip" };

export default async function NutritionTrackingPage({ searchParams }: PageProps<"/beslenme/takip">) {
  const user = await requireUser();
  const today = todayIstanbul();
  const { gun } = await searchParams;
  const day = isDay(gun) && gun <= today ? gun : today;
  const wd = weekdayIndex(day);

  const [meals, checks, days, water, training] = await Promise.all([
    getPlanForWeekday(user.id, wd),
    getMealChecks(user.id, day, day),
    getNutritionDays(user.id, day, day),
    getWaterSettings(user.id),
    sql()`select 1 from workout_plan_items w join exercises e on e.id = w.exercise_id
          where w.user_id = ${user.id} and w.weekday = ${wd} and not e.archived limit 1`,
  ]);
  const sportDay = training.length > 0;
  const href = (d: string) => (d === today ? "/beslenme/takip" : `/beslenme/takip?gun=${d}`);

  return (
    <>
      <div className="week-nav">
        <Link href={href(addDays(day, -1))} className="icon-btn" aria-label="Önceki gün">
          <ChevronLeft size={20} />
        </Link>
        <span className="week-range">{formatDayLong(day)}</span>
        {day < today ? (
          <Link href={href(addDays(day, 1))} className="icon-btn" aria-label="Sonraki gün">
            <ChevronRight size={20} />
          </Link>
        ) : (
          <span className="icon-btn" aria-disabled="true">
            <ChevronRight size={20} />
          </span>
        )}
        {day !== today && (
          <Link href="/beslenme/takip" className="btn btn-quiet week-today">
            Bugün
          </Link>
        )}
      </div>
      <DailyTracking
        key={day}
        day={day}
        today={today}
        meals={meals}
        initialChecks={checks.map((k) => k.split("|")[1] as Meal)}
        water={{
          initial: days[0]?.water ?? 0,
          target: sportDay ? water.targetSport : water.target,
          glassMl: water.glassMl,
          sportDay,
        }}
        note={days[0]?.note ?? ""}
      />
    </>
  );
}
