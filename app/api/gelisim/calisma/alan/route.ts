import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { parseArea } from "@/lib/study-input";
import { createArea } from "@/lib/study-server";

// Masaya yeni çalışma alanı (Python, Network...)
export const POST = withUser(async (req, user) => {
  const input = parseArea(await readJson(req));
  if (typeof input === "string") return jsonError(400, input);
  return jsonOk({ id: await createArea(user, input) }, { status: 201 });
});
