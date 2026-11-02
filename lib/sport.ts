import "server-only";
import { sql } from "@/lib/db";

// Spor veri katmanı. Bütün fonksiyonlar userId (profil) alır ve sorguları onunla sınırlar.

/* ---------- hareket kütüphanesi ---------- */

export type Exercise = { id: string; name: string; region: string; howTo: string };

export async function listExercises(userId: string): Promise<Exercise[]> {
  const rows = await sql()`
    select id, name, region, how_to from exercises
    where user_id = ${userId} and not archived order by region, name`;
  return rows.map((r) => ({ id: r.id, name: r.name, region: r.region, howTo: r.how_to }));
}

export async function createExercise(userId: string, e: Omit<Exercise, "id">): Promise<string> {
  const [row] = await sql()`
    insert into exercises (user_id, name, region, how_to) values (${userId}, ${e.name}, ${e.region}, ${e.howTo}) returning id`;
  return row!.id;
}

export async function updateExercise(userId: string, id: string, e: Omit<Exercise, "id">): Promise<boolean> {
  const rows = await sql()`
    update exercises set name = ${e.name}, region = ${e.region}, how_to = ${e.howTo}, updated_at = now()
    where id = ${id} and user_id = ${userId} and not archived returning id`;
  return rows.length > 0;
}

/** Hareket kütüphaneden kaldırılır; geçmiş kayıtlar silinmesin diye arşivlenir, plandan çıkarılır. */
export async function archiveExercise(userId: string, id: string): Promise<boolean> {
  const db = sql();
  const rows = await db`update exercises set archived = true where id = ${id} and user_id = ${userId} returning id`;
  if (!rows.length) return false;
  await db`delete from workout_plan_items where exercise_id = ${id} and user_id = ${userId}`;
  return true;
}

export async function ownsExercise(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`select 1 from exercises where id = ${id} and user_id = ${userId} and not archived`;
  return rows.length > 0;
}

/* ---------- haftalık plan ---------- */

export type PlanItem = {
  id: string;
  weekday: number;
  exerciseId: string;
  exerciseName: string;
  region: string;
  sets: number;
  reps: string;
  weightKg: number | null;
  restSeconds: number;
  note: string;
};

export type WorkoutPlan = { titles: Record<number, string>; items: PlanItem[] };

export async function getWorkoutPlan(userId: string): Promise<WorkoutPlan> {
  const db = sql();
  const [days, rows] = await Promise.all([
    db`select weekday, title from workout_days where user_id = ${userId}`,
    db`select w.id, w.weekday, w.exercise_id, e.name, e.region, w.sets, w.reps, w.weight_kg, w.rest_seconds, w.note
       from workout_plan_items w join exercises e on e.id = w.exercise_id
       where w.user_id = ${userId} and not e.archived
       order by w.weekday, w.sort_order, w.created_at`,
  ]);
  return {
    titles: Object.fromEntries(days.map((d) => [d.weekday, d.title])),
    items: rows.map((r) => ({
      id: r.id,
      weekday: r.weekday,
      exerciseId: r.exercise_id,
      exerciseName: r.name,
      region: r.region,
      sets: r.sets,
      reps: r.reps,
      weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
      restSeconds: r.rest_seconds,
      note: r.note,
    })),
  };
}

export async function saveDayTitle(userId: string, weekday: number, title: string) {
  await sql()`
    insert into workout_days (user_id, weekday, title) values (${userId}, ${weekday}, ${title})
    on conflict (user_id, weekday) do update set title = excluded.title`;
}

export type PlanItemInput = { sets: number; reps: string; weightKg: number | null; restSeconds: number; note: string };

export async function addPlanItem(userId: string, weekday: number, exerciseId: string, v: PlanItemInput): Promise<string> {
  const [row] = await sql()`
    insert into workout_plan_items (user_id, weekday, exercise_id, sets, reps, weight_kg, rest_seconds, note, sort_order)
    values (${userId}, ${weekday}, ${exerciseId}, ${v.sets}, ${v.reps}, ${v.weightKg}, ${v.restSeconds}, ${v.note},
            (select coalesce(max(sort_order), 0) + 1 from workout_plan_items where user_id = ${userId} and weekday = ${weekday}))
    returning id`;
  return row!.id;
}

