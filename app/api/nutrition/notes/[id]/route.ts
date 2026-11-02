import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { deleteNote, updateNote } from "@/lib/nutrition";
import { UUID_RE } from "@/lib/skin";
import { lines, text } from "@/lib/validate";

type Ctx = RouteContext<"/api/nutrition/notes/[id]">;

export const PATCH = withUser<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const body = await readJson(req);
  const title = text(body?.title, 80);
  const items = lines(body?.lines);
  if (title.length < 2 || !items) return jsonError(400, "Başlık en az 2 karakter olmalı.");
  if (!UUID_RE.test(id) || !(await updateNote(user.id, id, title, items))) return jsonError(404, "Not bulunamadı.");
  return jsonOk({ ok: true });
});

export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await deleteNote(user.id, id))) return jsonError(404, "Not bulunamadı.");
  return jsonOk({ ok: true });
});
