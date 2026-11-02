import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { parseRoutineStep } from "@/lib/routine-input";
import { createRoutineStep } from "@/lib/skin";
import { isSlot } from "@/lib/slots";

// Ürüne bağlı olmayan rutin adımı ekler
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  if (!isSlot(body?.slot)) return jsonError(400, "Geçersiz zaman grubu.");
  const input = parseRoutineStep(body);
  if (typeof input === "string") return jsonError(400, input);
  return jsonOk({ id: await createRoutineStep(user.id, body.slot, input) }, { status: 201 });
});
