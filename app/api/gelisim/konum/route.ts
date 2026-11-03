import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { SIZE } from "@/lib/room";
import { syncPresence } from "@/lib/room-server";

// Bahçede canlı konum: kendi konumunu yaz, diğerinin konumunu al. here: false ise bahçeden çıktın.
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const { here, x, y, dir, moving } = body ?? {};
  if (here === false) return jsonOk({ others: await syncPresence(user, null) });
  const { w, d } = SIZE.bahce;
  if (typeof x !== "number" || typeof y !== "number" || !(x >= 0 && x <= w && y >= -1 && y <= d) || (dir !== 1 && dir !== -1)) {
    return jsonError(400, "Geçersiz konum.");
  }
  return jsonOk({ others: await syncPresence(user, { x, y, dir, moving: moving === true }) });
});
