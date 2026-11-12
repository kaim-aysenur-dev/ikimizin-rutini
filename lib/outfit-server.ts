import "server-only";
import { sql } from "./db";
import { type Outfit, type Wearable, portraitLook, sanitizeOutfit, wearableOf } from "./outfit";
import type { PortraitLook } from "./portrait";
import type { WishCat } from "./wishes";

type Who = "cengiz" | "aysenur";

export async function outfitOf(userId: string, who: Who): Promise<Outfit> {
  const [r] = await sql()`select data from outfits where user_id = ${userId}`;
  return sanitizeOutfit(r?.data, who);
}

/** Kişinin giyilebilir dilekleri (kendi ve ortak); kazanılmamışlar kilitli görünür */
export async function wearablesOf(userId: string): Promise<Wearable[]> {
  const rows = await sql()`
    select w.id, w.title, w.brand, w.category, w.status from wishes w
    where w.user_id = ${userId} or (w.shared and w.user_id in (select id from users where account_id = (select account_id from users where id = ${userId})))
    order by w.earned_at desc nulls last, w.created_at`;
  return rows.map((r) => wearableOf({ id: r.id, title: r.title, brand: r.brand, cat: r.category as WishCat, earned: r.status === "kazanildi" || r.status === "alindi" }))
    .filter((w): w is Wearable => !!w);
}

/** Kombini kaydeder; koku ışıltısı yalnız kazanılmış bir parfüm dileği varsa */
export async function saveOutfit(userId: string, raw: unknown, who: Who): Promise<Outfit> {
  const o = sanitizeOutfit(raw, who);
  if (o.scent && !(await wearablesOf(userId)).some((w) => w.slot === "scent" && w.earned)) o.scent = false;
  await sql()`
    insert into outfits (user_id, data, updated_at) values (${userId}, ${JSON.stringify(o)}::jsonb, now())
    on conflict (user_id) do update set data = excluded.data, updated_at = now()`;
  return o;
}

export const portraitLookOf = async (userId: string, who: Who): Promise<PortraitLook> => portraitLook(await outfitOf(userId, who));
