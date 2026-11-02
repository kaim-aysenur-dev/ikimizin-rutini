import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { deletePlanItem, movePlanItem, updatePlanItem } from "@/lib/sport";
import { parsePlanItem } from "@/lib/sport-input";

type Ctx = RouteContext<"/api/sport/plan/[id]">;

// Plan maddesini güncelle ya da sırasını değiştir ({ move: -1 | 1 })
export const PATCH = withUser<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return jsonError(404, "Bulunamadı.");
  const body = await readJson(req);
  if (body?.move === -1 || body?.move === 1) {
    return (await movePlanItem(user.id, id, body.move)) ? jsonOk({ ok: true }) : jsonError(404, "Bulunamadı.");
  }
  const input = parsePlanItem(body);
  if (typeof input === "string") return jsonError(400, input);
  return (await updatePlanItem(user.id, id, input)) ? jsonOk({ ok: true }) : jsonError(404, "Bulunamadı.");
});

export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await deletePlanItem(user.id, id))) return jsonError(404, "Bulunamadı.");
  return jsonOk({ ok: true });
});
