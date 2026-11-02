"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { WeekdayTabs } from "@/components/weekday-tabs";
import { api } from "@/lib/api-client";
import { WEEKDAY_LONG } from "@/lib/dates";
import { MEALS, MEAL_LABEL, type Meal, type PlanMeal } from "@/lib/meals";

// Haftalık öğün planı: gün seç, öğünleri gör, düzenle, ekle, kaldır.

export function MealPlanEditor({ plan, todayWeekday }: { plan: PlanMeal[]; todayWeekday: number }) {
  const router = useRouter();
  const [day, setDay] = useState(todayWeekday);
  const [editing, setEditing] = useState<Meal | null>(null);
  const meals = plan.filter((m) => m.weekday === day);
  const present = new Set(meals.map((m) => m.meal));
  const missing = MEALS.filter((m) => !present.has(m));
  const marks = Array.from({ length: 7 }, (_, i) => plan.some((m) => m.weekday === i));
  const ordered = MEALS.filter((m) => present.has(m) || editing === m);

  return (
    <section className="card stack" aria-labelledby="plan-title">
      <div>
        <h2 id="plan-title">Haftalık öğün planı</h2>
        <p className="muted">Gün seç; öğünleri ekle ya da düzenle. Her satır bir madde. Alışveriş listesi bu plandan hazırlanır.</p>
      </div>
      <WeekdayTabs value={day} onChange={(d) => { setDay(d); setEditing(null); }} today={todayWeekday} marks={marks} />
      <h3 className="day-heading">
        {WEEKDAY_LONG[day]}
        {day === todayWeekday && <span className="muted"> · bugün</span>}
      </h3>

      {ordered.length === 0 && <p className="muted">Bu gün için öğün yok.</p>}

      <div className="meal-grid">
        {ordered.map((meal) => {
          const m = meals.find((x) => x.meal === meal);
          return editing === meal ? (
            <MealEditor
              key={meal}
              weekday={day}
              meal={meal}
              initial={m}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <article key={meal} className="meal-card">
              <header>
                <h4>{MEAL_LABEL[meal]}</h4>
                <button type="button" className="icon-btn" onClick={() => setEditing(meal)} aria-label={`${MEAL_LABEL[meal]} öğününü düzenle`}>
                  <Pencil size={16} />
                </button>
              </header>
              <ul>{m?.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
              {m?.note && <p className="meal-note">{m.note}</p>}
            </article>
          );
        })}
      </div>

      {missing.length > 0 && editing === null && (
        <div className="row">
          <label className="sr-only" htmlFor="add-meal">
            Öğün ekle
          </label>
          <select
            id="add-meal"
            className="input select-inline"
            value=""
            onChange={(e) => e.target.value && setEditing(e.target.value as Meal)}
          >
            <option value="">+ Öğün ekle…</option>
            {missing.map((m) => (
              <option key={m} value={m}>
                {MEAL_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
}

function MealEditor({
  weekday,
  meal,
  initial,
  onDone,
  onCancel,
}: {
  weekday: number;
  meal: Meal;
  initial?: PlanMeal;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [items, setItems] = useState(initial?.items.join("\n") ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(clear = false) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/nutrition/plan", {
        method: "PUT",
        body: { weekday, meal, items: clear ? [] : items.split("\n"), note: clear ? "" : note },
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }

  return (
    <article className="meal-card editing">
      <h4>{MEAL_LABEL[meal]}</h4>
      <div className="field">
        <label htmlFor={`items-${meal}`}>Maddeler (her satıra bir tane)</label>
        <textarea
          id={`items-${meal}`}
          className="input"
          rows={5}
          value={items}
          onChange={(e) => setItems(e.target.value)}
          placeholder={"200 gr tavuk\n5-6 yemek kaşığı pilav\n1 kase yoğurt\nBüyük salata"}
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor={`note-${meal}`}>Not</label>
        <input id={`note-${meal}`} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ör. Ekmek olmayacak." />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => save()} disabled={busy}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Vazgeç
        </button>
        {initial && (
          <button type="button" className="btn btn-danger" onClick={() => save(true)} disabled={busy}>
            Öğünü kaldır
          </button>
        )}
      </div>
    </article>
  );
}

