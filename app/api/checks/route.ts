import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { diffDays, isDay, todayIstanbul } from "@/lib/dates";
import { UUID_RE, getCheckKeys, setCheck } from "@/lib/skin";

// Rutin adımlarının günlük işaretleri. Her zaman oturumdaki kullanıcının verisi.
export const GET = withUser(async (req, user) => {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!isDay(from) || !isDay(to) || diffDays(to, from) < 0 || diffDays(to, from) > 400) {
    return jsonError(400, "Geçersiz tarih aralığı.");
  }
  return jsonOk({ checks: await getCheckKeys(user.id, from, to) });
});

export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const { day, itemId, done } = body ?? {};
  if (!isDay(day) || typeof itemId !== "string" || !UUID_RE.test(itemId) || typeof done !== "boolean") {
    return jsonError(400, "Geçersiz istek.");
  }
  if (day > todayIstanbul()) return jsonError(400, "Gelecek günler işaretlenemez.");
  if (day < "2020-01-01") return jsonError(400, "Geçersiz tarih.");
  const ok = await setCheck(user.id, day, itemId, done);
  if (!ok) return jsonError(404, "Adım bulunamadı.");
  return jsonOk({ ok: true });
});
