import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { saveAsTemplate } from "@/lib/nutrition";
import { text } from "@/lib/validate";

// Etkin haftalık planı adıyla şablon olarak kaydeder
export const POST = withUser(async (req, user) => {
  const name = text((await readJson(req))?.name, 80);
  if (name.length < 2) return jsonError(400, "Şablona en az 2 karakterlik bir ad ver.");
  return jsonOk({ id: await saveAsTemplate(user.id, name) }, { status: 201 });
});
