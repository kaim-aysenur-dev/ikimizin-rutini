"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { gainXp } from "@/components/xp-badge";
import { XP } from "@/lib/xp";
import { todayIstanbul } from "@/lib/dates";
import { checkKey } from "@/lib/progress";
import { CHECK_EVENT } from "@/components/timers";

function withKey(set: Set<string>, key: string, on: boolean): Set<string> {
  if (set.has(key) === on) return set;
  const next = new Set(set);
  if (on) next.add(key);
  else next.delete(key);
  return next;
}

/** İşaretler: dokununca hemen değişir (iyimser), sunucuya sırayla yazılır, hata olursa geri alınır. */
export function useChecks(initial: string[]) {
  const [checked, setChecked] = useState(() => new Set(initial));
  const [error, setError] = useState<string | null>(null);
  const queues = useRef(new Map<string, Promise<void>>());

  // Süre doldu penceresinden gelen işaretler
  useEffect(() => {
    const onCheck = (event: Event) => {
      const { day, itemId, done } = (event as CustomEvent).detail;
      setChecked((prev) => withKey(prev, checkKey(day, itemId), done));
    };
    window.addEventListener(CHECK_EVENT, onCheck);
    return () => window.removeEventListener(CHECK_EVENT, onCheck);
  }, []);

  const setDone = useCallback((day: string, itemId: string, done: boolean) => {
    const key = checkKey(day, itemId);
    setChecked((prev) => withKey(prev, key, done));
    gainXp(done ? XP.check : -XP.check);
    const send = async () => {
      try {
        await api("/api/checks", { body: { day, itemId, done } });
      } catch (err) {
        setChecked((prev) => withKey(prev, key, !done));
        gainXp(done ? -XP.check : XP.check);
        setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      }
    };
    const chain = (queues.current.get(key) ?? Promise.resolve()).then(send);
    queues.current.set(key, chain);
  }, []);

  const clearError = useCallback(() => setError(null), []);
  return { checked, setDone, error, clearError };
}

/** Sayfa gece yarısını geçerek açık kalırsa "bugün"ü yeniler (İstanbul saatine göre). */
export function useDayRollover(today: string) {
  const router = useRouter();
  useEffect(() => {
    const check = () => {
      if (todayIstanbul() !== today) router.refresh();
    };
    const id = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [today, router]);
}
