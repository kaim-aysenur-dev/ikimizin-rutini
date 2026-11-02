import type { Metadata } from "next";
import { WorkoutPlanEditor } from "@/components/sport/workout-plan";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul, weekdayIndex } from "@/lib/dates";
import { getWorkoutPlan, listExercises } from "@/lib/sport";

export const metadata: Metadata = { title: "Spor · Plan" };

export default async function SportPlanPage() {
  const user = await requireUser();
  const [plan, exercises] = await Promise.all([getWorkoutPlan(user.id), listExercises(user.id)]);
  return <WorkoutPlanEditor plan={plan} exercises={exercises} todayWeekday={weekdayIndex(todayIstanbul())} />;
}
