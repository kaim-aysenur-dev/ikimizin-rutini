import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { parseSettings } from "@/lib/yds-input";
import { saveSettings, ydsOverview } from "@/lib/yds-server";

// YDS Kampı: bugünkü kota, son 30 gün, kartlar, bölümler, denemeler, partnerin durumu; ayarları kaydet
export const GET = withUser(async (_req, user) => jsonOk(await ydsOverview(user, todayIstanbul())));

export const PUT = withUser(async (req, user) => {
  const s = parseSettings(await readJson(req));
  if (typeof s === "string") return jsonError(400, s);
  await saveSettings(user.id, s);
  return jsonOk({ ok: true });
});
