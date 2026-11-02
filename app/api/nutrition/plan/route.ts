import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { isMeal } from "@/lib/meals";
import { savePlanMeal } from "@/lib/nutrition";
import { lines, text, weekday } from "@/lib/validate";

// Haftalık plandaki bir öğünü kaydeder (boş gönderilirse öğün plandan çıkar)
export const PUT = withUser(async (req, user) => {
  const body = await readJson(req);
  const wd = weekday(body?.weekday);
  const items = lines(body?.items);
  if (wd === null || !isMeal(body?.meal) || !items) return jsonError(400, "Geçersiz istek.");
  await savePlanMeal(user.id, wd, body.meal, items, text(body?.note));
  return jsonOk({ ok: true });
});
