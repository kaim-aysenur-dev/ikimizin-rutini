import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { parseWish } from "@/lib/wish-input";
import { createWish, wishOverview } from "@/lib/wishes-server";

// Dilek Dolabı: ikinizin dilekleri, görevdekilerin ilerlemesi (tamamlananlar burada kazanılır)
export const GET = withUser(async (_req, user) => jsonOk(await wishOverview(user, todayIstanbul())));

export const POST = withUser(async (req, user) => {
  const input = parseWish(await readJson(req), user.id);
  if (typeof input === "string") return jsonError(400, input);
  const res = await createWish(user, input);
  if (typeof res !== "string") return jsonError(409, res.error);
  return jsonOk({ id: res }, { status: 201 });
});
