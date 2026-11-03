import "server-only";
import { sql } from "./db";
import { type Placed, canPlace } from "./room";
import { type Scope, itemById } from "./room-items";
import { levelOf } from "./xp";

export type Profile = { id: string; name: string };
export type Presence = { userId: string; x: number; y: number; dir: number; moving: boolean };

export async function profilesOf(accountId: string): Promise<Profile[]> {
  const rows = await sql()`select id, display_name from users where account_id = ${accountId} order by created_at`;
  return rows.map((r) => ({ id: r.id as string, name: r.display_name as string }));
}

/** Hesaptaki bütün yerleştirilmiş eşyalar: iki oda + ortak bahçe */
export async function placedOf(accountId: string): Promise<Placed[]> {
  const rows = await sql()`
    select p.id, p.user_id, p.item_id, p.scope, p.tx, p.ty
    from placed_items p join users u on u.id = p.user_id
    where u.account_id = ${accountId}`;
  return rows.map((r) => ({ id: r.id, userId: r.user_id, itemId: r.item_id, scope: r.scope, tx: r.tx, ty: r.ty }));
}

export type PlaceResult = { ok: true; item: Placed } | { ok: false; status: number; error: string };

/** Envanterden bir eşyayı kendi odasına ya da ortak bahçeye koyar. Seviye ve yer sunucuda doğrulanır. */
export async function placeItem(user: { id: string; accountId: string }, xp: number, itemId: string, scope: Scope, tx: number, ty: number): Promise<PlaceResult> {
  const it = itemById.get(itemId);
  if (!it || it.scope !== scope) return { ok: false, status: 400, error: "Bu eşya buraya konamaz." };
  if (it.level > levelOf(xp).level) return { ok: false, status: 403, error: `Bu eşya seviye ${it.level}'de açılır.` };
  const all = await placedOf(user.accountId);
  if (all.some((p) => p.userId === user.id && p.itemId === itemId)) return { ok: false, status: 409, error: "Bu eşya zaten yerleştirilmiş." };
  // odada yalnız kendi eşyaların, bahçede herkesinki engel sayılır
  const around = all.filter((p) => (scope === "oda" ? p.scope === "oda" && p.userId === user.id : p.scope === "bahce"));
  if (!canPlace(scope, itemId, tx, ty, around)) return { ok: false, status: 409, error: "Bu kare dolu ya da kapı önünde." };
  const [r] = await sql()`
    insert into placed_items (user_id, item_id, scope, tx, ty) values (${user.id}, ${itemId}, ${scope}, ${tx}, ${ty})
    on conflict (user_id, item_id) do nothing returning id`;
  if (!r) return { ok: false, status: 409, error: "Bu eşya zaten yerleştirilmiş." };
  return { ok: true, item: { id: r.id, userId: user.id, itemId, scope, tx, ty } };
}

/** Kişi yalnız kendi koyduğu eşyayı envantere geri alabilir */
export async function removeItem(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`delete from placed_items where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

/** Bahçedeki konumu yazar, aynı hesaptaki diğerlerinin son birkaç saniyedeki konumunu döndürür */
export async function syncPresence(user: { id: string; accountId: string }, p: Omit<Presence, "userId"> | null): Promise<Presence[]> {
  if (p) {
    await sql()`
      insert into garden_presence (user_id, x, y, dir, moving, updated_at) values (${user.id}, ${p.x}, ${p.y}, ${p.dir}, ${p.moving}, now())
      on conflict (user_id) do update set x = excluded.x, y = excluded.y, dir = excluded.dir, moving = excluded.moving, updated_at = now()`;
  } else {
    await sql()`delete from garden_presence where user_id = ${user.id}`;
  }
  const rows = await sql()`
    select g.user_id, g.x, g.y, g.dir, g.moving from garden_presence g join users u on u.id = g.user_id
    where u.account_id = ${user.accountId} and g.user_id <> ${user.id} and g.updated_at > now() - interval '6 seconds'`;
  return rows.map((r) => ({ userId: r.user_id, x: r.x, y: r.y, dir: r.dir, moving: r.moving }));
}
