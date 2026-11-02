import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { isMeal } from "@/lib/meals";
import { setMealCheck } from "@/lib/nutrition";
import { pastDay } from "@/lib/validate";

// Öğün yapıldı / yapılmadı
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const day = pastDay(body?.day);
  if (!day || !isMeal(body?.meal) || typeof body?.done !== "boolean") return jsonError(400, "Geçersiz istek.");
  await setMealCheck(user.id, day, body.meal, body.done);
  return jsonOk({ ok: true });
});
