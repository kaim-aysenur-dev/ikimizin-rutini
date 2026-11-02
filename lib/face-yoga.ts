import "server-only";
import { sql } from "@/lib/db";
import { addDays, weekDays, weekStart } from "@/lib/dates";
import type { FaceYogaOverview } from "@/lib/face-yoga-shared";

/** 006_face_yoga.sql henüz uygulanmadıysa tablo yoktur */
export function isMissingTable(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "42P01";
}

/** Tablo yoksa null döner; sayfa takip olmadan çalışmaya devam eder. */
export async function getFaceYogaOverview(userId: string, today: string): Promise<FaceYogaOverview | null> {
  let perDay: Record<string, unknown>[];
  let recent: Record<string, unknown>[];
  try {
    [perDay, recent] = await Promise.all([
      sql()`
        select to_char(day, 'YYYY-MM-DD') as day, sum(seconds)::int as seconds from face_yoga_sessions
        where user_id = ${userId} and day > ${addDays(today, -400)} and day <= ${today}
        group by day`,
      sql()`
        select id, to_char(day, 'YYYY-MM-DD') as day, routine, seconds from face_yoga_sessions
        where user_id = ${userId} order by day desc, created_at desc limit 8`,
    ]);
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }

  const byDay = new Map(perDay.map((r) => [r.day as string, r.seconds as number]));
  let cursor = byDay.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (byDay.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  return {
    week: weekDays(weekStart(today)).map((day) => ({ day, seconds: byDay.get(day) ?? 0 })),
    streak,
    recent: recent.map((r) => ({
      id: r.id as string,
      day: r.day as string,
      routine: r.routine as string,
      seconds: r.seconds as number,
    })),
  };
}

export async function createFaceYogaSession(userId: string, day: string, routine: string, seconds: number): Promise<string> {
  const [row] = await sql()`
    insert into face_yoga_sessions (user_id, day, routine, seconds)
    values (${userId}, ${day}, ${routine}, ${seconds}) returning id`;
  return row!.id;
}

export async function deleteFaceYogaSession(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`delete from face_yoga_sessions where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}
