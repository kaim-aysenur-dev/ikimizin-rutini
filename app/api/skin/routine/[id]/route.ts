import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { parseRoutineStep } from "@/lib/routine-input";
import { UUID_RE, moveRoutineStep, removeRoutineStep, updateRoutineStep } from "@/lib/skin";

type Ctx = RouteContext<"/api/skin/routine/[id]">;

// Adımı güncelle ya da sırasını değiştir ({ move: -1 | 1 })
export const PATCH = withUser<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return jsonError(404, "Adım bulunamadı.");
  const body = await readJson(req);
  if (body?.move === -1 || body?.move === 1) {
    return (await moveRoutineStep(user.id, id, body.move)) ? jsonOk({ ok: true }) : jsonError(404, "Adım bulunamadı.");
  }
  const input = parseRoutineStep(body);
  if (typeof input === "string") return jsonError(400, input);
  return (await updateRoutineStep(user.id, id, input)) ? jsonOk({ ok: true }) : jsonError(404, "Adım bulunamadı.");
});

export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await removeRoutineStep(user.id, id))) return jsonError(404, "Adım bulunamadı.");
  return jsonOk({ ok: true });
});
