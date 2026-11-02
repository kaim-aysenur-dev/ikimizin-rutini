import "server-only";
import { sql } from "./db";
import { XP } from "./xp";

// Kişinin toplam XP'si: bütün geçmiş kayıtlarından
export async function totalXp(userId: string): Promise<number> {
  const [r] = await sql()`
    select
      (select count(*) from checks where user_id = ${userId})::int as checks,
      (select count(*) from meal_checks where user_id = ${userId})::int as meals,
      (select count(*) from face_yoga_sessions where user_id = ${userId})::int as yoga,
      (select count(*) from sport_sessions where user_id = ${userId})::int as sport`;
  return r.checks * XP.check + r.meals * XP.meal + r.yoga * XP.faceYoga + r.sport * XP.sport;
}
