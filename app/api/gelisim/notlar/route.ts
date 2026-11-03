import { jsonError, jsonOk, readJson, str } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { notesOf, sendNote } from "@/lib/room-server";

// Posta kutusu: notları oku (gelenler okundu sayılır) ya da diğerine not bırak
export const GET = withUser(async (_req, user) => jsonOk({ notes: await notesOf(user) }));

export const POST = withUser(async (req, user) => {
  const body = str((await readJson(req))?.body, 500);
  if (!body) return jsonError(400, "Not boş olamaz.");
  if (!(await sendNote(user, body))) return jsonError(409, "Notu alacak kimse yok.");
  return jsonOk({ ok: true });
});
