import "server-only";
import { sql } from "@/lib/db";
import { MEALS, type Meal, type PlanMeal } from "@/lib/meals";

// Beslenme veri katmanı. Bütün fonksiyonlar userId (profil) alır ve sorguları onunla sınırlar.

/* ---------- haftalık plan ---------- */

async function activePlanId(userId: string, create: boolean): Promise<string | null> {
  const db = sql();
  const [row] = await db`select id from meal_plans where user_id = ${userId} and not is_template`;
  if (row || !create) return row?.id ?? null;
  const [created] = await db`
    insert into meal_plans (user_id) values (${userId})
    on conflict (user_id) where not is_template do update set updated_at = now()
    returning id`;
  return created!.id;
}

function toPlanMeal(r: Record<string, any>): PlanMeal {
  return { weekday: r.weekday, meal: r.meal, items: r.items ?? [], note: r.note };
}

const mealOrder = MEALS as unknown as string[];

export async function getPlan(userId: string): Promise<PlanMeal[]> {
  const rows = await sql()`
    select i.weekday, i.meal, i.items, i.note
    from meal_plan_items i join meal_plans p on p.id = i.plan_id
    where p.user_id = ${userId} and not p.is_template
    order by i.weekday, array_position(${mealOrder}::text[], i.meal)`;
  return rows.map(toPlanMeal);
}

export async function getPlanForWeekday(userId: string, weekday: number): Promise<PlanMeal[]> {
  return (await getPlan(userId)).filter((m) => m.weekday === weekday && (m.items.length || m.note));
}

/** Plandaki bir öğünü kaydeder; içerik boşsa öğünü kaldırır. */
export async function savePlanMeal(userId: string, weekday: number, meal: Meal, items: string[], note: string) {
  const planId = await activePlanId(userId, true);
  const db = sql();
  if (!items.length && !note) {
    await db`delete from meal_plan_items where plan_id = ${planId} and weekday = ${weekday} and meal = ${meal}`;
    return;
  }
  await db`
    insert into meal_plan_items (plan_id, user_id, weekday, meal, items, note)
    values (${planId}, ${userId}, ${weekday}, ${meal}, ${items}, ${note})
    on conflict (plan_id, weekday, meal) do update set items = excluded.items, note = excluded.note`;
  await db`update meal_plans set updated_at = now() where id = ${planId}`;
}

/** Bu öğün planı ne zamandan beri var (günlük yüzde ve seride öncesi sayılmaz) */
export async function planSince(userId: string): Promise<string | null> {
  const [row] = await sql()`
    select to_char((min(i.created_at) at time zone 'Europe/Istanbul')::date, 'YYYY-MM-DD') as since
    from meal_plan_items i join meal_plans p on p.id = i.plan_id
    where p.user_id = ${userId} and not p.is_template`;
  return row?.since ?? null;
}

/** Su hedefi ne zamandan beri sayılır: öğün planının kurulduğu ya da ilk su kaydının yapıldığı gün (hangisi önceyse) */
export async function waterSince(userId: string): Promise<string | null> {
  const [row] = await sql()`
    select to_char(least(
      (select (min(i.created_at) at time zone 'Europe/Istanbul')::date
         from meal_plan_items i join meal_plans p on p.id = i.plan_id
         where p.user_id = ${userId} and not p.is_template),
      (select min(day) from nutrition_days where user_id = ${userId} and water_glasses > 0)
    ), 'YYYY-MM-DD') as since`;
  return row?.since ?? null;
}

/* ---------- şablonlar ---------- */

export type Template = { id: string; name: string; meals: number; updatedAt: string };

export async function listTemplates(userId: string): Promise<Template[]> {
  const rows = await sql()`
    select p.id, p.name, to_char(p.updated_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD') as updated,
           (select count(*) from meal_plan_items i where i.plan_id = p.id)::int as meals
    from meal_plans p where p.user_id = ${userId} and p.is_template
    order by p.updated_at desc`;
  return rows.map((r) => ({ id: r.id, name: r.name, meals: r.meals, updatedAt: r.updated }));
}

