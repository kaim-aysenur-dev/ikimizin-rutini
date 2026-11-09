import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { saveStyle } from "@/lib/equipment-server";
import { battleLog } from "@/lib/battle-server";
import { levelOf } from "@/lib/xp";
import { adventure } from "@/lib/xp-server";

// Görünüm: unvan, iz efekti ve binek seçimi. Açılmamış olanlar sunucuda düşer.
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  if (!body || typeof body !== "object") return jsonError(400, "Geçersiz istek.");
  const pick = (v: unknown) => (typeof v === "string" && v.length <= 60 ? v : null);
  const today = todayIstanbul();
  const [adv, log] = await Promise.all([adventure(user.id, user.accountId, today), battleLog(user.id, today)]);
  const style = await saveStyle(user, { title: pick(body.title), trail: pick(body.trail), mount: pick(body.mount) }, { level: levelOf(adv.xp).level, stats: adv.stats, cleared: log.cleared });
  return jsonOk({ style });
});
