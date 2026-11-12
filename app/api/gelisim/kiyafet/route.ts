import { jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { outfitOf, saveOutfit, wearablesOf } from "@/lib/outfit-server";

const whoOf = (name: string) => (/ay[sş]enur/i.test(name) ? "aysenur" : "cengiz");

// Giydirme ekranı: kayıtlı kombin ve Dilek Dolabı'ndan giyilebilecekler (kazanılmamışlar kilitli)
export const GET = withUser(async (_req, user) => {
  const [outfit, wearables] = await Promise.all([outfitOf(user.id, whoOf(user.displayName)), wearablesOf(user.id)]);
  return jsonOk({ outfit, wearables });
});

export const PUT = withUser(async (req, user) => jsonOk({ outfit: await saveOutfit(user.id, await readJson(req), whoOf(user.displayName)) }));
