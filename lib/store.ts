// Kayıt deposu: kişi + tarih bazında tikler, set sayıları ve su.
// shortcut: 2. aşamada tarayıcıda (localStorage) tutulur, 3. aşamada aynı arayüzle veritabanına bağlanacak.
"use client";

import { useSyncExternalStore } from "react";
import { CARE, CARE_GROUPS, MEALS, SPORT, WATER_TARGET } from "./plan";
import { weekday } from "./gun";
import type { Person } from "./scenes/types";

type DayRec = { done: string[]; sets: Record<string, number>; water: number };
type State = { v: 1; days: Record<string, Partial<Record<Person, DayRec>>> };

const KEY = "ikimizin-rutini-v1";
let state: State = { v: 1, days: {} };
const subs = new Set<() => void>();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch { /* gizli pencere vb.: boş başla */ }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* kaydedilemedi: oturum içinde kalır */ }
  subs.forEach((f) => f());
}
let loaded = false;
const subscribe = (f: () => void) => {
  if (!loaded && typeof window !== "undefined") { loaded = true; load(); }
  subs.add(f);
  return () => subs.delete(f);
};

// boş gün için sabit nesne: useSyncExternalStore her çağrıda aynı değeri görmeli
const EMPTY: DayRec = Object.freeze({ done: [], sets: {}, water: 0 }) as DayRec;
const rec = (date: string, who: Person): DayRec => state.days[date]?.[who] ?? EMPTY;
function put(date: string, who: Person, next: DayRec) {
  state = { ...state, days: { ...state.days, [date]: { ...state.days[date], [who]: next } } };
  save();
}

export const getDay = rec;
export function useDay(date: string, who: Person): DayRec {
  return useSyncExternalStore(subscribe, () => rec(date, who), () => rec(date, who));
}
export function useVersion() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function toggle(date: string, who: Person, id: string) {
  const r = rec(date, who);
  const done = r.done.includes(id) ? r.done.filter((x) => x !== id) : [...r.done, id];
  put(date, who, { ...r, done });
}
export function setSets(date: string, who: Person, exId: string, n: number) {
  const r = rec(date, who);
  put(date, who, { ...r, sets: { ...r.sets, [exId]: Math.max(0, n) } });
}
export function addWater(date: string, who: Person, delta: number) {
  const r = rec(date, who);
  put(date, who, { ...r, water: Math.max(0, Math.min(40, r.water + delta)) });
}

/* ------------------------------ planlanan işler ------------------------------ */
// O gün kişinin tamamlaması gerekenler: günlük bakım (sabah+akşam), öğünler, su hedefi ve o güne düşen spor hareketleri.
export type Task = { id: string; label: string; kind: "Bakım" | "Spor" | "Beslenme" | "Su" };

export function plannedTasks(date: string, who: Person): Task[] {
  const daily = CARE_GROUPS.filter((g) => g.daily).map((g) => g.id);
  const tasks: Task[] = CARE[who].filter((i) => daily.includes(i.group)).map((i) => ({ id: `care:${i.id}`, label: `${i.group === "sabah" ? "Sabah" : "Akşam"} · ${i.label}`, kind: "Bakım" as const }));
  const prog = SPORT[who];
  if (prog.days.includes(weekday(date))) tasks.push(...prog.items.map((e) => ({ id: `sport:${e.id}`, label: `${prog.title} · ${e.name}`, kind: "Spor" as const })));
  tasks.push(...MEALS[who].map((m) => ({ id: `meal:${m.id}`, label: m.label, kind: "Beslenme" as const })));
  tasks.push({ id: "water", label: `${WATER_TARGET} bardak su`, kind: "Su" });
  return tasks;
}

export function isDone(r: DayRec, who: Person, id: string): boolean {
  if (id === "water") return r.water >= WATER_TARGET;
  if (id.startsWith("sport:")) {
    const ex = SPORT[who].items.find((e) => `sport:${e.id}` === id);
    return !!ex && (r.sets[ex.id] ?? 0) >= ex.sets;
  }
  return r.done.includes(id);
}

// takvimden tek tıkla işaretleme: spor hareketini tamamla/geri al, suyu hedefe getir/sıfırla
export function toggleTask(date: string, who: Person, id: string) {
  const r = rec(date, who);
  if (id === "water") return put(date, who, { ...r, water: r.water >= WATER_TARGET ? 0 : WATER_TARGET });
  if (id.startsWith("sport:")) {
    const ex = SPORT[who].items.find((e) => `sport:${e.id}` === id)!;
    return setSets(date, who, ex.id, (r.sets[ex.id] ?? 0) >= ex.sets ? 0 : ex.sets);
  }
  toggle(date, who, id);
}

export function progress(date: string, who: Person) {
  const r = rec(date, who);
  const tasks = plannedTasks(date, who);
  const done = tasks.filter((t) => isDone(r, who, t.id)).length;
  return { done, total: tasks.length, full: tasks.length > 0 && done === tasks.length };
}
