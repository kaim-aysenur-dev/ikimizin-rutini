import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { parseGrade } from "@/lib/yds-input";
import { gradeCard, sessionOf } from "@/lib/yds-server";

// Kelime oturumu: vadesi gelen tekrarlar ve günün yeni kelimeleri; kart notlama
export const GET = withUser(async (_req, user) => jsonOk({ cards: await sessionOf(user.id, todayIstanbul()) }));

export const POST = withUser(async (req, user) => {
  const g = parseGrade(await readJson(req));
  if (typeof g === "string") return jsonError(400, g);
  if (!(await gradeCard(user.id, todayIstanbul(), g.key, g.grade))) return jsonError(404, "Kart bulunamadı.");
  return jsonOk({ ok: true });
});
