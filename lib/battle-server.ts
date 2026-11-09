import "server-only";
import { sql } from "./db";
import { GHOSTS_PER_NIGHT, GHOST_XP, REPEAT_SHARE, stageById } from "./dungeon";
import { levelOf } from "./xp";

export type BattleLog = { cleared: number[]; today: number[]; ghostsToday: number[] };

/** Kişinin zindan geçmişi: en az bir kez geçtiği bölümler, bugün ödülünü aldıkları ve bugün kovduğu hayaletler */
export async function battleLog(userId: string, today: string): Promise<BattleLog> {
  const rows = await sql()`select kind, ref, to_char(day, 'YYYY-MM-DD') as day from battle_rewards where user_id = ${userId}`;
  const z = rows.filter((r) => r.kind === "zindan"), h = rows.filter((r) => r.kind === "hayalet" && r.day === today);
  return { cleared: [...new Set(z.map((r) => r.ref as number))], today: z.filter((r) => r.day === today).map((r) => r.ref as number), ghostsToday: h.map((r) => r.ref as number) };
}

/** İstanbul saatine göre gece mi (hayaletler yalnız gece çıkar) */
function nightNow(): boolean {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return h >= 19 || h < 7;
}

export type ClaimResult = { ok: true; xp: number; first: boolean } | { ok: false; status: number; error: string };

/** Ödül: bölüm seviyesi ve gece kuralı sunucuda denetlenir; aynı gün aynı ödül ikinci kez verilmez (xp 0 döner) */
export async function claim(user: { id: string }, xp: number, kind: "zindan" | "hayalet", ref: number, today: string): Promise<ClaimResult> {
  let gain: number, first = false;
  if (kind === "zindan") {
    const st = stageById(ref);
    if (!st) return { ok: false, status: 400, error: "Böyle bir bölüm yok." };
    if (levelOf(xp).level < st.level) return { ok: false, status: 403, error: `Bu bölüm seviye ${st.level}'de açılır.` };
    const [prev] = await sql()`select 1 from battle_rewards where user_id = ${user.id} and kind = 'zindan' and ref = ${ref} limit 1`;
    first = !prev;
    gain = first ? st.xp : Math.round(st.xp * REPEAT_SHARE);
  } else {
    if (!Number.isInteger(ref) || ref < 0 || ref >= GHOSTS_PER_NIGHT) return { ok: false, status: 400, error: "Geçersiz hayalet." };
    if (!nightNow()) return { ok: false, status: 409, error: "Hayaletler yalnız gece çıkar." };
    gain = GHOST_XP;
  }
  const [r] = await sql()`
    insert into battle_rewards (user_id, kind, ref, day, xp) values (${user.id}, ${kind}, ${ref}, ${today}, ${gain})
    on conflict (user_id, kind, ref, day) do nothing returning xp`;
  return { ok: true, xp: r ? (r.xp as number) : 0, first };
}