export async function saveAsTemplate(userId: string, name: string): Promise<string> {
  const planId = await activePlanId(userId, true);
  const db = sql();
  const [tpl] = await db`insert into meal_plans (user_id, name, is_template) values (${userId}, ${name}, true) returning id`;
  await db`
    insert into meal_plan_items (plan_id, user_id, weekday, meal, items, note)
    select ${tpl!.id}, user_id, weekday, meal, items, note from meal_plan_items where plan_id = ${planId}`;
  return tpl!.id;
}

/** Şablonu etkin plana uygular (etkin planın içeriği şablonla değişir). */
export async function applyTemplate(userId: string, templateId: string): Promise<boolean> {
  const db = sql();
  const [tpl] = await db`select id from meal_plans where id = ${templateId} and user_id = ${userId} and is_template`;
  if (!tpl) return false;
  const planId = await activePlanId(userId, true);
  await db.transaction([
    db`delete from meal_plan_items where plan_id = ${planId}`,
    db`insert into meal_plan_items (plan_id, user_id, weekday, meal, items, note)
       select ${planId}, user_id, weekday, meal, items, note from meal_plan_items where plan_id = ${templateId}`,
    db`update meal_plans set updated_at = now() where id = ${planId}`,
  ]);
  return true;
}

export async function deleteTemplate(userId: string, templateId: string): Promise<boolean> {
  const rows = await sql()`delete from meal_plans where id = ${templateId} and user_id = ${userId} and is_template returning id`;
  return rows.length > 0;
}

/* ---------- notlar (kurallar, içecek planı …) ---------- */

export type NutritionNote = { id: string; title: string; lines: string[] };

export async function listNotes(userId: string): Promise<NutritionNote[]> {
  const rows = await sql()`select id, title, lines from nutrition_notes where user_id = ${userId} order by sort_order, created_at`;
  return rows.map((r) => ({ id: r.id, title: r.title, lines: r.lines ?? [] }));
}

export async function createNote(userId: string, title: string, lines: string[]): Promise<string> {
  const [row] = await sql()`
    insert into nutrition_notes (user_id, title, lines, sort_order)
    values (${userId}, ${title}, ${lines}, (select coalesce(max(sort_order), 0) + 1 from nutrition_notes where user_id = ${userId}))
    returning id`;
  return row!.id;
}

