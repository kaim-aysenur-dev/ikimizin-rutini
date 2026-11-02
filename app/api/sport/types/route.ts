import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { createType } from "@/lib/sport-activities";
import { parseType } from "@/lib/sport-input";

// Yeni aktivite türü (ör. Pilates, Boks)
export const POST = withUser(async (req, user) => {
  const input = parseType(await readJson(req));
  if (typeof input === "string") return jsonError(400, input);
  return jsonOk({ id: await createType(user.id, input) }, { status: 201 });
});
