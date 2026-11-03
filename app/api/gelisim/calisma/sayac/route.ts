import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { parseTarget } from "@/lib/study-input";
import { cancelTimer, startTimer } from "@/lib/study-server";

// Süre tutma: başlat (varsa eskisinin yerine geçer) ya da kaydetmeden durdur
export const POST = withUser(async (req, user) => {
  const target = parseTarget(await readJson(req));
  if (typeof target === "string") return jsonError(400, target);
  if (!(await startTimer(user, target))) return jsonError(404, "Alan ya da kitap bulunamadı.");
  return jsonOk({ ok: true });
});

export const DELETE = withUser(async (_req, user) => {
  await cancelTimer(user);
  return jsonOk({ ok: true });
});
