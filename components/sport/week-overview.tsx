"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Flame, Plus, Target, Trash } from "lucide-react";
import { LogSheet } from "@/components/sport/log-sheet";
import { Toast } from "@/components/toast";
import { api } from "@/lib/api-client";
import { gainXp } from "@/components/xp-badge";
import { XP } from "@/lib/xp";
import { WEEKDAY_SHORT, diffDays, formatDayShort, weekdayIndex } from "@/lib/dates";
import { INTENSITY_LABEL, type ActivityType, type SessionItem, type SportGoal, type WeekProgress } from "@/lib/sport-shared";

type Props = {
  today: string;
  goal: SportGoal | null;
  types: ActivityType[];
  progress: WeekProgress;
  sessions: SessionItem[];
  last: Record<string, { minutes: number | null; rounds: number | null }>;
};

function relativeDay(day: string, today: string): string {
  const d = diffDays(today, day);
  if (d === 0) return "Bugün";
  if (d === 1) return "Dün";
  if (d < 7) return WEEKDAY_SHORT[weekdayIndex(day)]!;
  return formatDayShort(day);
}

/** Spor · Bu hafta: haftalık hedef, gün şeridi, "Spor yaptım" ve son oturumlar */
export function WeekOverview({ today, goal, types, progress, sessions, last }: Props) {
  const router = useRouter();
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const clear = useCallback(() => setMessage(null), []);
  const minType = types.find((t) => t.id === goal?.minTypeId);
  const target = goal?.daysPerWeek ?? 0;
  const percent = target ? Math.min(100, Math.round((progress.done / target) * 100)) : 0;

  async function remove(id: string) {
    setConfirmId(null);
    try {
      await api(`/api/sport/sessions/${id}`, { method: "DELETE" });
      gainXp(-XP.sport);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  return (
    <div className="stack section-stack">
      <section className="card stack" aria-label="Haftalık hedef">
        {goal ? (
          <div className="goal">
            <div className="ring" style={{ "--p": percent } as React.CSSProperties}>
              <span className="num">
                {progress.done}
                <small>/{target}</small>
              </span>
            </div>
            <div className="goal-text">
              <strong>Haftada {target} gün hedefi</strong>
              {minType && goal.minTypeDays && (
                <span className="sub-goal" data-color={minType.color}>
                  En az {goal.minTypeDays} {minType.name.toLocaleLowerCase("tr")}
                  <span className="mini-bar" aria-hidden="true">
                    <i style={{ width: `${Math.min(100, (progress.typedDone / goal.minTypeDays) * 100)}%` }} />
                  </span>
                  <b className="num">
                    {Math.min(progress.typedDone, goal.minTypeDays)}/{goal.minTypeDays}
                  </b>
                </span>
              )}
              {progress.weeksStreak > 0 ? (
                <span className="goal-badge">
                  <Flame size={13} aria-hidden="true" />
                  {progress.weeksStreak} haftadır hedefte
                </span>
              ) : progress.done >= target ? (
                <span className="goal-badge">
                  <Check size={13} strokeWidth={3} aria-hidden="true" />
                  Bu haftanın hedefi tamam
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="goal">
            <span className="empty-icon" aria-hidden="true">
              <Target size={24} />
            </span>
            <div className="goal-text">
              <strong>Haftalık hedef koy</strong>
              <span className="muted small">Ör. haftada 4 gün. Hangi gün yaptığın fark etmez, yaptığın her gün sayılır.</span>
              <Link href="/spor/hedef" className="link-btn">
                Hedefi belirle
              </Link>
            </div>
          </div>
        )}

        <ol className="week-strip" aria-label="Bu haftanın günleri">
          {progress.days.map((d, i) => (
            <li key={d.day} className={d.day === today ? "is-today" : undefined}>
              <span>{WEEKDAY_SHORT[i]}</span>
              <span className={`day-mark${d.color ? " on" : ""}`} data-color={d.color ?? undefined}>
                {d.color ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : null}
                <span className="sr-only">{d.color ? "spor yapıldı" : "yok"}</span>
              </span>
            </li>
          ))}
        </ol>
        {types.length > 0 && (
          <ul className="type-key" aria-label="Renkler">
            {types.map((t) => (
              <li key={t.id} data-color={t.color}>
                <i aria-hidden="true" />
                {t.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      {types.length > 0 ? (
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setLogging(true)}>
          <Plus size={18} aria-hidden="true" /> Spor yaptım
        </button>
      ) : (
        <p className="notice">
          <Target size={18} aria-hidden="true" />
          <span>
            Önce yaptığın sporları ekle (ör. Pilates, Boks). <Link href="/spor/hedef">Hedef</Link> sayfasından tek dokunuşla ekleyebilirsin.
          </span>
        </p>
      )}

      {sessions.length > 0 && (
        <section className="stack" aria-labelledby="son-oturumlar" style={{ gap: 8 }}>
          <h2 id="son-oturumlar" className="section-title">
            Son oturumlar
          </h2>
          <ul className="card plain-list session-list">
            {sessions.map((s) => (
              <li key={s.id} className="list-row" data-color={s.color}>
                <span className="session-icon" aria-hidden="true">
                  <Check size={16} strokeWidth={3} />
                </span>
                <span className="grow session-text">
                  <strong>{s.videoTitle ?? s.typeName ?? "Spor"}</strong>
                  <span className="muted small">
                    {[
                      s.videoTitle ? s.typeName ?? "Video" : null,
                      s.minutes ? `${s.minutes} dk` : null,
                      s.rounds ? `${s.rounds} tur` : null,
                      s.intensity ? INTENSITY_LABEL[s.intensity].toLocaleLowerCase("tr") : null,
                      s.note || null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
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

      {logging && (
        <LogSheet
          today={today}
          types={types}
          last={last}
          onClose={() => setLogging(false)}
          onSaved={() => {
            setLogging(false);
            setMessage("Kaydedildi.");
            router.refresh();
          }}
        />
      )}
      <Toast message={message} onDone={clear} />
    </div>
  );
}
