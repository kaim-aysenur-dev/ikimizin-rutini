import type { Metadata } from "next";
import { ExerciseLibrary } from "@/components/sport/exercise-library";
import { requireUser } from "@/lib/auth/session";
import { listExercises } from "@/lib/sport";

export const metadata: Metadata = { title: "Spor · Hareketler" };

export default async function ExercisesPage() {
  const user = await requireUser();
  return <ExerciseLibrary exercises={await listExercises(user.id)} />;
}
