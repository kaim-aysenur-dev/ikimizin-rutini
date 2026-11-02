"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Flame, Info, Play, Trash } from "lucide-react";
import { FaceYogaPlayer } from "@/components/face-yoga/player";
import { Toast } from "@/components/toast";
import { api } from "@/lib/api-client";
import { gainXp } from "@/components/xp-badge";
import { XP } from "@/lib/xp";
import { WEEKDAY_SHORT, diffDays, formatDayShort, weekdayIndex } from "@/lib/dates";
import {
  AREA_LABEL,
  EXERCISES,
  ROUTINES,
  practiceName,
  routineExercises,
  routineSeconds,
  type FaceArea,
  type FaceExercise,
  type FaceYogaOverview,
} from "@/lib/face-yoga-shared";
import { formatDuration } from "@/lib/slots";

type Props = { today: string; overview: FaceYogaOverview | null };
type Practice = { id: string; title: string; exercises: FaceExercise[] };

const AREAS = Object.keys(AREA_LABEL) as FaceArea[];

function relativeDay(day: string, today: string): string {
  const d = diffDays(today, day);
  if (d === 0) return "Bugün";
  if (d === 1) return "Dün";
  if (d < 7) return WEEKDAY_SHORT[weekdayIndex(day)]!;
  return formatDayShort(day);
}

/** Cilt · Yüz yogası: haftalık takip, hazır rutinler ve egzersiz kütüphanesi */
export function FaceYogaView({ today, overview }: Props) {
  const router = useRouter();
  const [playing, setPlaying] = useState<Practice | null>(null);
  const [area, setArea] = useState<FaceArea | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const clear = useCallback(() => setMessage(null), []);
  const close = useCallback(() => setPlaying(null), []);

  const doneDays = overview?.week.filter((d) => d.seconds > 0).length ?? 0;
  const weekMinutes = Math.round((overview?.week.reduce((sum, d) => sum + d.seconds, 0) ?? 0) / 60);
  const doneToday = overview?.week.some((d) => d.day === today && d.seconds > 0) ?? false;
  const shown = area ? EXERCISES.filter((e) => e.area === area) : EXERCISES;

  async function remove(id: string) {
    setConfirmId(null);
    try {
      await api(`/api/face-yoga/sessions/${id}`, { method: "DELETE" });
      gainXp(-XP.faceYoga);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  return (
    <div className="stack section-stack">
      {overview ? (
        <section className="card stack" aria-label="Bu hafta">
          <div className="goal">
            <div className="ring" style={{ "--p": Math.round((doneDays / 7) * 100) } as React.CSSProperties}>
              <span className="num">
                {doneDays}
                <small>/7</small>
              </span>
            </div>
            <div className="goal-text">
              <strong>{doneToday ? "Bugünkü yüz yogası tamam" : "Bugün birkaç dakika ayır"}</strong>
              <span className="muted small">
                Bu hafta {doneDays} gün{weekMinutes > 0 ? ` · ${weekMinutes} dk` : ""}
              </span>
              {overview.streak > 1 && (
                <span className="goal-badge">
                  <Flame size={13} aria-hidden="true" />
                  {overview.streak} gündür aralıksız
                </span>
              )}
            </div>
          </div>
          <ol className="week-strip" aria-label="Bu haftanın günleri">
            {overview.week.map((d, i) => (
              <li key={d.day} className={d.day === today ? "is-today" : undefined}>
                <span>{WEEKDAY_SHORT[i]}</span>
                <span className={`day-mark${d.seconds ? " on" : ""}`} data-color="week">
                  {d.seconds ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : null}
                  <span className="sr-only">{d.seconds ? "yapıldı" : "yok"}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="notice warn">
          <Info size={18} aria-hidden="true" />
          <span>Takip için veritabanı güncellemesi bekleniyor. Seansları yine de yapabilirsin; yalnızca kaydedilmez.</span>
        </p>
      )}

      <section className="stack" aria-labelledby="fy-rutinler" style={{ gap: 10 }}>
        <h2 id="fy-rutinler" className="section-title">
          Rutinler
        </h2>
        <ul className="fy-routines">
          {ROUTINES.map((r) => {
            const list = routineExercises(r);
            return (
              <li key={r.id} className="card fy-routine" data-color={r.color}>
                <strong>{r.name}</strong>
                <span className="muted small">{r.description}</span>
                <span className="fy-meta small">
                  {list.length} egzersiz · {formatDuration(routineSeconds(r))}
                </span>
                <button type="button" className="btn btn-primary" onClick={() => setPlaying({ id: r.id, title: r.name, exercises: list })}>
                  <Play size={16} aria-hidden="true" /> Başlat
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="stack" aria-labelledby="fy-egzersizler" style={{ gap: 10 }}>
        <h2 id="fy-egzersizler" className="section-title">
          Egzersizler
        </h2>
        <div className="row fy-areas" role="group" aria-label="Bölgeye göre">
          <button type="button" className="chip" aria-pressed={area === null} onClick={() => setArea(null)}>
            Tümü
          </button>
          {AREAS.map((a) => (
            <button key={a} type="button" className="chip" aria-pressed={area === a} onClick={() => setArea(a)}>
              {AREA_LABEL[a]}
            </button>
          ))}
        </div>
        <ul className="card plain-list">
          {shown.map((e) => (
            <li key={e.id} className="fy-exercise">
              <details>
                <summary>
                  <span className="grow">
                    <strong>{e.name}</strong>
                    <span className="muted small">
                      {AREA_LABEL[e.area]} · {formatDuration(e.seconds)}
                    </span>
                  </span>
                </summary>
                <ol className="fy-steps">
                  {e.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="muted small">{e.tip}</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPlaying({ id: e.id, title: e.name, exercises: [e] })}>
                  <Play size={14} aria-hidden="true" /> Sadece bunu yap
                </button>
              </details>
            </li>
          ))}
        </ul>
      </section>

      {overview && overview.recent.length > 0 && (
        <section className="stack" aria-labelledby="fy-son" style={{ gap: 8 }}>
          <h2 id="fy-son" className="section-title">
            Son seanslar
          </h2>
          <ul className="card plain-list session-list">
            {overview.recent.map((s) => (
              <li key={s.id} className="list-row" data-color="week">
                <span className="session-icon" aria-hidden="true">
                  <Check size={16} strokeWidth={3} />
                </span>
                <span className="grow session-text">
                  <strong>{practiceName(s.routine)}</strong>
                  <span className="muted small">{formatDuration(s.seconds)}</span>
                </span>
                <span className="muted small">{relativeDay(s.day, today)}</span>
                {confirmId === s.id ? (
                  <span className="row" style={{ gap: 6 }}>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>
                      Sil
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>
                      Vazgeç
                    </button>
                  </span>
                ) : (
                  <button type="button" className="icon-btn" onClick={() => setConfirmId(s.id)} aria-label="Bu kaydı sil">
                    <Trash size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="notice health-note">
        <Info size={18} aria-hidden="true" />
        <span>
          Temiz elle ve hafif baskıyla çalış. Yakın zamanda dolgu ya da botoks yaptırdıysan veya çene ekleminde ağrın varsa önce doktoruna danış.
        </span>
      </p>

      {playing && (
        <FaceYogaPlayer
          key={playing.id}
          practiceId={playing.id}
          title={playing.title}
          exercises={playing.exercises}
          canSave={!!overview}
          onClose={close}
          onSaved={() => {
            setPlaying(null);
            setMessage("Kaydedildi.");
            router.refresh();
          }}
        />
      )}
      <Toast message={message} onDone={clear} />
    </div>
  );
}
