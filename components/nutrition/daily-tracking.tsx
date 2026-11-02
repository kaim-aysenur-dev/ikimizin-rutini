"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Toast } from "@/components/toast";
import { WaterCounter } from "@/components/nutrition/water-counter";
import { api } from "@/lib/api-client";
import { gainXp } from "@/components/xp-badge";
import { XP } from "@/lib/xp";
import { MEAL_LABEL, type Meal, type PlanMeal } from "@/lib/meals";

type Props = {
  day: string;
  today: string;
  meals: PlanMeal[];
  initialChecks: Meal[];
  water: { initial: number; target: number; glassMl: number; sportDay: boolean };
  note: string;
};

/** Bir günün öğünleri (yapıldı / yapılmadı), su ve kısa not */
export function DailyTracking({ day, today, meals, initialChecks, water, note: initialNote }: Props) {
  const router = useRouter();
  const [done, setDone] = useState(() => new Set<Meal>(initialChecks));
  const [note, setNote] = useState(initialNote);
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  async function toggle(meal: Meal) {
    const next = !done.has(meal);
    setDone((s) => {
      const copy = new Set(s);
      if (next) copy.add(meal);
      else copy.delete(meal);
      return copy;
    });
    try {
      await api("/api/nutrition/meal-check", { body: { day, meal, done: next } });
      gainXp(next ? XP.meal : -XP.meal);
    } catch (err) {
      setDone((s) => {
        const copy = new Set(s);
        if (next) copy.delete(meal);
        else copy.add(meal);
        return copy;
      });
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    }
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    setNoteState("saving");
    try {
      await api("/api/nutrition/day", { method: "PUT", body: { day, note } });
      setNoteState("saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not kaydedilemedi.");
      setNoteState("idle");
    }
  }

  return (
    <div className="stack">
      <section className="card stack" aria-labelledby="ogunler">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h2 id="ogunler">Öğünler</h2>
          <span className="muted num">
            {meals.filter((m) => done.has(m.meal)).length}/{meals.length}
          </span>
        </div>
        {meals.length === 0 ? (
          <p className="muted">Bu gün için planda öğün yok. Plan sekmesinden ekleyebilirsin.</p>
        ) : (
          <ul className="steps">
            {meals.map((m) => {
              const isDone = done.has(m.meal);
              return (
                <li key={m.meal} className={`step${isDone ? " is-done" : ""}`}>
                  <button type="button" className="step-main" aria-pressed={isDone} onClick={() => toggle(m.meal)}>
                    <span className="step-check" aria-hidden="true">
                      {isDone && <Check size={16} strokeWidth={3} />}
                    </span>
                    <span className="step-text">
                      <span className="step-title">{MEAL_LABEL[m.meal]}</span>
                      <span className="step-sub">{m.items.join(" · ")}</span>
                      {m.note && <span className="step-sub em">{m.note}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card stack" aria-labelledby="su">
        <h2 id="su">Su</h2>
        <WaterCounter key={day} day={day} initial={water.initial} target={water.target} glassMl={water.glassMl} sportDay={water.sportDay} />
      </section>

      <form className="card stack" onSubmit={saveNote} aria-labelledby="not">
        <h2 id="not">Günün notu</h2>
        <textarea
          className="input"
          rows={3}
          maxLength={1000}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setNoteState("idle");
          }}
          placeholder={day === today ? "Ör. Akşam pilavı atladım, salata fazla." : ""}
          aria-labelledby="not"
        />
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={noteState === "saving"}>
            Notu kaydet
          </button>
          {noteState === "saved" && <span className="form-ok">Kaydedildi</span>}
        </div>
      </form>
      <Toast message={error} onDone={clearError} />
    </div>
  );
}
