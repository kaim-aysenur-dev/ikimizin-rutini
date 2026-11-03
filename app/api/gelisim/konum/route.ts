import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { SIZE } from "@/lib/room";
import { syncPresence, unreadNotes } from "@/lib/room-server";
import { partnerTimers } from "@/lib/study-server";
import { parseActionHistory } from "@/lib/combat-sync";
import { UUID_RE } from "@/lib/skin";

// duruş: oturuyor / uzanıyor / masada / kitaplıkta ve yüksekliği (ör. "lie:8")
const POSE_RE = /^(sit|lie|desk|read):\d{1,2}$/;

// Canlı konum: bahçede, şatoda ya da bir evde. Kendi konumunu yaz, aynı yerdeki diğerini al. here: false ise ayrıldın.
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const { here, place, x, y, dir, moving, action, pose } = body ?? {};
  // son saldırı ya da büyü: yalnız biçimi doğruysa saklanır (diğer kişi efekti oynatır)
  const act = parseActionHistory(action);
  const isHouse = typeof place === "string" && place.startsWith("ev:") && UUID_RE.test(place.slice(3));
  const isCastle = place === "sato" || place === "sato:2" || place === "sato:3";
  if (place !== "bahce" && !isCastle && !isHouse) return jsonError(400, "Geçersiz yer.");
  if (here === false) return jsonOk({ others: await syncPresence(user, place as string, null) });
  const { w, d } = SIZE[isHouse ? "oda" : isCastle ? "sato" : "bahce"];
  if (typeof x !== "number" || typeof y !== "number" || !(x >= -1 && x <= w + 1 && y >= -1 && y <= d + 1) || (dir !== 1 && dir !== -1)) {
    return jsonError(400, "Geçersiz konum.");
  }
  const [others, unread, timers] = await Promise.all([
    syncPresence(user, place as string, { x, y, dir, moving: moving === true, action: act, pose: typeof pose === "string" && POSE_RE.test(pose) ? pose : null }), unreadNotes(user.id), partnerTimers(user),
  ]);
  // masada oturan ve sayacı açık olan odakta görünür; şerit için sayaçlar ayrıca döner
  return jsonOk({ others: others.map((o) => ({ ...o, focus: timers.some((x) => x.userId === o.userId) })), unread, timers });
});
