"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Timer, Trash } from "lucide-react";
import { useTimers } from "@/components/timers";
import { describeTarget } from "@/components/sport/workout-plan";
import { api } from "@/lib/api-client";
import { formatDayShort } from "@/lib/dates";
import { formatClock, formatDuration } from "@/lib/slots";
import type { ActivityDay, Exercise, PlanItem, Session, SetEntry } from "@/lib/sport";

type Props = {
  day: string;
  title: string;
  planned: PlanItem[];
  exercises: Exercise[];
  sets: Record<string, SetEntry[]>;
  previous: Record<string, Session>;
  activity: ActivityDay | null;
};

const kg = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
const volume = (sets: SetEntry[]) => sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weightKg ?? 0), 0);
const top = (sets: SetEntry[]) => Math.max(0, ...sets.map((s) => s.weightKg ?? 0));

export function WorkoutLog({ day, title, planned, exercises, sets, previous, activity }: Props) {
  // Plandaki hareketler + bugün plan dışı kaydedilenler
  const plannedIds = planned.map((p) => p.exerciseId);
  const extraIds = Object.keys(sets).filter((id) => !plannedIds.includes(id));
  const [added, setAdded] = useState<string[]>(extraIds);
  const [pick, setPick] = useState("");
  const available = exercises.filter((e) => !plannedIds.includes(e.id) && !added.includes(e.id));

  return (
    <div className="stack">
      <WorkoutDone day={day} title={title} hasPlan={planned.length > 0} initial={activity?.workoutDone ?? false} />

      {planned.map((p) => (
        <ExerciseLog
          key={p.id}
          day={day}
          exerciseId={p.exerciseId}
          name={p.exerciseName}
          plan={p}
          initial={sets[p.exerciseId]}
          previous={previous[p.exerciseId]}
        />
      ))}
      {added.map((id) => {
        const ex = exercises.find((e) => e.id === id);
        if (!ex) return null;
        return <ExerciseLog key={id} day={day} exerciseId={id} name={ex.name} initial={sets[id]} previous={previous[id]} />;
      })}

      {available.length > 0 && (
        <div className="row">
          <label className="sr-only" htmlFor="extra-ex">
            Plan dışı hareket
          </label>
          <select id="extra-ex" className="input select-inline grow" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Plan dışı hareket ekle…</option>
            {available.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-quiet"
            disabled={!pick}
            onClick={() => {
              setAdded((a) => [...a, pick]);
              setPick("");
            }}
          >
            <Plus size={18} /> Ekle
          </button>
        </div>
      )}

      <ActivityCard day={day} activity={activity} />
    </div>
  );
}

function WorkoutDone({ day, title, hasPlan, initial }: { day: string; title: string; hasPlan: boolean; initial: boolean }) {
  const [done, setDone] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  async function toggle() {
    const next = !done;
    setDone(next);
    try {
      await api("/api/sport/activity", { method: "PUT", body: { day, workoutDone: next } });
    } catch (err) {
      setDone(!next);
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    }
  }
  return (
    <div className={`step workout-done${done ? " is-done" : ""}`}>
      <button type="button" className="step-main" aria-pressed={done} onClick={toggle}>
        <span className="step-check" aria-hidden="true">
          {done && <Check size={16} strokeWidth={3} />}
        </span>
        <span className="step-text">
          <span className="step-title">{done ? "Antrenman tamamlandı" : "Antrenmanı tamamladım"}</span>
          <span className="step-sub">{hasPlan ? title || "Bugünkü plan" : "Bu gün planda antrenman yok"}</span>
        </span>
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

function ExerciseLog({
  day,
  exerciseId,
  name,
  plan,
  initial,
  previous,
}: {
  day: string;
  exerciseId: string;
  name: string;
  plan?: PlanItem;
  initial?: SetEntry[];
  previous?: Session;
}) {
  const { timers, now, start, stop } = useTimers();
  const timerId = `dinlenme-${exerciseId}`;
  const rest = timers.find((t) => t.itemId === timerId);
  const toRow = (s: SetEntry) => ({ reps: s.reps === null ? "" : String(s.reps), weight: s.weightKg === null ? "" : String(s.weightKg).replace(".", ",") });
  const defaults = () =>
    Array.from({ length: plan?.sets ?? 3 }, () => ({ reps: "", weight: plan?.weightKg != null ? String(plan.weightKg).replace(".", ",") : "" }));
  const [rows, setRows] = useState(() => (initial?.length ? initial.map(toRow) : defaults()));
  const [saved, setSaved] = useState<SetEntry[]>(initial ?? []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const restSeconds = plan?.restSeconds ?? 90;

  async function save() {
    setBusy(true);
    setMessage(null);
    const payload = rows.map((r) => ({ reps: r.reps, weightKg: r.weight }));
    try {
      await api("/api/sport/sets", { method: "PUT", body: { day, exerciseId, sets: payload } });
      const parsed = rows
        .map((r) => ({ reps: r.reps === "" ? null : Number(r.reps), weightKg: r.weight === "" ? null : Number(r.weight.replace(",", ".")) }))
        .filter((s) => s.reps !== null || s.weightKg !== null);
      setSaved(parsed);
      setMessage({ ok: true, text: "Kaydedildi." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Kaydedilemedi." });
    }
    setBusy(false);
  }

  const prevVolume = previous ? volume(previous.sets) : 0;
  const nowVolume = volume(saved);
  const delta = (a: number, b: number) => (a > b ? `▲ ${kg(a - b)}` : a < b ? `▼ ${kg(b - a)}` : "=");

  return (
    <section className="card stack ex-log" aria-label={name}>
      <header className="ex-log-head">
        <div className="grow">
          <h3>{name}</h3>
          {plan && (
            <span className="muted small">
              Hedef: {describeTarget(plan)} · dinlenme {formatDuration(restSeconds)}
            </span>
          )}
        </div>
        {rest ? (
          <button type="button" className="timer-btn running" onClick={() => stop(timerId)} aria-label="Dinlenme sayacını durdur">
            <Timer size={14} /> <span className="num">{formatClock((rest.endsAt - now) / 1000)}</span>
          </button>
        ) : (
          <button
            type="button"
            className="timer-btn"
            onClick={() => start({ itemId: timerId, day, label: `Dinlenme · ${name}`, seconds: restSeconds, markable: false })}
            disabled={restSeconds === 0}
          >
            <Timer size={14} /> Dinlenme {formatDuration(restSeconds)}
          </button>
        )}
      </header>

      {previous ? (
        <p className="prev-session small">
          <strong>Önceki ({formatDayShort(previous.day)}):</strong>{" "}
          {previous.sets.map((s) => `${s.reps ?? "–"}×${s.weightKg !== null ? kg(s.weightKg) : "–"}`).join(", ")}
        </p>
      ) : (
        <p className="muted small">Bu hareketin önceki kaydı yok.</p>
      )}

      <div className="set-table" role="group" aria-label={`${name} setleri`}>
        <span className="set-head">Set</span>
        <span className="set-head">Tekrar</span>
        <span className="set-head">kg</span>
        <span />
        {rows.map((r, i) => (
          <div key={i} className="set-row">
            <span className="num set-no">{i + 1}</span>
            <input
              className="input"
              inputMode="numeric"
              value={r.reps}
              placeholder={plan?.reps || "–"}
              onChange={(e) => setRows((list) => list.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))}
              aria-label={`${i + 1}. set tekrar`}
            />
            <input
              className="input"
              inputMode="decimal"
              value={r.weight}
              placeholder="–"
              onChange={(e) => setRows((list) => list.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))}
              aria-label={`${i + 1}. set ağırlık`}
            />
            <button type="button" className="icon-btn" onClick={() => setRows((list) => list.filter((_, j) => j !== i))} aria-label={`${i + 1}. seti sil`}>
              <Trash size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => setRows((list) => [...list, { reps: "", weight: list.at(-1)?.weight ?? "" }])}>
          <Plus size={16} /> Set
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {message && <span className={message.ok ? "form-ok" : "form-error"}>{message.text}</span>}
      </div>

      {saved.length > 0 && previous && (
        <p className="compare-line small">
          Hacim <strong className="num">{kg(nowVolume)} kg</strong> ({delta(nowVolume, prevVolume)}) · En ağır{" "}
          <strong className="num">{kg(top(saved))} kg</strong> ({delta(top(saved), top(previous.sets))})
        </p>
      )}
    </section>
  );
}

function ActivityCard({ day, activity }: { day: string; activity: ActivityDay | null }) {
  const router = useRouter();
  const [steps, setSteps] = useState(activity?.steps?.toString() ?? "");
  const [cardio, setCardio] = useState(activity?.cardioMinutes?.toString() ?? "");
  const [note, setNote] = useState(activity?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/sport/activity", { method: "PUT", body: { day, steps, cardioMinutes: cardio, note } });
      setMessage({ ok: true, text: "Kaydedildi." });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Kaydedilemedi." });
    }
    setBusy(false);
  }

  return (
    <form className="card stack" onSubmit={save} aria-labelledby="aktivite">
      <h2 id="aktivite">Adım ve kardiyo</h2>
      <div className="form-grid two">
        <div className="field">
          <label htmlFor="steps">Adım</label>
          <input id="steps" className="input" inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Ör. 8000" />
        </div>
        <div className="field">
          <label htmlFor="cardio">Kardiyo (dk)</label>
          <input id="cardio" className="input" inputMode="numeric" value={cardio} onChange={(e) => setCardio(e.target.value)} placeholder="Ör. 20" />
        </div>
        <div className="field span-2">
          <label htmlFor="act-note">Not</label>
          <input id="act-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Ör. Akşam 30 dk yürüyüş" />
        </div>
      </div>
      {message && <p className={message.ok ? "form-ok" : "form-error"}>{message.text}</p>}
      <div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Kaydet
        </button>
      </div>
    </form>
  );
}
