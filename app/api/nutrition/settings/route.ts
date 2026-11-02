import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { saveWaterSettings } from "@/lib/nutrition";
import { intIn } from "@/lib/validate";

// Su hedefi: bardak hacmi, normal gün ve spor günü hedefi (bardak)
export const PUT = withUser(async (req, user) => {
  const body = await readJson(req);
  const glassMl = intIn(body?.glassMl, 50, 1000);
  const target = intIn(body?.target, 1, 40);
  const targetSport = intIn(body?.targetSport, 1, 40);
  if (glassMl === null || target === null || targetSport === null) return jsonError(400, "Geçersiz değer.");
  await saveWaterSettings(user.id, { glassMl, target, targetSport });
  return jsonOk({ ok: true });
});
