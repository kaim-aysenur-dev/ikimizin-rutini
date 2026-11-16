import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { parsePractice } from "@/lib/yds-input";
import { logPractice } from "@/lib/yds-server";

// Bugün çözülen soruları kaydet (kitaptan, testten): bölüm, çözülen, doğru
export const POST = withUser(async (req, user) => {
  const p = parsePractice(await readJson(req));
  if (typeof p === "string") return jsonError(400, p);
  return jsonOk({ id: await logPractice(user.id, todayIstanbul(), p.section, p.solved, p.correct) }, { status: 201 });
});
