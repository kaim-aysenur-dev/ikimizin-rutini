import { jsonError, jsonOk } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { applyTemplate, deleteTemplate } from "@/lib/nutrition";
import { UUID_RE } from "@/lib/skin";

type Ctx = RouteContext<"/api/nutrition/templates/[id]">;

// Şablonu etkin plana uygular
export const POST = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await applyTemplate(user.id, id))) return jsonError(404, "Şablon bulunamadı.");
  return jsonOk({ ok: true });
});

export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await deleteTemplate(user.id, id))) return jsonError(404, "Şablon bulunamadı.");
  return jsonOk({ ok: true });
});
