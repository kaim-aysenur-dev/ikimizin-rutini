import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { parseArea } from "@/lib/study-input";
import { archiveArea, updateArea } from "@/lib/study-server";

type Ctx = RouteContext<"/api/gelisim/calisma/alan/[id]">;

// Alanı düzenle (ortak alanı ikiniz de) ya da kaldır (yalnız sahibi; kayıtlar kalır)
export const PATCH = withUser<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const input = parseArea(await readJson(req));
  if (typeof input === "string") return jsonError(400, input);
  if (!UUID_RE.test(id) || !(await updateArea(user, id, input))) return jsonError(404, "Alan bulunamadı.");
  return jsonOk({ ok: true });
});

export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await archiveArea(user, id))) return jsonError(404, "Alan bulunamadı ya da senin değil.");
  return jsonOk({ ok: true });
});
