import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { SIZE } from "@/lib/room";
import { syncPresence, unreadNotes } from "@/lib/room-server";
import { partnerTimers } from "@/lib/study-server";
import { UUID_RE } from "@/lib/skin";

// Canlı konum: bahçede, şatoda ya da bir evde. Kendi konumunu yaz, aynı yerdeki diğerini al. here: false ise ayrıldın.
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const { here, place, x, y, dir, moving } = body ?? {};
  const isHouse = typeof place === "string" && place.startsWith("ev:") && UUID_RE.test(place.slice(3));
  if (place !== "bahce" && place !== "sato" && !isHouse) return jsonError(400, "Geçersiz yer.");
  if (here === false) return jsonOk({ others: await syncPresence(user, place as string, null) });
  const { w, d } = SIZE[isHouse ? "oda" : place === "sato" ? "sato" : "bahce"];
  if (typeof x !== "number" || typeof y !== "number" || !(x >= -1 && x <= w + 1 && y >= -1 && y <= d + 1) || (dir !== 1 && dir !== -1)) {
    return jsonError(400, "Geçersiz konum.");
  }
  const [others, unread, timers] = await Promise.all([
    syncPresence(user, place as string, { x, y, dir, moving: moving === true }), unreadNotes(user.id), partnerTimers(user),
  ]);
  // evde sayacı açık ve yerinde duran kişi masada çalışıyor görünür; şerit için sayaçlar ayrıca döner
  const studyOf = (id: string, moving: boolean) => {
    const t = isHouse && !moving ? timers.find((x) => x.userId === id) : undefined;
    return t ? { reading: t.reading } : null;
  };
  return jsonOk({ others: others.map((o) => ({ ...o, study: studyOf(o.userId, o.moving) })), unread, timers });
});
