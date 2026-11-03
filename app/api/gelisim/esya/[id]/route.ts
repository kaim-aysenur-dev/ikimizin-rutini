import { jsonError, jsonOk } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { removeItem } from "@/lib/room-server";
import { UUID_RE } from "@/lib/skin";

type Ctx = RouteContext<"/api/gelisim/esya/[id]">;

// Yerleştirilmiş eşyayı envantere geri al (yalnız kendi koyduğun)
export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await removeItem(user.id, id))) return jsonError(404, "Eşya bulunamadı.");
  return jsonOk({ ok: true });
});
