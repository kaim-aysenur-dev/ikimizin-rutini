import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { parseBook } from "@/lib/study-input";
import { createBook } from "@/lib/study-server";

// Okuma listesine kitap ya da yayın
export const POST = withUser(async (req, user) => {
  const input = parseBook(await readJson(req));
  if (typeof input === "string") return jsonError(400, input);
  return jsonOk({ id: await createBook(user, input) }, { status: 201 });
});
