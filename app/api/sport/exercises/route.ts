import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { createExercise } from "@/lib/sport";
import { text } from "@/lib/validate";

// Hareket kütüphanesine yeni hareket
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const name = text(body?.name, 80);
  if (name.length < 2) return jsonError(400, "Hareket adı en az 2 karakter olmalı.");
  const id = await createExercise(user.id, { name, region: text(body?.region, 60), howTo: text(body?.howTo, 1000) });
  return jsonOk({ id }, { status: 201 });
});
