import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { parseWord } from "@/lib/yds-input";
import { addWord, wordsOf } from "@/lib/yds-server";

// Kendi kelimelerin: listele, ekle (sıradaki oturumda yeni kart olarak gelir)
export const GET = withUser(async (_req, user) => jsonOk({ words: await wordsOf(user.id) }));

export const POST = withUser(async (req, user) => {
  const w = parseWord(await readJson(req));
  if (typeof w === "string") return jsonError(400, w);
  const res = await addWord(user.id, w.en, w.tr);
  if (typeof res !== "string") return jsonError(409, res.error);
  return jsonOk({ id: res }, { status: 201 });
});
