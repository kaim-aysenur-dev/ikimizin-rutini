import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { parseWish } from "@/lib/wish-input";
import { createWish, isMember, wishOverview } from "@/lib/wishes-server";

// Dilek Dolabı: ?kim=<kişi> dolabın sahibi (gardırobun bulunduğu evin sahibi; yoksa kendin).
// Sahibinin dilekleri ve ortak dilekler, görevdekilerin ilerlemesi (tamamlananlar burada kazanılır).
export const GET = withUser(async (req, user) => {
  const kim = new URL(req.url).searchParams.get("kim") ?? user.id;
  if (!(await isMember(user, kim))) return jsonError(404, "Dolap bulunamadı.");
  return jsonOk(await wishOverview(user, todayIstanbul(), kim));
});

export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  // dolaba ikiniz de ekleyebilirsiniz: "for" dolabın sahibi (fotoğraf ekleyenin klasöründe)
  const owner = typeof body?.for === "string" ? body.for : user.id;
  if (!(await isMember(user, owner))) return jsonError(404, "Dolap bulunamadı.");
  const input = parseWish(body, user.id);
  if (typeof input === "string") return jsonError(400, input);
  const res = await createWish(owner, input);
  if (typeof res !== "string") return jsonError(409, res.error);
  return jsonOk({ id: res }, { status: 201 });
});
