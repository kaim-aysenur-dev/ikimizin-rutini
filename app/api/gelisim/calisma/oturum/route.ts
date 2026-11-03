import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { parseSession } from "@/lib/study-input";
import { saveSession } from "@/lib/study-server";

// Çalışma ya da okuma oturumu: sayaçtan ya da elle; bugüne yazılır, kazanılan XP döner
export const POST = withUser(async (req, user) => {
  const input = parseSession(await readJson(req));
  if (typeof input === "string") return jsonError(400, input);
  const res = await saveSession(user, todayIstanbul(), input);
  if (!res.ok) return jsonError(res.status, res.error);
  return jsonOk(res, { status: 201 });
});
