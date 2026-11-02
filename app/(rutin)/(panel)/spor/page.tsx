import type { Metadata } from "next";
import { WeekOverview } from "@/components/sport/week-overview";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { getGoal, getWeekProgress, lastByType, listTypes, recentSessions } from "@/lib/sport-activities";

export const metadata: Metadata = { title: "Spor · Bu hafta" };

export default async function SportWeekPage() {
  const user = await requireUser();
  const today = todayIstanbul();
  const [goal, types, sessions, last] = await Promise.all([
    getGoal(user.id),
    listTypes(user.id),
    recentSessions(user.id),
    lastByType(user.id),
  ]);
  const progress = await getWeekProgress(user.id, today, goal);

  return <WeekOverview key={today} today={today} goal={goal} types={types} progress={progress} sessions={sessions} last={last} />;
}
