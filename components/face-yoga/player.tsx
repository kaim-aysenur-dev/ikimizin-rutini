"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { gainXp } from "@/components/xp-badge";
import { XP } from "@/lib/xp";
import { AREA_LABEL, type FaceExercise } from "@/lib/face-yoga-shared";
import { formatClock } from "@/lib/slots";

type Props = {
  practiceId: string;
  title: string;
  exercises: FaceExercise[];
  canSave: boolean;
  onClose: () => void;
  onSaved: () => void;
};

let audio: AudioContext | null = null;

/** Egzersiz geçişinde kısa bir ses; tarayıcı sesi ancak bir dokunuştan sonra açar. */
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    audio = null;
  }
}

function chime(frequency: number) {
  if (audio) {
    const at = audio.currentTime + 0.02;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + 0.45);
  }
  try {
    navigator.vibrate?.(200);
  } catch {}
}

/** Rehberli seans: egzersizler sırayla, her biri kendi süresiyle; süre bitince sıradakine geçer. */
export function FaceYogaPlayer({ practiceId, title, exercises, canSave, onClose, onSaved }: Props) {
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(exercises[0]!.seconds);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [spent, setSpent] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  const exercise = exercises[index]!;
  const next = exercises[index + 1];
  const running = endsAt !== null && !done;

  /** Mevcut egzersizde geçen süreyi toplama ekleyip başka egzersize geçer */
  const goTo = useCallback(
    (target: number, keepRunning: boolean) => {
      setSpent((s) => s + (exercise.seconds - remaining));
      if (target >= exercises.length) {
        setEndsAt(null);
        setDone(true);
        return;
      }
      const seconds = exercises[target]!.seconds;
      setIndex(target);
      setRemaining(seconds);
      setEndsAt(keepRunning ? Date.now() + seconds * 1000 : null);
    },
    [exercise.seconds, exercises, remaining],
  );

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const left = Math.max(0, (endsAt - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) {
        chime(index + 1 >= exercises.length ? 1320 : 880);
        goTo(index + 1, true);
      }
    };
    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [endsAt, index, exercises.length, goTo]);

  // seans sürerken ekran kararmasın
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (running && !wakeLock.current && nav.wakeLock) {
      nav.wakeLock.request("screen").then((lock) => (wakeLock.current = lock)).catch(() => {});
    } else if (!running && wakeLock.current) {
      void wakeLock.current.release().catch(() => {});
      wakeLock.current = null;
    }
  }, [running]);

  useEffect(
    () => () => {
      void wakeLock.current?.release().catch(() => {});
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle() {
    unlockAudio();
    if (running) {
      setEndsAt(null);
    } else {
      setEndsAt(Date.now() + remaining * 1000);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/face-yoga/sessions", { body: { routine: practiceId, seconds: Math.max(10, Math.round(spent)) } });
      gainXp(XP.faceYoga);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }

  const percent = Math.round(((exercise.seconds - remaining) / exercise.seconds) * 100);

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal fy-player" role="dialog" aria-modal="true" aria-labelledby="fy-player-title">
        <div className="row fy-player-head">
          <span className="grow">
            <span className="eyebrow">{title}</span>
            <span className="muted small num">
              {done ? "Tamamlandı" : `${index + 1} / ${exercises.length}`}
            </span>
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Seansı kapat">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="stack fy-done">
            <span className="timer-done-icon">
              <Check size={30} strokeWidth={3} />
            </span>
            <h2 id="fy-player-title">Eline sağlık</h2>
            <p className="muted">
              {exercises.length > 1 ? `${exercises.length} egzersiz, ` : ""}
              {formatClock(spent)} sürdü.
            </p>
            {error && <p className="form-error">{error}</p>}
            {canSave ? (
              <button type="button" className="btn btn-primary btn-block btn-lg" onClick={save} disabled={busy || spent < 10}>
                <Check size={18} /> Bugüne kaydet
              </button>
            ) : (
              <p className="muted small">Takip henüz açık değil; seans kaydedilmedi.</p>
            )}
            <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>
              Kapat
            </button>
          </div>
        ) : (
          <>
            <ol className="fy-progress" aria-hidden="true">
              {exercises.map((e, i) => (
                <li key={e.id} className={i < index ? "past" : i === index ? "current" : undefined} />
              ))}
            </ol>

            <div className="fy-now">
              <div className="ring fy-ring" style={{ "--p": percent } as React.CSSProperties}>
                <span className="num" role="timer" aria-live="off">
                  {formatClock(remaining)}
                </span>
              </div>
              <div className="stack fy-now-text">
                <span className="muted small">{AREA_LABEL[exercise.area]}</span>
                <h2 id="fy-player-title">{exercise.name}</h2>
              </div>
            </div>

            <ol className="fy-steps">
              {exercise.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="muted small fy-tip">{exercise.tip}</p>

            <div className="row fy-controls">
              <button type="button" className="icon-btn" onClick={() => goTo(index - 1, running)} disabled={index === 0} aria-label="Önceki egzersiz">
                <ChevronLeft size={20} />
              </button>
              <button type="button" className="btn btn-primary btn-lg grow" onClick={toggle}>
                {running ? (
                  <>
                    <Pause size={18} /> Duraklat
                  </>
                ) : (
                  <>
                    <Play size={18} /> {remaining < exercise.seconds ? "Devam et" : "Başlat"}
                  </>
                )}
              </button>
              <button type="button" className="icon-btn" onClick={() => goTo(index + 1, running)} aria-label={next ? "Sonraki egzersiz" : "Seansı bitir"}>
                <ChevronRight size={20} />
              </button>
            </div>
            <p className="muted small fy-next">{next ? `Sıradaki: ${next.name}` : "Son egzersiz"}</p>
          </>
        )}
      </div>
    </div>
  );
}
