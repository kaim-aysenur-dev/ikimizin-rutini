import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { ownsType, saveGoal } from "@/lib/sport-activities";
import { intIn } from "@/lib/validate";

// Haftalık hedef: haftada kaç gün, isteğe bağlı "en az N gün şu tür"
export const PUT = withUser(async (req, user) => {
  const body = await readJson(req);
  const daysPerWeek = intIn(body?.daysPerWeek, 1, 7);
  if (daysPerWeek === null) return jsonError(400, "Hedef haftada 1 ile 7 gün arasında olmalı.");

  const typeId = body?.minTypeId;
  if (typeId === null || typeId === undefined || typeId === "") {
    await saveGoal(user.id, { daysPerWeek, minTypeId: null, minTypeDays: null });
    return jsonOk({ ok: true });
  }
  if (typeof typeId !== "string" || !UUID_RE.test(typeId) || !(await ownsType(user.id, typeId))) {
    return jsonError(400, "Alt hedefteki tür bulunamadı.");
  }
  const minTypeDays = intIn(body?.minTypeDays, 1, daysPerWeek);
  if (minTypeDays === null) return jsonError(400, `Alt hedef 1 ile ${daysPerWeek} gün arasında olmalı.`);
  await saveGoal(user.id, { daysPerWeek, minTypeId: typeId, minTypeDays });
  return jsonOk({ ok: true });
});
