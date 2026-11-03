import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { placeItem } from "@/lib/room-server";
import { adventure } from "@/lib/xp-server";

// Envanterden eşya yerleştir: kendi odana ya da ortak bahçeye
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const { itemId, scope, tx, ty } = body ?? {};
  if (typeof itemId !== "string" || (scope !== "oda" && scope !== "bahce") || typeof tx !== "number" || typeof ty !== "number") {
    return jsonError(400, "Geçersiz istek.");
  }
  const { xp } = await adventure(user.id, user.accountId, todayIstanbul());
  const res = await placeItem(user, xp, itemId, scope, tx, ty);
  if (!res.ok) return jsonError(res.status, res.error);
  return jsonOk({ item: res.item });
});
