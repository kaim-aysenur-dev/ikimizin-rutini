import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { isDay } from "@/lib/dates";
import { BODY_FIELDS, deleteBodyMetrics, saveBodyMetrics, type BodyField } from "@/lib/nutrition";
import { optionalNumber, pastDay, text } from "@/lib/validate";

const LIMITS: Record<BodyField, [number, number]> = {
  weight: [20, 400],
  waist: [20, 300],
  hip: [20, 300],
  chest: [20, 300],
  arm: [5, 100],
  thigh: [10, 150],
};

// Kilo ve ölçü kaydı (gün başına bir kayıt)
export const PUT = withUser(async (req, user) => {
  const body = await readJson(req);
  const day = pastDay(body?.day);
  if (!day) return jsonError(400, "Geçersiz tarih.");
  const raw = (body?.values ?? {}) as Record<string, unknown>;
  const values = {} as Record<BodyField, number | null>;
  for (const f of BODY_FIELDS) {
    const v = optionalNumber(raw[f], ...LIMITS[f]);
    if (v === undefined) return jsonError(400, "Değerlerden biri geçersiz.");
    values[f] = v;
  }
  if (BODY_FIELDS.every((f) => values[f] === null)) return jsonError(400, "En az bir ölçü gir.");
  await saveBodyMetrics(user.id, day, values, text(body?.note, 500));
  return jsonOk({ ok: true });
});

export const DELETE = withUser(async (req, user) => {
  const day = req.nextUrl.searchParams.get("day");
  if (!isDay(day) || !(await deleteBodyMetrics(user.id, day))) return jsonError(404, "Kayıt bulunamadı.");
  return jsonOk({ ok: true });
});
