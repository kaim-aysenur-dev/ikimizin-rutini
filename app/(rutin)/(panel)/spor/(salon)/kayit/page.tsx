import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WorkoutLog } from "@/components/sport/workout-log";
import { requireUser } from "@/lib/auth/session";
import { addDays, formatDate, formatDayLong, isDay, todayIstanbul, weekdayIndex } from "@/lib/dates";
import {
  getActivity,
  getPreviousSessions,
  getSetsForDay,
  getWorkoutPlan,
  listExercises,
  recentWorkouts,
} from "@/lib/sport";

export const metadata: Metadata = { title: "Spor · Kayıt" };

export default async function WorkoutLogPage({ searchParams }: PageProps<"/spor/kayit">) {
  const user = await requireUser();
  const today = todayIstanbul();
  const { gun } = await searchParams;
  const day = isDay(gun) && gun <= today ? gun : today;
  const wd = weekdayIndex(day);

  const [plan, exercises, sets, previous, activity, recent] = await Promise.all([
    getWorkoutPlan(user.id),
    listExercises(user.id),
    getSetsForDay(user.id, day),
    getPreviousSessions(user.id, day),
    getActivity(user.id, day, day),
    recentWorkouts(user.id),
  ]);
  const href = (d: string) => (d === today ? "/spor/kayit" : `/spor/kayit?gun=${d}`);
  const kg = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });

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
          <Link href="/spor/kayit" className="btn btn-quiet week-today">
            Bugün
          </Link>
        )}
      </div>

      <WorkoutLog
        key={day}
        day={day}
        title={plan.titles[wd] ?? ""}
        planned={plan.items.filter((i) => i.weekday === wd)}
        exercises={exercises}
        sets={sets}
        previous={previous}
        activity={activity[0] ?? null}
      />

      {recent.length > 0 && (
        <section className="section" aria-labelledby="gecmis-ant">
          <h2 id="gecmis-ant" className="section-title">
            Son antrenmanlar
          </h2>
          <ul className="plain-list card">
            {recent.map((r) => (
              <li key={r.day} className="list-row">
                <Link href={href(r.day)} className="grow">
                  {formatDate(r.day)}
                </Link>
                <span className="muted small num">
                  {r.exercises} hareket · {r.sets} set{r.volume > 0 ? ` · ${kg(r.volume)} kg hacim` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
