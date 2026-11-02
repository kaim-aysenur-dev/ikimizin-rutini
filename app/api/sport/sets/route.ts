import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { ownsExercise, saveSets, type SetEntry } from "@/lib/sport";
import { optionalNumber, pastDay } from "@/lib/validate";

// Bir hareketin o günkü setlerini kaydeder (liste olduğu gibi yazılır)
export const PUT = withUser(async (req, user) => {
  const body = await readJson(req);
  const day = pastDay(body?.day);
  const exerciseId = body?.exerciseId;
  if (!day || typeof exerciseId !== "string" || !UUID_RE.test(exerciseId) || !Array.isArray(body?.sets)) {
    return jsonError(400, "Geçersiz istek.");
  }
  if (body.sets.length > 30) return jsonError(400, "En fazla 30 set.");
  const sets: SetEntry[] = [];
  for (const s of body.sets as Record<string, unknown>[]) {
    const reps = optionalNumber(s?.reps, 0, 1000);
    const weightKg = optionalNumber(s?.weightKg, 0, 1000);
    if (reps === undefined || weightKg === undefined) return jsonError(400, "Tekrar ya da ağırlık geçersiz.");
    if (reps === null && weightKg === null) continue;
    sets.push({ reps: reps === null ? null : Math.round(reps), weightKg });
  }
  if (!(await ownsExercise(user.id, exerciseId))) return jsonError(404, "Hareket bulunamadı.");
  await saveSets(user.id, day, exerciseId, sets);
  return jsonOk({ ok: true });
});
