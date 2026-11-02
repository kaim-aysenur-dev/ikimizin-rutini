import { jsonError, jsonOk, readJson, str } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { ownsPublicId } from "@/lib/cloudinary";
import { isDay, todayIstanbul } from "@/lib/dates";
import { deleteJournal, saveJournal } from "@/lib/skin";
import type { SkinMetric } from "@/lib/slots";

// Cilt günlüğü: gün başına bir kayıt (puanlar, not, isteğe bağlı fotoğraf)
export const PUT = withUser(async (req, user) => {
  const body = await readJson(req);
  const day = body?.day;
  if (!isDay(day) || day > todayIstanbul() || day < "2020-01-01") return jsonError(400, "Geçersiz tarih.");

  const raw = (body?.scores ?? {}) as Record<string, unknown>;
  const scores: Partial<Record<SkinMetric, number | null>> = {};
  for (const metric of user.skinMetrics as SkinMetric[]) {
    const v = raw[metric];
    if (v === null || v === undefined) scores[metric] = null;
    else if (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5) scores[metric] = v as number;
    else return jsonError(400, "Puanlar 1 ile 5 arasında olmalı.");
  }

  let photo: string | null | undefined;
  if (body && "photoPublicId" in body) {
    if (body.photoPublicId === null) photo = null;
    else if (ownsPublicId(user.id, "cilt", body.photoPublicId)) photo = body.photoPublicId;
    else return jsonError(400, "Geçersiz fotoğraf.");
  }

  const note = str(body?.note, 2000);
  if (Object.values(scores).every((v) => v === null) && !note && !photo) {
    return jsonError(400, "Kaydetmek için en az bir puan, not ya da fotoğraf ekle.");
  }
  await saveJournal(user.id, day, scores, note, photo);
  return jsonOk({ ok: true });
});

export const DELETE = withUser(async (req, user) => {
  const day = req.nextUrl.searchParams.get("day");
  if (!isDay(day)) return jsonError(400, "Geçersiz tarih.");
  if (!(await deleteJournal(user.id, day))) return jsonError(404, "Kayıt bulunamadı.");
  return jsonOk({ ok: true });
});
