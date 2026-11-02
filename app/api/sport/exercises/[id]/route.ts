import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { archiveExercise, updateExercise } from "@/lib/sport";
import { text } from "@/lib/validate";

type Ctx = RouteContext<"/api/sport/exercises/[id]">;

export const PATCH = withUser<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const body = await readJson(req);
  const name = text(body?.name, 80);
  if (name.length < 2) return jsonError(400, "Hareket adı en az 2 karakter olmalı.");
  const ok = UUID_RE.test(id) && (await updateExercise(user.id, id, { name, region: text(body?.region, 60), howTo: text(body?.howTo, 1000) }));
  return ok ? jsonOk({ ok: true }) : jsonError(404, "Hareket bulunamadı.");
});

export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await archiveExercise(user.id, id))) return jsonError(404, "Hareket bulunamadı.");
  return jsonOk({ ok: true });
});
