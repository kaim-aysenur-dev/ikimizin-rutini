import type { Metadata } from "next";
import { GoalSettings } from "@/components/sport/goal-settings";
import { requireUser } from "@/lib/auth/session";
import { getGoal, listTypes } from "@/lib/sport-activities";

export const metadata: Metadata = { title: "Spor · Hedef" };

export default async function SportGoalPage() {
  const user = await requireUser();
  const [goal, types] = await Promise.all([getGoal(user.id), listTypes(user.id)]);
  return <GoalSettings goal={goal} types={types} />;
}
