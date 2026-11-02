import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { addPlanItem, ownsExercise, saveDayTitle } from "@/lib/sport";
import { parsePlanItem } from "@/lib/sport-input";
import { text, weekday } from "@/lib/validate";

// Güne hareket ekle
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const wd = weekday(body?.weekday);
  const exerciseId = body?.exerciseId;
  if (wd === null || typeof exerciseId !== "string" || !UUID_RE.test(exerciseId)) return jsonError(400, "Geçersiz istek.");
  if (!(await ownsExercise(user.id, exerciseId))) return jsonError(404, "Hareket bulunamadı.");
  const input = parsePlanItem(body);
  if (typeof input === "string") return jsonError(400, input);
  return jsonOk({ id: await addPlanItem(user.id, wd, exerciseId, input) }, { status: 201 });
});

// Günün başlığı (ör. "Üst vücut")
export const PUT = withUser(async (req, user) => {
  const body = await readJson(req);
  const wd = weekday(body?.weekday);
  if (wd === null) return jsonError(400, "Geçersiz gün.");
  await saveDayTitle(user.id, wd, text(body?.title, 60));
  return jsonOk({ ok: true });
});
