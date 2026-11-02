import { jsonError, jsonOk } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { deleteFaceYogaSession } from "@/lib/face-yoga";
import { UUID_RE } from "@/lib/skin";

type Ctx = RouteContext<"/api/face-yoga/sessions/[id]">;

// Yanlışlıkla kaydedilen seansı sil
export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await deleteFaceYogaSession(user.id, id))) return jsonError(404, "Kayıt bulunamadı.");
  return jsonOk({ ok: true });
});
