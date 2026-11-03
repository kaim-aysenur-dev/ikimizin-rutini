import "server-only";
import { sql } from "./db";
import { type Placed, canPlace, maxCopies } from "./room";
import { type Scope, itemById } from "./room-items";
import { levelOf } from "./xp";

export type Profile = { id: string; name: string };
export type Presence = { userId: string; x: number; y: number; dir: number; moving: boolean };
// place: "bahce" ya da "ev:<ev sahibinin kimliği>"; yalnız aynı yerdekiler birbirini görür

export async function profilesOf(accountId: string): Promise<Profile[]> {
  const rows = await sql()`select id, display_name from users where account_id = ${accountId} order by created_at`;
  return rows.map((r) => ({ id: r.id as string, name: r.display_name as string }));
}

/** Hesaptaki bütün yerleştirilmiş eşyalar: iki oda + ortak bahçe */
export async function placedOf(accountId: string): Promise<Placed[]> {
  const rows = await sql()`
    select p.id, p.user_id, p.item_id, p.scope, p.tx, p.ty, p.rot
    from placed_items p join users u on u.id = p.user_id
    where u.account_id = ${accountId}`;
  return rows.map((r) => ({ id: r.id, userId: r.user_id, itemId: r.item_id, scope: r.scope, tx: r.tx, ty: r.ty, rot: r.rot }));
}

export type PlaceResult = { ok: true; item: Placed } | { ok: false; status: number; error: string };

/** Envanterden bir eşyayı kendi odasına ya da ortak bahçeye koyar. Seviye ve yer sunucuda doğrulanır. */
export async function placeItem(user: { id: string; accountId: string }, xp: number, itemId: string, scope: Scope, tx: number, ty: number, rot = 0): Promise<PlaceResult> {
  const it = itemById.get(itemId);
  if (!it || it.scope !== scope) return { ok: false, status: 400, error: "Bu eşya buraya konamaz." };
  if (it.level > levelOf(xp).level) return { ok: false, status: 403, error: `Bu eşya seviye ${it.level}'de açılır.` };
  const all = await placedOf(user.accountId);
  if (all.filter((p) => p.userId === user.id && p.itemId === itemId).length >= maxCopies(itemId)) return { ok: false, status: 409, error: `Bu eşyadan en çok ${maxCopies(itemId)} tane konabilir.` };
  // odada yalnız kendi eşyaların, bahçede herkesinki engel sayılır
  const around = all.filter((p) => (scope === "oda" ? p.scope === "oda" && p.userId === user.id : p.scope === "bahce"));
  if (!canPlace(scope, itemId, tx, ty, around, rot)) return { ok: false, status: 409, error: "Bu kare dolu ya da kapı önünde." };
  const [r] = await sql()`
    insert into placed_items (user_id, item_id, scope, tx, ty, rot) values (${user.id}, ${itemId}, ${scope}, ${tx}, ${ty}, ${rot}) returning id`;
  return { ok: true, item: { id: r.id, userId: user.id, itemId, scope, tx, ty, rot } };
}

/** Yerleştirilmiş eşyayı döndürür; döndürülmüş hali sığmıyorsa reddeder */
export async function rotateItem(user: { id: string; accountId: string }, id: string): Promise<PlaceResult> {
  const all = await placedOf(user.accountId);
  const p = all.find((q) => q.id === id && q.userId === user.id);
  if (!p) return { ok: false, status: 404, error: "Eşya bulunamadı." };
  const rot = p.rot ? 0 : 1;
  const around = all.filter((q) => q.id !== id && (p.scope === "oda" ? q.scope === "oda" && q.userId === user.id : q.scope === "bahce"));
  if (!canPlace(p.scope, p.itemId, p.tx, p.ty, around, rot)) return { ok: false, status: 409, error: "Döndürünce sığmıyor: duvara ya da başka eşyaya değiyor." };
  await sql()`update placed_items set rot = ${rot} where id = ${id} and user_id = ${user.id}`;
  return { ok: true, item: { ...p, rot } };
}

/** Kişi yalnız kendi koyduğu eşyayı envantere geri alabilir */
export async function removeItem(userId: string, id: string): Promise<boolean> {
  const rows = await sql()`delete from placed_items where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

/** Konumu yazar; aynı hesapta, aynı yerde olan diğerlerinin son birkaç saniyedeki konumunu döndürür */
export async function syncPresence(user: { id: string; accountId: string }, place: string, p: Omit<Presence, "userId"> | null): Promise<Presence[]> {
  if (p) {
    await sql()`
      insert into garden_presence (user_id, place, x, y, dir, moving, updated_at) values (${user.id}, ${place}, ${p.x}, ${p.y}, ${p.dir}, ${p.moving}, now())
      on conflict (user_id) do update set place = excluded.place, x = excluded.x, y = excluded.y, dir = excluded.dir, moving = excluded.moving, updated_at = now()`;
  } else {
    await sql()`delete from garden_presence where user_id = ${user.id}`;
  }
  const rows = await sql()`
    select g.user_id, g.x, g.y, g.dir, g.moving from garden_presence g join users u on u.id = g.user_id
    where u.account_id = ${user.accountId} and g.user_id <> ${user.id} and g.place = ${place} and g.updated_at > now() - interval '6 seconds'`;
  return rows.map((r) => ({ userId: r.user_id, x: r.x, y: r.y, dir: r.dir, moving: r.moving }));
}

/* ------------------------------- posta kutusu ------------------------------- */

export type Note = { id: string; body: string; createdAt: string; mine: boolean; read: boolean };

/** Aynı hesaptaki diğer profil (notun gideceği kişi) */
async function partnerOf(user: { id: string; accountId: string }): Promise<string | null> {
  const [r] = await sql()`select id from users where account_id = ${user.accountId} and id <> ${user.id} order by created_at limit 1`;
  return r?.id ?? null;
}

/** Son notlar (gelen ve giden); gelenleri okundu sayar */
export async function notesOf(user: { id: string; accountId: string }): Promise<Note[]> {
  const rows = await sql()`
    select n.id, n.body, n.created_at, n.from_user = ${user.id} as mine, n.read_at is not null as read
    from love_notes n join users u on u.id = n.from_user
    where u.account_id = ${user.accountId} and (n.to_user = ${user.id} or n.from_user = ${user.id})
    order by n.created_at desc limit 40`;
  await sql()`update love_notes set read_at = now() where to_user = ${user.id} and read_at is null`;
  return rows.map((r) => ({ id: r.id, body: r.body, createdAt: new Date(r.created_at).toISOString(), mine: r.mine, read: r.read }));
}

export async function sendNote(user: { id: string; accountId: string }, body: string): Promise<boolean> {
  const to = await partnerOf(user);
  if (!to) return false;
  await sql()`insert into love_notes (from_user, to_user, body) values (${user.id}, ${to}, ${body})`;
  return true;
}

export async function unreadNotes(userId: string): Promise<number> {
  const [r] = await sql()`select count(*)::int as n from love_notes where to_user = ${userId} and read_at is null`;
  return r.n as number;
}
