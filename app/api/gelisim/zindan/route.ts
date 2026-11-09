import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { battleLog, claim } from "@/lib/battle-server";
import { adventure } from "@/lib/xp-server";

// Ay Kapısı: zindan geçmişi (GET) ve bölüm ya da hayalet ödülü (POST). Seviye kilidi sunucuda.
export const GET = withUser(async (_req, user) => jsonOk(await battleLog(user.id, todayIstanbul())));

export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const kind = body?.kind, ref = body?.ref;
  if ((kind !== "zindan" && kind !== "hayalet") || typeof ref !== "number" || !Number.isInteger(ref)) return jsonError(400, "Geçersiz istek.");
  const today = todayIstanbul();
  const { xp } = await adventure(user.id, user.accountId, today);
  const res = await claim(user, xp, kind, ref, today);
  if (!res.ok) return jsonError(res.status, res.error);
  return jsonOk({ xp: res.xp, first: res.first });
});
