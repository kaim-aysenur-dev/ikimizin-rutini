import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { UUID_RE } from "@/lib/skin";
import { type WishAction, wishAction } from "@/lib/wishes-server";

type Ctx = RouteContext<"/api/gelisim/dilek/[id]/eylem">;
const ACTIONS: WishAction[] = ["baslat", "yeniden", "birak", "aldim", "almadim", "hediye"];

// Görevi başlat / yeniden başlat / bırak, gerçekte aldım, diğerinin dileğine "ben alacağım"
export const POST = withUser<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const action = (await readJson(req))?.action;
  if (!UUID_RE.test(id) || !ACTIONS.includes(action as WishAction)) return jsonError(400, "Geçersiz istek.");
  const res = await wishAction(user, id, action as WishAction, todayIstanbul());
  if ("error" in res) return jsonError(res.status, res.error);
  return jsonOk({ ok: true });
});
