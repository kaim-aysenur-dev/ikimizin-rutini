import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { createVideo, ownsType } from "@/lib/sport-activities";
import { parseVideo } from "@/lib/sport-input";
import { parseYouTubeId } from "@/lib/sport-shared";

// Video kütüphanesine YouTube videosu
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const youtubeId = typeof body?.youtubeId === "string" ? parseYouTubeId(body.youtubeId) : null;
  if (!youtubeId) return jsonError(400, "Video linki geçersiz.");
  const input = parseVideo(body);
  if (typeof input === "string") return jsonError(400, input);
  if (input.typeId && !(await ownsType(user.id, input.typeId))) return jsonError(400, "Tür bulunamadı.");
  const id = await createVideo(user.id, youtubeId, input);
  if (!id) return jsonError(409, "Bu video zaten listende.");
  return jsonOk({ id }, { status: 201 });
});
