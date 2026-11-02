import type { Metadata } from "next";
import { MealPlanEditor } from "@/components/nutrition/meal-plan";
import { NotesEditor } from "@/components/nutrition/notes-editor";
import { TemplatesCard, WaterSettingsCard } from "@/components/nutrition/plan-tools";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul, weekdayIndex } from "@/lib/dates";
import { getPlan, getWaterSettings, listNotes, listTemplates } from "@/lib/nutrition";

export const metadata: Metadata = { title: "Beslenme · Plan" };

export default async function NutritionPlanPage() {
  const user = await requireUser();
  const [plan, notes, templates, water] = await Promise.all([
    getPlan(user.id),
    listNotes(user.id),
    listTemplates(user.id),
    getWaterSettings(user.id),
  ]);

  return (
    <div className="stack section-stack">
      <MealPlanEditor plan={plan} todayWeekday={weekdayIndex(todayIstanbul())} />
      <NotesEditor notes={notes} />
      <div className="two-col">
        <WaterSettingsCard settings={water} />
        <TemplatesCard templates={templates} />
      </div>
    </div>
  );
}
