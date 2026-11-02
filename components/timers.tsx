"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BellRing, Check, Square, Timer as TimerIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { gainXp } from "@/components/xp-badge";
import { XP } from "@/lib/xp";
import { formatClock } from "@/lib/slots";

// Beklemeli adımlar için geri sayım. Sayaçlar kabukta yaşar; sayfa değişince durmaz,
// sayfa yenilenince tarayıcı belleğinden geri yüklenir.

/** markable: süre bitince "Yapıldı" olarak işaretlenebilir (dinlenme sayaçlarında false) */
export type RunningTimer = { itemId: string; day: string; label: string; endsAt: number; total: number; markable?: boolean };

type TimerApi = {
  timers: RunningTimer[];
  now: number;
  start: (t: { itemId: string; day: string; label: string; seconds: number; markable?: boolean }) => void;
  stop: (itemId: string) => void;
};

const TimerContext = createContext<TimerApi | null>(null);
const STORAGE_KEY = "rutin-sayaclar";
export const CHECK_EVENT = "rutin:isaret";

export function useTimers(): TimerApi {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimers TimerProvider içinde kullanılmalı");
  return ctx;
}

/* ---------- ses ---------- */

let audio: AudioContext | null = null;

/** Tarayıcılar sesi ancak bir dokunuştan sonra açar; "Başlat"a basınca hazırlanır. */
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    audio = null;
  }
}

function beep(at: number, frequency: number) {
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  osc.connect(gain).connect(audio.destination);
  osc.start(at);
  osc.stop(at + 0.25);
}

function playAlarm() {
  unlockAudio();
  if (audio) {
    const t = audio.currentTime + 0.05;
    beep(t, 880);
    beep(t + 0.3, 880);
    beep(t + 0.6, 1320);
  }
  try {
    navigator.vibrate?.([300, 120, 300, 120, 500]);
  } catch {}
}

/* ---------- sağlayıcı ---------- */

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [finished, setFinished] = useState<RunningTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [restored, setRestored] = useState(false);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  // tarayıcı belleğinden geri yükle
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(saved)) setTimers(saved.filter((t) => typeof t?.endsAt === "number"));
    } catch {}
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
    } catch {}
  }, [timers, restored]);

  // her yarım saniyede bir kontrol; sekmeye geri dönülünce de hemen
  useEffect(() => {
    if (!timers.length) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const due = timers.filter((x) => x.endsAt <= t);
      if (due.length) {
        setTimers((prev) => prev.filter((x) => x.endsAt > t));
        setFinished((prev) => [...prev, ...due]);
        playAlarm();
      }
    };
    tick();
    const id = window.setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [timers]);

  // Kısa sayaçlarda (20 dk'ya kadar) ekran kararmasın
  useEffect(() => {
    const shortRunning = timers.some((t) => t.total <= 20 * 60);
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (shortRunning && !wakeLock.current && nav.wakeLock && document.visibilityState === "visible") {
      nav.wakeLock.request("screen").then((lock) => (wakeLock.current = lock)).catch(() => {});
    } else if (!shortRunning && wakeLock.current) {
      void wakeLock.current.release().catch(() => {});
      wakeLock.current = null;
    }
  }, [timers]);

  // uyarı açıkken birkaç kez daha çal
  useEffect(() => {
    if (!finished.length) return;
    let count = 0;
    const id = window.setInterval(() => {
      if (++count > 6) return window.clearInterval(id);
      playAlarm();
    }, 4000);
    return () => window.clearInterval(id);
  }, [finished.length]);

  const start = useCallback((t: { itemId: string; day: string; label: string; seconds: number; markable?: boolean }) => {
    unlockAudio();
    const endsAt = Date.now() + t.seconds * 1000;
    setNow(Date.now());
    setTimers((prev) => [
      ...prev.filter((x) => x.itemId !== t.itemId),
      { itemId: t.itemId, day: t.day, label: t.label, endsAt, total: t.seconds, markable: t.markable ?? true },
    ]);
  }, []);

  const stop = useCallback((itemId: string) => setTimers((prev) => prev.filter((x) => x.itemId !== itemId)), []);

  const value = useMemo(() => ({ timers, now, start, stop }), [timers, now, start, stop]);
  const current = finished[0];

  return (
    <TimerContext.Provider value={value}>
      {children}
      <TimerDock />
      {current && <FinishedDialog timer={current} onClose={() => setFinished((prev) => prev.slice(1))} />}
    </TimerContext.Provider>
  );
}

/* ---------- süre doldu uyarısı ---------- */

function FinishedDialog({ timer, onClose }: { timer: RunningTimer; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const original = document.title;
    document.title = `⏰ Süre doldu · ${timer.label}`;
    return () => {
      document.title = original;
    };
  }, [timer.label]);

  async function markDone() {
    setBusy(true);
    try {
      await api("/api/checks", { body: { day: timer.day, itemId: timer.itemId, done: true } });
      gainXp(XP.check);
      window.dispatchEvent(new CustomEvent(CHECK_EVENT, { detail: { day: timer.day, itemId: timer.itemId, done: true } }));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşaretlenemedi.");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal timer-done" role="alertdialog" aria-modal="true" aria-labelledby="timer-done-title">
        <span className="timer-done-icon">
          <BellRing size={30} />
        </span>
        <h2 id="timer-done-title">Süre doldu</h2>
        <p className="timer-done-label">{timer.label}</p>
        <p className="muted">{formatClock(timer.total)} tamamlandı.</p>
        {error && <p className="form-error">{error}</p>}
        <div className="stack" style={{ marginTop: 16 }}>
          {timer.markable !== false && (
            <button type="button" className="btn btn-primary btn-block btn-lg" onClick={markDone} disabled={busy}>
              <Check size={18} /> Yapıldı olarak işaretle
            </button>
          )}
          <button ref={closeRef} type="button" className={`btn btn-block ${timer.markable === false ? "btn-primary btn-lg" : "btn-ghost"}`} onClick={onClose}>
            {timer.markable === false ? "Tamam, devam" : "Kapat"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- başka sayfadayken çalışan sayaçlar ---------- */

function TimerDock() {
  const { timers, now, stop } = useTimers();
  const pathname = usePathname();
  if (!timers.length || pathname === "/bugun") return null;
  return (
    <div className="timer-dock" role="status" aria-live="off">
      {timers.map((t) => (
        <div key={t.itemId} className="timer-chip">
          <TimerIcon size={16} aria-hidden="true" />
          <span className="timer-chip-label">{t.label}</span>
          <span className="num">{formatClock((t.endsAt - now) / 1000)}</span>
          <button type="button" onClick={() => stop(t.itemId)} aria-label={`${t.label} sayacını durdur`}>
            <Square size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
