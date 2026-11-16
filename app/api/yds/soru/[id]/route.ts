import { jsonError, jsonOk } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { deletePractice } from "@/lib/yds-server";

type Ctx = RouteContext<"/api/yds/soru/[id]">;

export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await deletePractice(user.id, id))) return jsonError(404, "Kayıt bulunamadı.");
  return jsonOk({ ok: true });
});
