import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { parseBook } from "@/lib/study-input";
import { archiveBook, updateBook } from "@/lib/study-server";

type Ctx = RouteContext<"/api/gelisim/calisma/kitap/[id]">;

// Kitabı düzenle (kaldığın sayfa, not, durum) ya da listeden kaldır (yalnız sahibi)
export const PATCH = withUser<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const input = parseBook(await readJson(req));
  if (typeof input === "string") return jsonError(400, input);
  if (!UUID_RE.test(id) || !(await updateBook(user, id, input))) return jsonError(404, "Kitap bulunamadı.");
  return jsonOk({ ok: true });
});

export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await archiveBook(user, id))) return jsonError(404, "Kitap bulunamadı ya da senin değil.");
  return jsonOk({ ok: true });
});
