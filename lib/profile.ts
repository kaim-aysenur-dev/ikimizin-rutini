// Ortak hesapta aktif profil: Cengiz ya da Ayşenur. Şimdilik tarayıcıda tutulur; arka taraf bağlanınca oturuma taşınacak.
"use client";

import { useSyncExternalStore } from "react";
import type { Person } from "./scenes/types";

const KEY = "ikimizin-rutini-profile";
const subs = new Set<() => void>();

export function readProfile(): Person | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "cengiz" || v === "aysenur" ? v : null;
  } catch { return null; }
}

export function setProfile(p: Person) {
  try { localStorage.setItem(KEY, p); } catch { /* kaydedilemedi: oturum içinde geçerli */ }
  subs.forEach((f) => f());
}

export function useProfile(): Person | null {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, readProfile, () => null);
}
