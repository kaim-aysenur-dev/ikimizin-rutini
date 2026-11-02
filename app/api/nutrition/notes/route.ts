import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { createNote } from "@/lib/nutrition";
import { lines, text } from "@/lib/validate";

export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const title = text(body?.title, 80);
  const items = lines(body?.lines);
  if (title.length < 2 || !items) return jsonError(400, "Başlık en az 2 karakter olmalı.");
  return jsonOk({ id: await createNote(user.id, title, items) }, { status: 201 });
});
