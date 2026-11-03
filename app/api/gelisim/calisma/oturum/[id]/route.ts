import { jsonError, jsonOk } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/skin";
import { deleteSession } from "@/lib/study-server";

type Ctx = RouteContext<"/api/gelisim/calisma/oturum/[id]">;

// Yanlış girilen kaydı sil (yalnız kendi kaydın); geri alınan XP döner
export const DELETE = withUser<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  const xp = UUID_RE.test(id) ? await deleteSession(user, id) : null;
  if (xp === null) return jsonError(404, "Kayıt bulunamadı.");
  return jsonOk({ xp });
});
