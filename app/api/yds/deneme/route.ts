import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { parseExam } from "@/lib/yds-input";
import { addExam } from "@/lib/yds-server";

// Deneme ekle: bölüm bölüm doğru ve soru sayısı, süre
export const POST = withUser(async (req, user) => {
  const e = parseExam(await readJson(req), todayIstanbul());
  if (typeof e === "string") return jsonError(400, e);
  return jsonOk({ id: await addExam(user.id, e) }, { status: 201 });
});
