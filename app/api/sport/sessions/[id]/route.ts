import { jsonError, jsonOk } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { deleteSession } from "@/lib/sport-activities";

type Ctx = RouteContext<"/api/sport/sessions/[id]">;

// Yanlış girilen oturumu sil
export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await deleteSession(user.id, id))) return jsonError(404, "Kayıt bulunamadı.");
  return jsonOk({ ok: true });
});
