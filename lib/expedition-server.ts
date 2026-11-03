import "server-only";
import { randomUUID, randomInt } from "node:crypto";
import { sql } from "./db";
import { adventure } from "./xp-server";
import { todayIstanbul } from "./dates";
import { levelOf } from "./xp";
import { equipmentOf } from "./equipment-server";
import { advance, command, depart, emptyCampaign, joinRun, recover, startRun, type Campaign, type HeroInfo, type Input } from "./expedition";

export class ExpeditionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
type User = { id: string; accountId: string; displayName: string };
export type RequestCommand = { op: "poll" | "start" | "join" | "input" | "recover" | "leave"; region?: string; difficulty?: number; runId?: string; seq?: number; input?: Input };
export function parseCommand(body: unknown): RequestCommand | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!["poll", "start", "join", "input", "recover", "leave"].includes(b.op as string)) return null;
  const result: RequestCommand = { op: b.op as RequestCommand["op"] };
  if (b.op === "start") {
    if (typeof b.region !== "string" || !Number.isInteger(b.difficulty) || (b.difficulty as number) < 0 || (b.difficulty as number) > 2) return null;
    result.region = b.region; result.difficulty = b.difficulty as number;
  }
  if (["input", "recover", "leave", "join"].includes(result.op)) {
    if (typeof b.runId !== "string" || b.runId.length > 60) return null;
    result.runId = b.runId;
  }
  if (b.op === "input") {
    if (!Number.isSafeInteger(b.seq) || (b.seq as number) < 0 || !b.input || typeof b.input !== "object") return null;
    const i = b.input as Record<string, unknown>;
    if (typeof i.di !== "number" || !Number.isFinite(i.di) || Math.abs(i.di) > 1 || typeof i.dj !== "number" || !Number.isFinite(i.dj) || Math.abs(i.dj) > 1 || (i.spell !== null && (!Number.isInteger(i.spell) || (i.spell as number) < 0 || (i.spell as number) > 3))) return null;
    result.seq = b.seq as number;
    result.input = { di: i.di, dj: i.dj, spell: i.spell as number | null, attack: i.attack === true, dodge: i.dodge === true, interact: i.interact === true };
  }
  return result;
}

export async function readCampaign(accountId: string): Promise<Campaign> {
  try {
    const [row] = await sql()`select state from expedition_campaigns where account_id = ${accountId}`;
    return row?.state ?? emptyCampaign();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "42P01") throw new ExpeditionError("Macera bölümleri henüz hazırlanıyor. Veritabanı güncellemesi uygulanmalı.", 503);
    throw err;
  }
}
async function heroOf(user: User): Promise<HeroInfo> {
  const [adv, equipment] = await Promise.all([adventure(user.id, user.accountId, todayIstanbul()), equipmentOf(user.accountId)]);
  return { id: user.id, name: user.displayName, level: levelOf(adv.xp).level, equipment: equipment[user.id] };
}
/** Tek satırda sürüm kontrollü atomik değişiklik; modül belleği Vercel örnekleri arasında paylaşılmaz. */
export async function updateCampaign(user: User, request: RequestCommand): Promise<Campaign> {
  const hero = request.op === "start" || request.op === "join" ? await heroOf(user) : null;
  for (let attempt = 0; attempt < 8; attempt++) {
    let row;
    try { [row] = await sql()`select state, version from expedition_campaigns where account_id = ${user.accountId}`; }
    catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42P01") throw new ExpeditionError("Macera bölümleri henüz hazırlanıyor. Veritabanı güncellemesi uygulanmalı.", 503);
      throw err;
    }
    if (!row) {
      if (request.op === "poll") return emptyCampaign();
      if (request.op !== "start") throw new ExpeditionError("Önce bir sefere katıl.", 409);
      await sql()`insert into expedition_campaigns (account_id, state) values (${user.accountId}, ${JSON.stringify(emptyCampaign())}::jsonb) on conflict (account_id) do nothing`;
      continue;
    }
    const c = row.state as Campaign;
    const now = Date.now() / 1000;
    if (request.runId && request.runId !== c.run?.id) throw new ExpeditionError("Sefer değişti. Güncel sefere tekrar katıl.", 409);
    advance(c, now);
    let error: string | null = null;
    if (request.op === "start") error = startRun(c, request.region!, request.difficulty!, hero!, randomUUID(), randomInt(0, 1_000_000), now);
    else if (request.op === "join") error = joinRun(c, hero!, now);
    else if (request.op === "input") error = command(c, user.id, request.seq!, request.input!, now);
    else if (request.op === "recover") error = recover(c, user.id);
    else if (request.op === "leave") depart(c, user.id);
    if (error) throw new ExpeditionError(error, 409);
    const rows = await sql()`update expedition_campaigns set state = ${JSON.stringify(c)}::jsonb, version = version + 1, updated_at = now() where account_id = ${user.accountId} and version = ${row.version} returning version`;
    if (rows.length) return c;
  }
  throw new ExpeditionError("Yol arkadaşınla aynı anda işlem yapıldı; yeniden dene.", 409);
}
