import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { archiveType, updateType } from "@/lib/sport-activities";
import { parseType } from "@/lib/sport-input";

type Ctx = RouteContext<"/api/sport/types/[id]">;

export const PATCH = withUser<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const input = parseType(await readJson(req));
  if (typeof input === "string") return jsonError(400, input);
  const ok = UUID_RE.test(id) && (await updateType(user.id, id, input));
  return ok ? jsonOk({ ok: true }) : jsonError(404, "Tür bulunamadı.");
});

// Tür listeden kalkar; geçmiş oturumlar silinmez
export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await archiveType(user.id, id))) return jsonError(404, "Tür bulunamadı.");
  return jsonOk({ ok: true });
});
