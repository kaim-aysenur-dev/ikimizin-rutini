import { jsonError, jsonOk } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { deleteExam } from "@/lib/yds-server";

type Ctx = RouteContext<"/api/yds/deneme/[id]">;

export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await deleteExam(user.id, id))) return jsonError(404, "Deneme bulunamadı.");
  return jsonOk({ ok: true });
});
