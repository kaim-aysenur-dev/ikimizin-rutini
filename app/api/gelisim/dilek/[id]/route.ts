import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { deleteImage } from "@/lib/cloudinary";
import { UUID_RE } from "@/lib/skin";
import { parseWish } from "@/lib/wish-input";
import { deleteWish, photoOf, updateWish } from "@/lib/wishes-server";

type Ctx = RouteContext<"/api/gelisim/dilek/[id]">;

// Dileği düzenle (görevdeyken koşullar kilitli) ya da sil (yalnız sahibi)
export const PATCH = withUser<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return jsonError(404, "Dilek bulunamadı.");
  const input = parseWish(await readJson(req), user.id, await photoOf(user, id));
  if (typeof input === "string") return jsonError(400, input);
  const res = await updateWish(user, id, input);
  if ("error" in res) return jsonError(res.status, res.error);
  if (res.oldPhoto) await deleteImage(res.oldPhoto);
  return jsonOk({ ok: true });
});

export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  const res = UUID_RE.test(id) ? await deleteWish(user, id) : null;
  if (!res) return jsonError(404, "Dilek bulunamadı ya da senin değil.");
  if (res.photo) await deleteImage(res.photo);
  return jsonOk({ ok: true });
});
