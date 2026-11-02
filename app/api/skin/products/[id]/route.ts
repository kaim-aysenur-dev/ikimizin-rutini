import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { parseProductInput } from "@/lib/product-input";
import { UUID_RE, archiveProduct, saveProduct } from "@/lib/skin";

type Ctx = RouteContext<"/api/skin/products/[id]">;

export const PATCH = withUser<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return jsonError(404, "Ürün bulunamadı.");
  const input = parseProductInput(user.id, await readJson(req));
  if (typeof input === "string") return jsonError(400, input);
  const saved = await saveProduct(user.id, id, input);
  if (!saved) return jsonError(404, "Ürün bulunamadı.");
  return jsonOk({ id: saved });
});

export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await archiveProduct(user.id, id))) return jsonError(404, "Ürün bulunamadı.");
  return jsonOk({ ok: true });
});
