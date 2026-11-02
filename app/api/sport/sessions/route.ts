import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { createSession, ownsType, ownsVideo } from "@/lib/sport-activities";
import { parseSession } from "@/lib/sport-input";

// "Spor yaptım": tür ya da videoyla yapılan oturum
export const POST = withUser(async (req, user) => {
  const input = parseSession(await readJson(req));
  if (typeof input === "string") return jsonError(400, input);
  if (input.typeId && !(await ownsType(user.id, input.typeId))) return jsonError(400, "Tür bulunamadı.");
  if (input.videoId && !(await ownsVideo(user.id, input.videoId))) return jsonError(400, "Video bulunamadı.");
  return jsonOk({ id: await createSession(user.id, input) }, { status: 201 });
});
