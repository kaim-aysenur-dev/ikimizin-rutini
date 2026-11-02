import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { saveNutritionDay } from "@/lib/nutrition";
import { intIn, pastDay, text } from "@/lib/validate";

// Günlük su (bardak) ve kısa not
export const PUT = withUser(async (req, user) => {
  const body = await readJson(req);
  const day = pastDay(body?.day);
  if (!day) return jsonError(400, "Geçersiz tarih.");
  const patch: { water?: number; note?: string } = {};
  if (body && "water" in body) {
    const water = intIn(body.water, 0, 40);
    if (water === null) return jsonError(400, "Bardak sayısı 0 ile 40 arasında olmalı.");
    patch.water = water;
  }
  if (body && "note" in body) patch.note = text(body.note, 1000);
  await saveNutritionDay(user.id, day, patch);
  return jsonOk({ ok: true });
});
