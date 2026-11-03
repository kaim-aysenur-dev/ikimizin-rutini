import "server-only";
import { sql } from "./db";
import { type Equipment, NO_EQUIPMENT, sanitizeEquipment, toggleEquip } from "./equipment";
import { GEAR } from "./gear";
import { levelOf } from "./xp";

/** Hesaptaki herkesin kuşandıkları (ham; seviyeye göre temizlemeyi çağıran yapar) */
export async function equipmentOf(accountId: string): Promise<Record<string, Equipment>> {
  const rows = await sql()`
    select e.user_id, e.armor, e.weapon, e.spells from equipment e join users u on u.id = e.user_id
    where u.account_id = ${accountId}`;
  return Object.fromEntries(rows.map((r) => [r.user_id as string, { armor: r.armor, weapon: r.weapon, spells: r.spells ?? [] } as Equipment]));
}

export type EquipResult = { ok: true; equipment: Equipment } | { ok: false; status: number; error: string };

/** Eşyayı kuşanır ya da çıkarır; seviye sunucuda denetlenir */
export async function equip(user: { id: string; accountId: string }, xp: number, gearId: string): Promise<EquipResult> {
  const g = GEAR.find((x) => x.id === gearId);
  if (!g) return { ok: false, status: 400, error: "Böyle bir eşya yok." };
  const level = levelOf(xp).level;
  if (g.level > level) return { ok: false, status: 403, error: `Bu eşya seviye ${g.level}'de açılır.` };
  const [row] = await sql()`select armor, weapon, spells from equipment where user_id = ${user.id}`;
  const cur = sanitizeEquipment(row ?? NO_EQUIPMENT, level);
  const next = sanitizeEquipment(toggleEquip(cur, gearId), level);
  await sql()`
    insert into equipment (user_id, armor, weapon, spells, updated_at) values (${user.id}, ${next.armor}, ${next.weapon}, ${next.spells}, now())
    on conflict (user_id) do update set armor = excluded.armor, weapon = excluded.weapon, spells = excluded.spells, updated_at = now()`;
  return { ok: true, equipment: next };
}
