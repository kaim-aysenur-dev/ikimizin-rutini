import "server-only";
import { sql } from "@/lib/db";
import { addDays, weekStart } from "@/lib/dates";
import type { ActivityColor, ActivityType, Intensity, SessionItem, SportGoal, Video, WeekProgress } from "@/lib/sport-shared";

// Spor: aktivite türleri, haftalık hedef, video kütüphanesi ve oturumlar.
// Bütün fonksiyonlar userId (profil) alır ve sorguları onunla sınırlar.

/* ---------- aktivite türleri ---------- */

export async function listTypes(userId: string): Promise<ActivityType[]> {
  const rows = await sql()`
    select id, name, color, tracks_rounds, logs_sets from activity_types
    where user_id = ${userId} and not archived order by sort_order, created_at`;
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color, tracksRounds: r.tracks_rounds, logsSets: r.logs_sets }));
}

export type TypeInput = { name: string; color: ActivityColor; tracksRounds: boolean; logsSets: boolean };

export async function createType(userId: string, t: TypeInput): Promise<string> {
  const [row] = await sql()`
    insert into activity_types (user_id, name, color, tracks_rounds, logs_sets, sort_order)
    values (${userId}, ${t.name}, ${t.color}, ${t.tracksRounds}, ${t.logsSets},
            (select coalesce(max(sort_order), 0) + 1 from activity_types where user_id = ${userId}))
    returning id`;
  return row!.id;
}

export async function updateType(userId: string, id: string, t: TypeInput): Promise<boolean> {
  const rows = await sql()`
    update activity_types set name = ${t.name}, color = ${t.color}, tracks_rounds = ${t.tracksRounds}, logs_sets = ${t.logsSets}
    where id = ${id} and user_id = ${userId} and not archived returning id`;
  return rows.length > 0;
}

