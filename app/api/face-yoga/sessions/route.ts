import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { createFaceYogaSession, isMissingTable } from "@/lib/face-yoga";
import { isPracticeId } from "@/lib/face-yoga-shared";

// Tamamlanan yüz yogası seansı; her zaman bugüne yazılır
export const POST = withUser(async (req, user) => {
  const { routine, seconds } = (await readJson(req)) ?? {};
  if (!isPracticeId(routine)) return jsonError(400, "Rutin bulunamadı.");
  if (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds < 10 || seconds > 7200) {
    return jsonError(400, "Süre geçersiz.");
  }
  try {
    return jsonOk({ id: await createFaceYogaSession(user.id, todayIstanbul(), routine, seconds) }, { status: 201 });
  } catch (err) {
    if (isMissingTable(err)) return jsonError(503, "Yüz yogası takibi için veritabanı güncellemesi bekleniyor.");
    throw err;
  }
});
