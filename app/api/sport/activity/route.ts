import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { saveActivity } from "@/lib/sport";
import { optionalNumber, pastDay, text } from "@/lib/validate";

// Günlük adım, kardiyo süresi, "antrenman tamamlandı" ve not
export const PUT = withUser(async (req, user) => {
  const body = await readJson(req);
  const day = pastDay(body?.day);
  if (!day || !body) return jsonError(400, "Geçersiz tarih.");
  const patch: Parameters<typeof saveActivity>[2] = {};
  if ("steps" in body) {
    const v = optionalNumber(body.steps, 0, 200000);
    if (v === undefined) return jsonError(400, "Adım sayısı geçersiz.");
    patch.steps = v === null ? null : Math.round(v);
  }
  if ("cardioMinutes" in body) {
    const v = optionalNumber(body.cardioMinutes, 0, 1440);
    if (v === undefined) return jsonError(400, "Kardiyo süresi geçersiz.");
    patch.cardioMinutes = v === null ? null : Math.round(v);
  }
  if ("workoutDone" in body) {
    if (typeof body.workoutDone !== "boolean") return jsonError(400, "Geçersiz istek.");
    patch.workoutDone = body.workoutDone;
  }
  if ("note" in body) patch.note = text(body.note, 500);
  await saveActivity(user.id, day, patch);
  return jsonOk({ ok: true });
});