/** Tür listeden kalkar; geçmiş oturumlar ve videolar türüyle birlikte kalır. */
export async function archiveType(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`update activity_types set archived = true where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

export async function ownsType(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`select 1 from activity_types where id = ${id} and user_id = ${userId} and not archived`;
  return rows.length > 0;
}

/* ---------- haftalık hedef ---------- */

export async function getGoal(userId: string): Promise<SportGoal | null> {
  // alt hedefteki tür sonradan kaldırıldıysa alt hedef yok sayılır
  const [row] = await sql()`
    select g.days_per_week, t.id as min_type_id, g.min_type_days from sport_goals g
    left join activity_types t on t.id = g.min_type_id and not t.archived
    where g.user_id = ${userId}`;
  if (!row) return null;
  return {
    daysPerWeek: row.days_per_week,
    minTypeId: row.min_type_id,
    minTypeDays: row.min_type_id ? row.min_type_days : null,
  };
}

export async function saveGoal(userId: string, g: SportGoal) {
  await sql()`
    insert into sport_goals (user_id, days_per_week, min_type_id, min_type_days)
    values (${userId}, ${g.daysPerWeek}, ${g.minTypeId}, ${g.minTypeDays})
    on conflict (user_id) do update set
      days_per_week = excluded.days_per_week, min_type_id = excluded.min_type_id,
      min_type_days = excluded.min_type_days, updated_at = now()`;
}

/* ---------- videolar ---------- */

export async function listVideos(userId: string): Promise<Video[]> {
  const rows = await sql()`
    select v.id, v.youtube_id, v.title, v.channel, v.type_id, v.minutes, v.level,
           count(s.id)::int as times, to_char(max(s.day), 'YYYY-MM-DD') as last_day
    from sport_videos v left join sport_sessions s on s.video_id = v.id and s.user_id = ${userId}
    where v.user_id = ${userId} and not v.archived
    group by v.id order by v.created_at desc`;
  return rows.map((r) => ({
    id: r.id,
    youtubeId: r.youtube_id,
    title: r.title,
    channel: r.channel,
    typeId: r.type_id,
    minutes: r.minutes,
    level: r.level,
    times: r.times,
    lastDay: r.last_day,
  }));
}

export type VideoInput = { title: string; channel: string; typeId: string | null; minutes: number | null; level: Intensity | null };

/** Aynı video zaten listedeyse null döner. */
export async function createVideo(userId: string, youtubeId: string, v: VideoInput): Promise<string | null> {
  const rows = await sql()`
    insert into sport_videos (user_id, youtube_id, title, channel, type_id, minutes, level)
    values (${userId}, ${youtubeId}, ${v.title}, ${v.channel}, ${v.typeId}, ${v.minutes}, ${v.level})
    on conflict (user_id, youtube_id) where not archived do nothing
    returning id`;
  return rows[0]?.id ?? null;
}

export async function updateVideo(userId: string, id: string, v: VideoInput): Promise<boolean> {
  const rows = await sql()`
    update sport_videos set title = ${v.title}, channel = ${v.channel}, type_id = ${v.typeId}, minutes = ${v.minutes}, level = ${v.level}
    where id = ${id} and user_id = ${userId} and not archived returning id`;
  return rows.length > 0;
}

/** Video listeden kalkar; o videoyla yapılan oturumlar kalır. */
export async function archiveVideo(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`update sport_videos set archived = true where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

export async function ownsVideo(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`select 1 from sport_videos where id = ${id} and user_id = ${userId} and not archived`;
  return rows.length > 0;
}

/* ---------- oturumlar ---------- */

export type SessionInput = {
  day: string;
  typeId: string | null;
  videoId: string | null;
  minutes: number | null;
  rounds: number | null;
  intensity: Intensity | null;
  note: string;
};

export async function createSession(userId: string, s: SessionInput): Promise<string> {
  const [row] = await sql()`
    insert into sport_sessions (user_id, day, type_id, video_id, minutes, rounds, intensity, note)
    values (${userId}, ${s.day}, ${s.typeId}, ${s.videoId}, ${s.minutes}, ${s.rounds}, ${s.intensity}, ${s.note})
    returning id`;
  return row!.id;
}

export async function deleteSession(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`delete from sport_sessions where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

export async function recentSessions(userId: string, limit = 10): Promise<SessionItem[]> {
  const rows = await sql()`
    select s.id, to_char(s.day, 'YYYY-MM-DD') as day, s.minutes, s.rounds, s.intensity, s.note,
           t.name as type_name, t.color, v.title as video_title
    from sport_sessions s
    left join activity_types t on t.id = s.type_id
    left join sport_videos v on v.id = s.video_id
    where s.user_id = ${userId}
    order by s.day desc, s.created_at desc limit ${limit}`;
  return rows.map((r) => ({
    id: r.id,
    day: r.day,
    minutes: r.minutes,
    rounds: r.rounds,
    intensity: r.intensity,
    note: r.note,
    typeName: r.type_name,
    color: r.color ?? "ok",
    videoTitle: r.video_title,
  }));
}

/** Türe göre son oturumun süresi ve turu (formu önceden doldurmak için) */
export async function lastByType(userId: string): Promise<Record<string, { minutes: number | null; rounds: number | null }>> {
  const rows = await sql()`
    select distinct on (type_id) type_id, minutes, rounds from sport_sessions
    where user_id = ${userId} and type_id is not null
    order by type_id, day desc, created_at desc`;
  return Object.fromEntries(rows.map((r) => [r.type_id, { minutes: r.minutes, rounds: r.rounds }]));
}

/* ---------- haftalık ilerleme ---------- */

/**
 * Spor yapılan günler: oturum kaydı, "antrenman tamamlandı" işareti ya da girilmiş set.
 * Her gün için o günkü ilk oturumun rengi (eski kayıtlar için "ok").
 */
async function activeDays(userId: string, from: string, to: string) {
  const rows = await sql()`
    with d as (
      select s.day, s.type_id, t.color, s.created_at from sport_sessions s
      left join activity_types t on t.id = s.type_id
      where s.user_id = ${userId} and s.day between ${from} and ${to}
      union all
      select day, null::uuid, null::text, 'infinity'::timestamptz from activity_days
      where user_id = ${userId} and workout_done and day between ${from} and ${to}
      union all
      select distinct day, null::uuid, null::text, 'infinity'::timestamptz from workout_sets
      where user_id = ${userId} and day between ${from} and ${to}
    )
    select to_char(day, 'YYYY-MM-DD') as day, type_id, color from d order by day, created_at`;
  const days = new Map<string, { color: ActivityColor; types: Set<string> }>();
  for (const r of rows) {
    const entry = days.get(r.day) ?? { color: (r.color ?? "ok") as ActivityColor, types: new Set<string>() };
    if (r.type_id) entry.types.add(r.type_id);
    days.set(r.day, entry);
  }
  return days;
}

export async function getWeekProgress(userId: string, today: string, goal: SportGoal | null): Promise<WeekProgress> {
  const monday = weekStart(today);
  // seri için geriye 26 hafta
  const from = addDays(monday, -26 * 7);
  const days = await activeDays(userId, from, addDays(monday, 6));

  const countWeek = (start: string) => {
    let total = 0;
    let typed = 0;
    for (let i = 0; i < 7; i++) {
      const d = days.get(addDays(start, i));
      if (!d) continue;
      total++;
      if (goal?.minTypeId && d.types.has(goal.minTypeId)) typed++;
    }
    return { total, typed };
  };
  const met = (c: { total: number; typed: number }) =>
    !!goal && c.total >= goal.daysPerWeek && (!goal.minTypeId || !goal.minTypeDays || c.typed >= goal.minTypeDays);

  const current = countWeek(monday);
  // bu hafta tamamlanmadıysa seriyi bozmaz; geçen haftadan geriye sayılır
  let streak = met(current) ? 1 : 0;
  for (let w = 1; w <= 26; w++) {
    if (!met(countWeek(addDays(monday, -7 * w)))) break;
    streak++;
  }

  return {
    days: Array.from({ length: 7 }, (_, i) => {
      const day = addDays(monday, i);
      return { day, color: days.get(day)?.color ?? null };
    }),
    done: current.total,
    typedDone: current.typed,
    weeksStreak: goal ? streak : 0,
  };
}
