// Dövüşün görsel olayları: kısa geçmiş, tek seferlik oynatma ve hasarsız uzak efektler.
import { type Effect } from "./combat";

export type Action = { kind: "vurus" | "buyu" | "emote"; id: string; at: number; effects?: Effect[]; recent?: Action[] };
export const ACTION_TTL = 6000;
const MAX_ACTIONS = 32;
const KINDS = new Set(["vurus", "kivilcim", "ok", "kalkani", "muhru", "yagmuru", "patlamasi", "sifa", "ejder", "iki-kalp", "hasar", "sifa-sayi"]);
const bounded = (v: unknown, limit: number): v is number => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limit;

/** Süreler göndericinin performance.now saatinden bağımsız taşınır. */
export function captureAction(kind: Action["kind"], id: string, at: number, fx: Effect[]): Action {
  const start = fx[0]?.at ?? 0; // emote'un efekti yok
  return { kind, id, at, effects: fx.map((e) => ({ ...e, at: 0, until: e.until - start })) };
}

/** Yalnız sınırlı görsel veriler kabul edilir; istemci hasarı ağa taşınmaz. */
export function parseAction(input: unknown): Action | null {
  if (!input || typeof input !== "object") return null;
  const a = input as Record<string, unknown>;
  if ((a.kind !== "vurus" && a.kind !== "buyu" && a.kind !== "emote") || typeof a.id !== "string" || a.id.length > 60 || !bounded(a.at, Number.MAX_SAFE_INTEGER)) return null;
  const result: Action = { kind: a.kind, id: a.id, at: a.at };
  if (Array.isArray(a.effects)) {
    result.effects = a.effects.slice(0, 64).flatMap((raw): Effect[] => {
      if (!raw || typeof raw !== "object") return [];
      const e = raw as Record<string, unknown>;
      if (!KINDS.has(e.kind as string) || !bounded(e.i, 200) || !bounded(e.j, 200) || (e.dir !== 1 && e.dir !== -1) || !bounded(e.until, 10) || e.until <= 0) return [];
      const fx: Effect = { kind: e.kind as Effect["kind"], i: e.i, j: e.j, dir: e.dir, at: 0, until: e.until };
      for (const key of ["vi", "vj", "value", "step"] as const) if (bounded(e[key], 10000)) fx[key] = e[key];
      if (typeof e.color === "string" && e.color.length <= 60) fx.color = e.color;
      if (typeof e.style === "string" && e.style.length <= 20) fx.style = e.style;
      return [fx];
    });
  }
  return result;
}

export function parseActionHistory(input: unknown): Action | null {
  const a = parseAction(input);
  if (!a) return null;
  const recent = (input as Action).recent;
  return { ...a, recent: Array.isArray(recent) ? recent.slice(-MAX_ACTIONS).flatMap((e) => { const p = parseAction(e); return p ? [p] : []; }) : [a] };
}

export function actionHistory(actions: Action[], now: number): Action | null {
  const recent = actions.filter((a) => now - a.at < ACTION_TTL).slice(-MAX_ACTIONS);
  return recent.length ? { ...recent[recent.length - 1], recent } : null;
}

/** İlk yeni saldırı da oynar; girişten önceki ve daha önce görülen saldırılar oynatılmaz. */
export function unseenActions(action: Action | null | undefined, seen: Set<number>, joinedAt: number): Action[] {
  const out: Action[] = [];
  for (const a of action?.recent ?? (action ? [action] : [])) {
    if (seen.has(a.at)) continue;
    seen.add(a.at);
    if (a.at >= joinedAt) out.push(a);
  }
  while (seen.size > 128) seen.delete(seen.values().next().value!);
  return out;
}

export function replayEffects(action: Action, now: number): Effect[] {
  return (action.effects ?? []).map((e) => ({ ...e, at: now, until: now + e.until, damage: undefined, visualOnly: true }));
}
