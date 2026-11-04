import "server-only";
import { sql } from "./db";
import { type Equipment, NO_EQUIPMENT, sanitizeEquipment, toggleEquip } from "./equipment";
import { GEAR } from "./gear";
import { levelOf } from "./xp";

/** Hesaptaki herkesin kuşandıkları (ham; seviyeye göre temizlemeyi çağıran yapar) */
export async function equipmentOf(accountId: string): Promise<Record<string, Equipment>> {
  const rows = await sql()`
    select e.user_id, e.armor, e.helmet, e.shield, e.cape, e.gloves, e.boots, e.trinket, e.weapon, e.spells from equipment e join users u on u.id = e.user_id
    where u.account_id = ${accountId}`;
  return Object.fromEntries(rows.map((r) => [r.user_id as string, rowToEquipment(r)]));
}

/** Kayıt satırı → kuşanma (temizlenmemiş) */
export const rowToEquipment = (r: Record<string, unknown>): Equipment => ({
  armor: (r.armor as string) ?? null, helmet: (r.helmet as string) ?? null, shield: (r.shield as string) ?? null, cape: (r.cape as string) ?? null,
  gloves: (r.gloves as string) ?? null, boots: (r.boots as string) ?? null, trinket: (r.trinket as string) ?? null, weapon: (r.weapon as string) ?? null, spells: (r.spells as string[]) ?? [],
});

export type EquipResult = { ok: true; equipment: Equipment } | { ok: false; status: number; error: string };

/** Eşyayı kuşanır ya da çıkarır; seviye sunucuda denetlenir */
export async function equip(user: { id: string; accountId: string }, xp: number, gearId: string): Promise<EquipResult> {
  const g = GEAR.find((x) => x.id === gearId);
  if (!g) return { ok: false, status: 400, error: "Böyle bir eşya yok." };
  const level = levelOf(xp).level;
  if (g.level > level) return { ok: false, status: 403, error: `Bu eşya seviye ${g.level}'de açılır.` };
  const [row] = await sql()`select armor, helmet, shield, cape, gloves, boots, trinket, weapon, spells from equipment where user_id = ${user.id}`;
  const cur = sanitizeEquipment(row ?? NO_EQUIPMENT, level);
  const n = sanitizeEquipment(toggleEquip(cur, gearId), level);
  await sql()`
    insert into equipment (user_id, armor, helmet, shield, cape, gloves, boots, trinket, weapon, spells, updated_at)
    values (${user.id}, ${n.armor}, ${n.helmet}, ${n.shield}, ${n.cape}, ${n.gloves}, ${n.boots}, ${n.trinket}, ${n.weapon}, ${n.spells}, now())
    on conflict (user_id) do update set armor = excluded.armor, helmet = excluded.helmet, shield = excluded.shield, cape = excluded.cape,
      gloves = excluded.gloves, boots = excluded.boots, trinket = excluded.trinket, weapon = excluded.weapon, spells = excluded.spells, updated_at = now()`;
  const next = n;
  return { ok: true, equipment: next };
}
