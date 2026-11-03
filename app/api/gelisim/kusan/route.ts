import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { equip } from "@/lib/equipment-server";
import { adventure } from "@/lib/xp-server";

// Zırh odası: bir eşyayı kuşan ya da (kuşanılmışsa) çıkar. Seviye kilidi burada denetlenir.
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const gearId = body?.gearId;
  if (typeof gearId !== "string" || gearId.length > 60) return jsonError(400, "Geçersiz eşya.");
  const { xp } = await adventure(user.id, user.accountId, todayIstanbul());
  const res = await equip(user, xp, gearId);
  if (!res.ok) return jsonError(res.status, res.error);
  return jsonOk({ equipment: res.equipment });
});
