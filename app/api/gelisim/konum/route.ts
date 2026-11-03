import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { SIZE } from "@/lib/room";
import { syncPresence, unreadNotes } from "@/lib/room-server";
import { UUID_RE } from "@/lib/skin";

// Canlı konum: bahçede, şatoda ya da bir evde. Kendi konumunu yaz, aynı yerdeki diğerini al. here: false ise ayrıldın.
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const { here, place, x, y, dir, moving, action } = body ?? {};
  // son saldırı ya da büyü: yalnız biçimi doğruysa saklanır (diğer kişi efekti oynatır)
  const a = action as { kind?: unknown; id?: unknown; at?: unknown } | undefined;
  const act = a && (a.kind === "vurus" || a.kind === "buyu") && typeof a.id === "string" && a.id.length <= 60 && typeof a.at === "number" && Number.isFinite(a.at)
    ? { kind: a.kind as "vurus" | "buyu", id: a.id, at: a.at } : null;
  const isHouse = typeof place === "string" && place.startsWith("ev:") && UUID_RE.test(place.slice(3));
  const isCastle = place === "sato" || place === "sato:2" || place === "sato:3";
  if (place !== "bahce" && !isCastle && !isHouse) return jsonError(400, "Geçersiz yer.");
  if (here === false) return jsonOk({ others: await syncPresence(user, place as string, null) });
  const { w, d } = SIZE[isHouse ? "oda" : isCastle ? "sato" : "bahce"];
  if (typeof x !== "number" || typeof y !== "number" || !(x >= -1 && x <= w + 1 && y >= -1 && y <= d + 1) || (dir !== 1 && dir !== -1)) {
    return jsonError(400, "Geçersiz konum.");
  }
  const [others, unread] = await Promise.all([syncPresence(user, place as string, { x, y, dir, moving: moving === true, action: act }), unreadNotes(user.id)]);
  return jsonOk({ others, unread });
});
