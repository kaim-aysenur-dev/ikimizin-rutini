"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash } from "lucide-react";
import { WeekdayTabs } from "@/components/weekday-tabs";
import { api } from "@/lib/api-client";
import { WEEKDAY_LONG } from "@/lib/dates";
import { formatDuration } from "@/lib/slots";
import type { Exercise, PlanItem, WorkoutPlan } from "@/lib/sport";

export function describeTarget(i: Pick<PlanItem, "sets" | "reps" | "weightKg">): string {
  const reps = i.reps ? `${i.sets} × ${i.reps}` : `${i.sets} set`;
  return i.weightKg !== null ? `${reps} · ${i.weightKg.toLocaleString("tr-TR")} kg` : reps;
}

/** Haftalık antrenman planı: gün başlığı, hareketler (set, tekrar, ağırlık, dinlenme), sıralama */
export function WorkoutPlanEditor({ plan, exercises, todayWeekday }: { plan: WorkoutPlan; exercises: Exercise[]; todayWeekday: number }) {
  const router = useRouter();
  const [day, setDay] = useState(todayWeekday);
  const [editing, setEditing] = useState<string | "yeni" | null>(null);
  const [title, setTitle] = useState(plan.titles[todayWeekday] ?? "");
  const [error, setError] = useState<string | null>(null);
  const items = plan.items.filter((i) => i.weekday === day);
  const marks = Array.from({ length: 7 }, (_, i) => plan.items.some((x) => x.weekday === i));

  async function call(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem yapılamadı.");
    }
  }

  return (
    <section className="card stack" aria-labelledby="ant-plan">
      <div>
        <h2 id="ant-plan">Haftalık antrenman planı</h2>
        <p className="muted">Hareketsiz günler dinlenme günü sayılır. Hareket olan günler su hedefinde "spor günü"dür.</p>
      </div>
      <WeekdayTabs
        value={day}
        onChange={(d) => {
          setDay(d);
          setTitle(plan.titles[d] ?? "");
          setEditing(null);
        }}
        today={todayWeekday}
        marks={marks}
      />
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void call(() => api("/api/sport/plan", { method: "PUT", body: { weekday: day, title } }));
        }}
      >
        <label className="sr-only" htmlFor="day-title">
          {WEEKDAY_LONG[day]} başlığı
        </label>
        <input
          id="day-title"
          className="input grow"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`${WEEKDAY_LONG[day]} başlığı (ör. Üst vücut)`}
          maxLength={60}
        />
        <button type="submit" className="btn btn-quiet" disabled={title === (plan.titles[day] ?? "")}>
          Kaydet
        </button>
      </form>

      {items.length === 0 && editing !== "yeni" && <p className="muted">Bu gün dinlenme günü.</p>}

      <ol className="plan-list">
        {items.map((item, index) =>
          editing === item.id ? (
            <li key={item.id}>
              <PlanItemForm item={item} exercises={exercises} weekday={day} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={item.id} className="plan-item">
              <span className="plan-no num">{index + 1}</span>
              <div className="grow">
                <strong>{item.exerciseName}</strong>
                <span className="muted small">
                  {describeTarget(item)} · dinlenme {formatDuration(item.restSeconds)}
                  {item.region && ` · ${item.region}`}
                </span>
                {item.note && <span className="small pre">{item.note}</span>}
              </div>
              <div className="plan-actions">
                <button type="button" className="icon-btn" disabled={index === 0} onClick={() => call(() => api(`/api/sport/plan/${item.id}`, { method: "PATCH", body: { move: -1 } }))} aria-label="Yukarı taşı">
                  <ArrowUp size={16} />
                </button>
                <button type="button" className="icon-btn" disabled={index === items.length - 1} onClick={() => call(() => api(`/api/sport/plan/${item.id}`, { method: "PATCH", body: { move: 1 } }))} aria-label="Aşağı taşı">
                  <ArrowDown size={16} />
                </button>
                <button type="button" className="icon-btn" onClick={() => setEditing(item.id)} aria-label={`${item.exerciseName} düzenle`}>
                  <Pencil size={16} />
                </button>
              </div>
            </li>
          ),
        )}
      </ol>

      {editing === "yeni" ? (
        <PlanItemForm exercises={exercises} weekday={day} onDone={() => setEditing(null)} />
      ) : exercises.length === 0 ? (
        <p className="notice">
          <span>
            Önce <Link href="/spor/hareketler">hareket kütüphanesine</Link> hareket ekle; sonra burada günlere yerleştir.
          </span>
        </p>
      ) : (
        <div>
          <button type="button" className="btn btn-quiet" onClick={() => setEditing("yeni")}>
            <Plus size={18} /> {WEEKDAY_LONG[day]} gününe hareket ekle
          </button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}

function PlanItemForm({ item, exercises, weekday, onDone }: { item?: PlanItem; exercises: Exercise[]; weekday: number; onDone: () => void }) {
  const router = useRouter();
  const [exerciseId, setExerciseId] = useState(item?.exerciseId ?? exercises[0]?.id ?? "");
  const [sets, setSets] = useState(String(item?.sets ?? 3));
  const [reps, setReps] = useState(item?.reps ?? "8-10");
  const [weight, setWeight] = useState(item?.weightKg === null || item?.weightKg === undefined ? "" : String(item.weightKg).replace(".", ","));
  const [rest, setRest] = useState(String(item?.restSeconds ?? 90));
  const [note, setNote] = useState(item?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uid = item?.id ?? "yeni";

  async function run(action: "save" | "delete") {
    setBusy(true);
    setError(null);
    const body = { sets: Number(sets), reps, weightKg: weight, restSeconds: Number(rest), note };
    try {
      if (action === "delete") await api(`/api/sport/plan/${item!.id}`, { method: "DELETE" });
      else if (item) await api(`/api/sport/plan/${item.id}`, { method: "PATCH", body });
      else await api("/api/sport/plan", { body: { ...body, weekday, exerciseId } });
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }

  return (
    <form
      className="card stack plan-form"
      onSubmit={(e) => {
        e.preventDefault();
        void run("save");
      }}
    >
      {item ? (
        <strong>{item.exerciseName}</strong>
      ) : (
        <div className="field">
          <label htmlFor="pi-ex">Hareket</label>
          <select id="pi-ex" className="input" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            {exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.region ? ` (${e.region})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="form-grid four">
        <div className="field">
          <label htmlFor={`pi-sets-${uid}`}>Set</label>
          <input id={`pi-sets-${uid}`} className="input" type="number" inputMode="numeric" min={1} max={20} value={sets} onChange={(e) => setSets(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`pi-reps-${uid}`}>Tekrar</label>
          <input id={`pi-reps-${uid}`} className="input" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="8-10 / 30 sn" maxLength={30} />
        </div>
        <div className="field">
          <label htmlFor={`pi-kg-${uid}`}>Ağırlık (kg)</label>
          <input id={`pi-kg-${uid}`} className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="—" />
        </div>
        <div className="field">
          <label htmlFor={`pi-rest-${uid}`}>Dinlenme (sn)</label>
          <input id={`pi-rest-${uid}`} className="input" type="number" inputMode="numeric" min={0} max={900} step={15} value={rest} onChange={(e) => setRest(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`pi-note-${uid}`}>Not</label>
        <input id={`pi-note-${uid}`} className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Ör. Son sette tükenişe kadar" />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy || !exerciseId}>
          {item ? "Kaydet" : "Ekle"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={busy}>
          Vazgeç
        </button>
        {item && (
          <button type="button" className="icon-btn" onClick={() => run("delete")} disabled={busy} aria-label="Plandan çıkar">
            <Trash size={16} />
          </button>
        )}
      </div>
    </form>
  );
}
