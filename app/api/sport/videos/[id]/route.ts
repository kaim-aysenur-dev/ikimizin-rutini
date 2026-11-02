import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { archiveVideo, ownsType, updateVideo } from "@/lib/sport-activities";
import { parseVideo } from "@/lib/sport-input";

type Ctx = RouteContext<"/api/sport/videos/[id]">;

export const PATCH = withUser<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const input = parseVideo(await readJson(req));
  if (typeof input === "string") return jsonError(400, input);
  if (input.typeId && !(await ownsType(user.id, input.typeId))) return jsonError(400, "Tür bulunamadı.");
  const ok = UUID_RE.test(id) && (await updateVideo(user.id, id, input));
  return ok ? jsonOk({ ok: true }) : jsonError(404, "Video bulunamadı.");
});

// Video listeden kalkar; o videoyla yapılan oturumlar silinmez
export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await archiveVideo(user.id, id))) return jsonError(404, "Video bulunamadı.");
  return jsonOk({ ok: true });
});
