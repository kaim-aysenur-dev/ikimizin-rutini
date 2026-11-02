import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { parseProductInput } from "@/lib/product-input";
import { listProducts, saveProduct } from "@/lib/skin";

export const GET = withUser(async (_req, user) => jsonOk({ products: await listProducts(user.id) }));

export const POST = withUser(async (req, user) => {
  const input = parseProductInput(user.id, await readJson(req));
  if (typeof input === "string") return jsonError(400, input);
  const id = await saveProduct(user.id, null, input);
  return jsonOk({ id }, { status: 201 });
});
