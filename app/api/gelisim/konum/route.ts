import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { SIZE } from "@/lib/room";
import { syncPresence } from "@/lib/room-server";
import { UUID_RE } from "@/lib/skin";

// Canlı konum: bahçede ya da bir evde. Kendi konumunu yaz, aynı yerdeki diğerini al. here: false ise ayrıldın.
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const { here, place, x, y, dir, moving } = body ?? {};
  const isHouse = typeof place === "string" && place.startsWith("ev:") && UUID_RE.test(place.slice(3));
  if (place !== "bahce" && !isHouse) return jsonError(400, "Geçersiz yer.");
  if (here === false) return jsonOk({ others: await syncPresence(user, place as string, null) });
  const { w, d } = SIZE[isHouse ? "oda" : "bahce"];
  if (typeof x !== "number" || typeof y !== "number" || !(x >= -1 && x <= w + 1 && y >= -1 && y <= d + 1) || (dir !== 1 && dir !== -1)) {
    return jsonError(400, "Geçersiz konum.");
  }
  return jsonOk({ others: await syncPresence(user, place as string, { x, y, dir, moving: moving === true }) });
});
