import "server-only";
import { sql } from "./db";

// Günlük görev panosu (şatoda) ve dünyadaki yansımalar: bugünkü rutin hedefleri ve ne kadarının tamamlandığı.
export type Quest = { id: "su" | "spor" | "cilt" | "yuz" | "ogun" | "calisma"; label: string; emoji: string; value: number; target: number; href: string | null };
export type QuestDay = { quests: Quest[]; gifts: number };

export async function questsToday(userId: string, today: string): Promise<QuestDay> {
  const [r] = await sql()`
    select
      (select coalesce(max(water_glasses), 0) from nutrition_days where user_id = ${userId} and day = ${today})::int as water,
      (select water_target from users where id = ${userId})::int as water_target,
      (select count(*) from sport_sessions where user_id = ${userId} and day = ${today})::int as sport,
      (select count(*) from routine_items where user_id = ${userId} and active and slot in ('sabah', 'aksam'))::int as skin_target,
      (select count(*) from checks c join routine_items i on i.id = c.item_id where c.user_id = ${userId} and c.day = ${today} and i.slot in ('sabah', 'aksam'))::int as skin,
      (select count(*) from face_yoga_sessions where user_id = ${userId} and day = ${today})::int as yoga,
      (select count(*) from meal_checks where user_id = ${userId} and day = ${today})::int as meals,
      (select coalesce(sum(minutes), 0) from study_sessions where user_id = ${userId} and day = ${today})::int as study,
      -- kazanılmış ama henüz gerçekte alınmamış dilekler (ortak olanlar ikinize de)
      (select count(*) from wishes w where w.status = 'kazanildi'
        and (w.user_id = ${userId} or (w.shared and w.user_id in (select id from users where account_id = (select account_id from users where id = ${userId})))))::int as gifts`;
  const quests: Quest[] = [
    { id: "su", label: "Su iç", emoji: "💧", value: r.water, target: r.water_target || 8, href: "/beslenme" },
    { id: "spor", label: "Spor yap", emoji: "🏋️", value: r.sport, target: 1, href: "/spor" },
    { id: "cilt", label: "Cilt rutini", emoji: "✨", value: r.skin, target: Math.max(1, r.skin_target), href: "/cilt" },
    { id: "yuz", label: "Yüz yogası", emoji: "🧘", value: r.yoga, target: 1, href: "/cilt" },
    { id: "ogun", label: "Öğünleri işaretle", emoji: "🍽️", value: r.meals, target: 3, href: "/beslenme" },
    { id: "calisma", label: "30 dk çalış", emoji: "📚", value: r.study, target: 30, href: null },
  ];
  return { quests, gifts: r.gifts };
}