export async function updatePlanItem(userId: string, id: string, v: PlanItemInput): Promise<boolean> {
  const rows = await sql()`
    update workout_plan_items set sets = ${v.sets}, reps = ${v.reps}, weight_kg = ${v.weightKg},
      rest_seconds = ${v.restSeconds}, note = ${v.note}
    where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

export async function deletePlanItem(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`delete from workout_plan_items where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

/** Plandaki hareketi aynı gün içinde bir yukarı / aşağı taşır. */
export async function movePlanItem(userId: string, id: string, direction: -1 | 1): Promise<boolean> {
  const db = sql();
  const [item] = await db`select weekday from workout_plan_items where id = ${id} and user_id = ${userId}`;
  if (!item) return false;
  const rows = await db`
    select id from workout_plan_items where user_id = ${userId} and weekday = ${item.weekday}
    order by sort_order, created_at`;
  const ids = rows.map((r) => r.id as string);
  const i = ids.indexOf(id);
  const j = i + direction;
  if (j < 0 || j >= ids.length) return true;
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  await db.transaction(ids.map((rowId, index) => db`update workout_plan_items set sort_order = ${index + 1} where id = ${rowId}`));
  return true;
}

export async function workoutSince(userId: string): Promise<string | null> {
  const [row] = await sql()`
    select to_char((min(created_at) at time zone 'Europe/Istanbul')::date, 'YYYY-MM-DD') as since
    from workout_plan_items where user_id = ${userId}`;
  return row?.since ?? null;
}

/* ---------- antrenman kaydı ---------- */

export type SetEntry = { reps: number | null; weightKg: number | null };
export type Session = { day: string; sets: SetEntry[] };

/** Bir günün setleri (hareket kimliğine göre) */
export async function getSetsForDay(userId: string, day: string): Promise<Record<string, SetEntry[]>> {
  const rows = await sql()`
    select exercise_id, reps, weight_kg from workout_sets
    where user_id = ${userId} and day = ${day} order by exercise_id, set_no`;
  const out: Record<string, SetEntry[]> = {};
  for (const r of rows) {
    (out[r.exercise_id] ??= []).push({ reps: r.reps, weightKg: r.weight_kg === null ? null : Number(r.weight_kg) });
  }
  return out;
}

/** Her hareket için bu günden önceki son antrenman (karşılaştırma için) */
export async function getPreviousSessions(userId: string, day: string): Promise<Record<string, Session>> {
  const rows = await sql()`
    with last as (
      select exercise_id, max(day) as day from workout_sets
      where user_id = ${userId} and day < ${day} group by exercise_id
    )
    select s.exercise_id, to_char(s.day, 'YYYY-MM-DD') as day, s.reps, s.weight_kg
    from workout_sets s join last l on l.exercise_id = s.exercise_id and l.day = s.day
    where s.user_id = ${userId}
    order by s.exercise_id, s.set_no`;
  const out: Record<string, Session> = {};
  for (const r of rows) {
    const session = (out[r.exercise_id] ??= { day: r.day, sets: [] });
    session.sets.push({ reps: r.reps, weightKg: r.weight_kg === null ? null : Number(r.weight_kg) });
  }
  return out;
}

/** Bir hareketin o günkü setlerini verilen listeyle değiştirir. */
export async function saveSets(userId: string, day: string, exerciseId: string, sets: SetEntry[]) {
  const db = sql();
  await db.transaction([
    db`delete from workout_sets where user_id = ${userId} and day = ${day} and exercise_id = ${exerciseId}`,
    ...sets.map(
      (s, i) => db`insert into workout_sets (user_id, day, exercise_id, set_no, reps, weight_kg)
                   values (${userId}, ${day}, ${exerciseId}, ${i + 1}, ${s.reps}, ${s.weightKg})`,
    ),
  ]);
}

/** Son antrenman günleri (geçmiş listesi) */
export async function recentWorkouts(userId: string, limit = 10) {
  const rows = await sql()`
    select to_char(s.day, 'YYYY-MM-DD') as day, count(distinct s.exercise_id)::int as exercises, count(*)::int as sets,
           coalesce(sum(coalesce(s.reps, 0) * coalesce(s.weight_kg, 0)), 0)::float as volume
    from workout_sets s where s.user_id = ${userId}
    group by s.day order by s.day desc limit ${limit}`;
  return rows.map((r) => ({ day: r.day as string, exercises: r.exercises as number, sets: r.sets as number, volume: r.volume as number }));
}

/* ---------- günlük aktivite ---------- */

export type ActivityDay = { day: string; steps: number | null; cardioMinutes: number | null; workoutDone: boolean; note: string };

export async function getActivity(userId: string, from: string, to: string): Promise<ActivityDay[]> {
  const rows = await sql()`
    select to_char(day, 'YYYY-MM-DD') as day, steps, cardio_minutes, workout_done, note from activity_days
    where user_id = ${userId} and day between ${from} and ${to} order by day`;
  return rows.map((r) => ({ day: r.day, steps: r.steps, cardioMinutes: r.cardio_minutes, workoutDone: r.workout_done, note: r.note }));
}

export async function saveActivity(
  userId: string,
  day: string,
  patch: { steps?: number | null; cardioMinutes?: number | null; workoutDone?: boolean; note?: string },
) {
  const has = (k: keyof typeof patch) => k in patch;
  await sql()`
    insert into activity_days (user_id, day, steps, cardio_minutes, workout_done, note)
    values (${userId}, ${day}, ${patch.steps ?? null}, ${patch.cardioMinutes ?? null}, ${patch.workoutDone ?? false}, ${patch.note ?? ""})
    on conflict (user_id, day) do update set
      steps = case when ${has("steps")}::boolean then excluded.steps else activity_days.steps end,
      cardio_minutes = case when ${has("cardioMinutes")}::boolean then excluded.cardio_minutes else activity_days.cardio_minutes end,
      workout_done = case when ${has("workoutDone")}::boolean then excluded.workout_done else activity_days.workout_done end,
      note = case when ${has("note")}::boolean then excluded.note else activity_days.note end,
      updated_at = now()`;
}
