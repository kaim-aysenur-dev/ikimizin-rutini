// Haftalık takip ve günlük ilerleme hesapları (sunucu ve tarayıcı ortak).
import { DAILY_SLOTS, type Slot } from "./slots";

/** since: adımın rutine eklendiği gün; öncesi "kaçırıldı" sayılmaz */
export type TrackItem = { id: string; slot: Slot; weeklyTarget: number | null; since?: string };

export const checkKey = (day: string, itemId: string) => `${day}|${itemId}`;

/**
 * Hücre durumu:
 * done = Yapıldı, missed = Yapılmadı (geçmiş gün, günlük adım), pending = Bekliyor (bugün),
 * upcoming = Sırada (gelecek, tıklanamaz), open = işaretsiz ama kaçırılmış sayılmaz (haftalık / gerektiğinde)
 */
export type CellState = "done" | "missed" | "pending" | "upcoming" | "open";

export function cellState(item: TrackItem, day: string, today: string, done: boolean): CellState {
  if (done) return "done";
  if (day > today) return "upcoming";
  if (!DAILY_SLOTS.includes(item.slot) || (item.since && day < item.since)) return "open";
  return day === today ? "pending" : "missed";
}

export type Summary = { done: number; missed: number; pending: number; upcoming: number; percent: number | null };

/** Haftanın özeti. "Gerektiğinde" adımları sayılmaz; haftalık hedefler hedef sayısı kadar birim sayılır. */
export function weekSummary(items: TrackItem[], days: string[], today: string, checked: Set<string>): Summary {
  const s = { done: 0, missed: 0, pending: 0, upcoming: 0 };
  for (const item of items) {
    if (DAILY_SLOTS.includes(item.slot)) {
      for (const day of days) {
        const state = cellState(item, day, today, checked.has(checkKey(day, item.id)));
        if (state === "done") s.done++;
        else if (state === "missed") s.missed++;
        else if (state === "pending") s.pending++;
        else if (state === "upcoming") s.upcoming++;
      }
    } else if (item.slot === "haftalik" && item.weeklyTarget) {
      const count = days.filter((d) => checked.has(checkKey(d, item.id))).length;
      const done = Math.min(count, item.weeklyTarget);
      const left = item.weeklyTarget - done;
      s.done += done;
      if (days[6]! < today) s.missed += left;
      else if (days[0]! > today) s.upcoming += left;
      else s.pending += left;
    }
  }
  const due = s.done + s.missed + s.pending;
  return { ...s, percent: due ? Math.round((s.done / due) * 100) : null };
}

/** Bir günün günlük adımları: kaçı tamam */
export function dayProgress(items: TrackItem[], day: string, checked: Set<string>) {
  const daily = items.filter((i) => DAILY_SLOTS.includes(i.slot));
  const done = daily.filter((i) => checked.has(checkKey(day, i.id))).length;
  return { done, total: daily.length, percent: daily.length ? Math.round((done / daily.length) * 100) : 0 };
}

export function weeklyCount(itemId: string, days: string[], checked: Set<string>): number {
  return days.filter((d) => checked.has(checkKey(d, itemId))).length;
}