export async function updateNote(userId: string, id: string, title: string, lines: string[]): Promise<boolean> {
  const rows = await sql()`update nutrition_notes set title = ${title}, lines = ${lines} where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

export async function deleteNote(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`delete from nutrition_notes where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

/* ---------- günlük takip ---------- */

export async function getMealChecks(userId: string, from: string, to: string): Promise<string[]> {
  const rows = await sql()`
    select to_char(day, 'YYYY-MM-DD') as day, meal from meal_checks
    where user_id = ${userId} and day between ${from} and ${to}`;
  return rows.map((r) => `${r.day}|${r.meal}`);
}

export async function setMealCheck(userId: string, day: string, meal: Meal, done: boolean) {
  if (done) await sql()`insert into meal_checks (user_id, day, meal) values (${userId}, ${day}, ${meal}) on conflict do nothing`;
  else await sql()`delete from meal_checks where user_id = ${userId} and day = ${day} and meal = ${meal}`;
}

export type NutritionDay = { day: string; water: number; note: string };

export async function getNutritionDays(userId: string, from: string, to: string): Promise<NutritionDay[]> {
  const rows = await sql()`
    select to_char(day, 'YYYY-MM-DD') as day, water_glasses, note from nutrition_days
    where user_id = ${userId} and day between ${from} and ${to} order by day`;
  return rows.map((r) => ({ day: r.day, water: r.water_glasses, note: r.note }));
}

export async function saveNutritionDay(userId: string, day: string, patch: { water?: number; note?: string }) {
  await sql()`
    insert into nutrition_days (user_id, day, water_glasses, note)
    values (${userId}, ${day}, ${patch.water ?? 0}, ${patch.note ?? ""})
    on conflict (user_id, day) do update set
      water_glasses = coalesce(${patch.water ?? null}::int, nutrition_days.water_glasses),
      note = coalesce(${patch.note ?? null}::text, nutrition_days.note),
      updated_at = now()`;
}

export type WaterSettings = { glassMl: number; target: number; targetSport: number };

export async function getWaterSettings(userId: string): Promise<WaterSettings> {
  const [r] = await sql()`select water_glass_ml, water_target, water_target_sport from users where id = ${userId}`;
  return { glassMl: r!.water_glass_ml, target: r!.water_target, targetSport: r!.water_target_sport };
}

export async function saveWaterSettings(userId: string, s: WaterSettings) {
  await sql()`update users set water_glass_ml = ${s.glassMl}, water_target = ${s.target},
              water_target_sport = ${s.targetSport}, updated_at = now() where id = ${userId}`;
}

/* ---------- kilo ve ölçüler ---------- */

export const BODY_FIELDS = ["weight", "waist", "hip", "chest", "arm", "thigh"] as const;
export type BodyField = (typeof BODY_FIELDS)[number];
export type BodyEntry = { day: string; note: string } & Record<BodyField, number | null>;

export async function getBodyMetrics(userId: string): Promise<BodyEntry[]> {
  const rows = await sql()`
    select to_char(day, 'YYYY-MM-DD') as day, weight, waist, hip, chest, arm, thigh, note
    from body_metrics where user_id = ${userId} order by day`;
  return rows.map((r) => ({
    day: r.day,
    note: r.note,
    ...(Object.fromEntries(BODY_FIELDS.map((f) => [f, r[f] === null ? null : Number(r[f])])) as Record<BodyField, number | null>),
  }));
}

export async function saveBodyMetrics(userId: string, day: string, v: Record<BodyField, number | null>, note: string) {
  await sql()`
    insert into body_metrics (user_id, day, weight, waist, hip, chest, arm, thigh, note)
    values (${userId}, ${day}, ${v.weight}, ${v.waist}, ${v.hip}, ${v.chest}, ${v.arm}, ${v.thigh}, ${note})
    on conflict (user_id, day) do update set weight = excluded.weight, waist = excluded.waist, hip = excluded.hip,
      chest = excluded.chest, arm = excluded.arm, thigh = excluded.thigh, note = excluded.note, updated_at = now()`;
}

export async function deleteBodyMetrics(userId: string, day: string): Promise<boolean> {
  const rows = await sql()`delete from body_metrics where user_id = ${userId} and day = ${day} returning id`;
  return rows.length > 0;
}

/* ---------- alışveriş ---------- */

export type ShoppingState = { checked: string[]; manual: { id: string; label: string; checked: boolean }[] };

export async function getShopping(userId: string, weekStart: string): Promise<ShoppingState> {
  const rows = await sql()`
    select id, key, label, manual, checked from shopping_items
    where user_id = ${userId} and week_start = ${weekStart} order by created_at`;
  return {
    checked: rows.filter((r) => !r.manual && r.checked).map((r) => r.key),
    manual: rows.filter((r) => r.manual).map((r) => ({ id: r.id, label: r.label, checked: r.checked })),
  };
}

export async function setShoppingChecked(userId: string, weekStart: string, key: string, checked: boolean) {
  await sql()`
    insert into shopping_items (user_id, week_start, key, checked) values (${userId}, ${weekStart}, ${key}, ${checked})
    on conflict (user_id, week_start, key) do update set checked = excluded.checked`;
}

export async function addShoppingItem(userId: string, weekStart: string, label: string): Promise<string> {
  const [row] = await sql()`
    insert into shopping_items (user_id, week_start, key, label, manual)
    values (${userId}, ${weekStart}, ${`elle:${crypto.randomUUID()}`}, ${label}, true) returning id`;
  return row!.id;
}

export async function updateShoppingItem(userId: string, id: string, checked: boolean): Promise<boolean> {
  const rows = await sql()`update shopping_items set checked = ${checked} where id = ${id} and user_id = ${userId} and manual returning id`;
  return rows.length > 0;
}

export async function deleteShoppingItem(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`delete from shopping_items where id = ${id} and user_id = ${userId} and manual returning id`;
  return rows.length > 0;
}
