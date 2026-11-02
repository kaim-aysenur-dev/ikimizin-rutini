"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, Dumbbell, Flame, Play, Plus, Salad, Square } from "lucide-react";
import { ProductThumb } from "@/components/product-thumb";
import { Toast } from "@/components/toast";
import { useTimers } from "@/components/timers";
import { useChecks, useDayRollover } from "@/components/use-checks";
import { WaterCounter } from "@/components/nutrition/water-counter";
import { api } from "@/lib/api-client";
import { gainXp } from "@/components/xp-badge";
import { XP } from "@/lib/xp";
import { MEAL_LABEL, type Meal, type PlanMeal } from "@/lib/meals";
import { checkKey, weeklyCount } from "@/lib/progress";
import { DAILY_SLOTS, SLOT_LABEL, formatClock, formatDuration, type Slot } from "@/lib/slots";

export type TodayItem = {
  id: string;
  slot: Slot;
  label: string;
  detail: string;
  weeklyTarget: number | null;
  timers: number[];
  productName: string | null;
  image: string | null;
};

type Props = {
  today: string;
  week: string[];
  items: TodayItem[];
  initialChecks: string[];
  meals: PlanMeal[];
  mealChecks: Meal[];
  water: { tracked: boolean; initial: number; target: number; glassMl: number; sportDay: boolean };
  workout: { planned: boolean; title: string; count: number; done: boolean };
  streak: { current: number; todayComplete: boolean };
};

export function TodayView({ today, week, items, initialChecks, meals, mealChecks, water, workout, streak }: Props) {
  const { checked, setDone, error, clearError } = useChecks(initialChecks);
  const [mealsDone, setMealsDone] = useState(() => new Set<Meal>(mealChecks));
  const [glasses, setGlasses] = useState(water.initial);
  const [workoutDone, setWorkoutDone] = useState(workout.done);
  const [localError, setLocalError] = useState<string | null>(null);
  const clearLocal = useCallback(() => setLocalError(null), []);
  useDayRollover(today);

  const isDone = (id: string) => checked.has(checkKey(today, id));
  const daily = items.filter((i) => DAILY_SLOTS.includes(i.slot));

  // Günün tamamlanması: cilt günlük adımları + öğünler + su hedefi + planlı antrenman.
  // Su, ilk kayıttan (ya da öğün planından) itibaren sayılır; bugün ilk bardak eklenince de sayılmaya başlar.
  const waterCounted = water.tracked || glasses > 0;
  const total = daily.length + meals.length + (waterCounted ? 1 : 0) + (workout.planned ? 1 : 0);
  const done =
    daily.filter((i) => isDone(i.id)).length +
    meals.filter((m) => mealsDone.has(m.meal)).length +
    (waterCounted && glasses >= water.target ? 1 : 0) +
    (workout.planned && workoutDone ? 1 : 0);
  const percent = total ? Math.round((done / total) * 100) : 0;
  const streakBefore = streak.todayComplete ? streak.current - 1 : streak.current;
  const streakNow = streakBefore + (total > 0 && done === total ? 1 : 0);

  const weekly = items.filter((i) => i.slot === "haftalik");
  const weeklyVisible = weekly.filter((i) => weeklyCount(i.id, week, checked) < (i.weeklyTarget ?? 1) || isDone(i.id));
  const asNeeded = items.filter((i) => i.slot === "gerektiginde");

  async function toggleMeal(meal: Meal) {
    const next = !mealsDone.has(meal);
    const apply = (on: boolean) =>
      setMealsDone((s) => {
        const c = new Set(s);
        if (on) c.add(meal);
        else c.delete(meal);
        return c;
      });
    apply(next);
    try {
      await api("/api/nutrition/meal-check", { body: { day: today, meal, done: next } });
      gainXp(next ? XP.meal : -XP.meal);
    } catch (err) {
      apply(!next);
      setLocalError(err instanceof Error ? err.message : "Kaydedilemedi.");
    }
  }

  async function toggleWorkout() {
    const next = !workoutDone;
    setWorkoutDone(next);
    try {
      await api("/api/sport/activity", { method: "PUT", body: { day: today, workoutDone: next } });
    } catch (err) {
      setWorkoutDone(!next);
      setLocalError(err instanceof Error ? err.message : "Kaydedilemedi.");
    }
  }

  if (total === 0 && !weekly.length && !asNeeded.length) {
    return (
      <div className="empty">
        <span className="empty-icon">
          <Plus size={26} />
        </span>
        <h2>Bugün listen henüz boş</h2>
        <p>Cilt rutinini, beslenme planını ya da antrenman planını ekledikçe günün görevleri burada tek listede toplanır.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link href="/cilt/urunler/yeni" className="btn btn-primary">
            Cilt ürünü ekle
          </Link>
          <Link href="/beslenme" className="btn btn-ghost">
            Beslenme planı
          </Link>
          <Link href="/spor/hedef" className="btn btn-ghost">
            Spor hedefi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="today-summary" aria-label="Günün özeti">
        <div className="ring" style={{ "--p": percent } as React.CSSProperties}>
          <span className="num">%{percent}</span>
        </div>
        <div className="today-summary-text">
          <strong>
            <span className="num">
              {done}/{total}
            </span>{" "}
            görev tamam
          </strong>
          <span className="streak">
            <Flame size={16} aria-hidden="true" />
            <span>
              <span className="num">{streakNow}</span> günlük seri
            </span>
          </span>
        </div>
      </section>

      {DAILY_SLOTS.map((slot) => {
        const group = items.filter((i) => i.slot === slot);
        if (!group.length) return null;
        const count = group.filter((i) => isDone(i.id)).length;
        return (
          <section key={slot} className="slot-block" aria-labelledby={`slot-${slot}`}>
            <div className="slot-head">
              <h2 id={`slot-${slot}`} className="tag" data-slot={slot}>
                Cilt · {SLOT_LABEL[slot]}
              </h2>
              {count === group.length ? (
                <span className="slot-count is-complete">
                  <Check size={14} strokeWidth={2.5} aria-hidden="true" /> Tamam
                </span>
              ) : (
                <span className="slot-count num">
                  {count}/{group.length}
                </span>
              )}
            </div>
            <ol className="steps">
              {group.map((item, index) => (
                <Step key={item.id} item={item} index={index + 1} done={isDone(item.id)} today={today} onToggle={(d) => setDone(today, item.id, d)} />
              ))}
            </ol>
          </section>
        );
      })}

      <section className="slot-block" aria-labelledby="slot-beslenme">
        <div className="slot-head">
          <h2 id="slot-beslenme" className="tag tag-food">
            Beslenme
          </h2>
          <Link href="/beslenme/takip" className="slot-link">
            Takip <ChevronRight size={14} />
          </Link>
        </div>
        {meals.length > 0 && (
          <ol className="steps">
            {meals.map((m) => {
              const d = mealsDone.has(m.meal);
              return (
                <li key={m.meal} className={`step${d ? " is-done" : ""}`}>
                  <button type="button" className="step-main" aria-pressed={d} onClick={() => toggleMeal(m.meal)}>
                    <span className="step-check" aria-hidden="true">
                      {d ? <Check size={16} strokeWidth={3} /> : <Salad size={15} />}
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
          </ol>
        )}
        <div className="today-water">
          <WaterCounter day={today} initial={water.initial} target={water.target} glassMl={water.glassMl} sportDay={water.sportDay} onChange={setGlasses} />
        </div>
      </section>

      {workout.planned && (
        <section className="slot-block" aria-labelledby="slot-spor">
          <div className="slot-head">
            <h2 id="slot-spor" className="tag tag-sport">
              Spor
            </h2>
            <Link href="/spor/kayit" className="slot-link">
              Antrenman kaydı <ChevronRight size={14} />
            </Link>
          </div>
          <div className={`step${workoutDone ? " is-done" : ""}`}>
            <button type="button" className="step-main" aria-pressed={workoutDone} onClick={toggleWorkout}>
              <span className="step-check" aria-hidden="true">
                {workoutDone ? <Check size={16} strokeWidth={3} /> : <Dumbbell size={15} />}
              </span>
              <span className="step-text">
                <span className="step-title">{workout.title || "Antrenman"}</span>
                <span className="step-sub">{workout.count} hareket · setleri Antrenman kaydı sayfasında gir</span>
              </span>
            </button>
          </div>
        </section>
      )}

      {weekly.length > 0 && (
        <section className="slot-block" aria-labelledby="slot-haftalik">
          <div className="slot-head">
            <h2 id="slot-haftalik" className="tag" data-slot="haftalik">
              Haftalık hedefler
            </h2>
          </div>
          {weeklyVisible.length ? (
            <ol className="steps">
              {weeklyVisible.map((item) => (
                <Step
                  key={item.id}
                  item={item}
                  done={isDone(item.id)}
                  today={today}
                  meta={`${weeklyCount(item.id, week, checked)}/${item.weeklyTarget} bu hafta`}
                  onToggle={(d) => setDone(today, item.id, d)}
                />
              ))}
            </ol>
          ) : (
            <p className="form-ok row">
              <Check size={16} strokeWidth={2.5} aria-hidden="true" /> Bu haftanın hedefleri tamam.
            </p>
          )}
        </section>
      )}

      {asNeeded.length > 0 && (
        <details className="slot-block as-needed" open={asNeeded.some((i) => isDone(i.id))}>
          <summary>
            <span className="tag" data-slot="gerektiginde">
              Gerektiğinde
            </span>
            <span className="muted">İşaretlenmezse kaçırılmış sayılmaz</span>
            <ChevronDown size={18} className="chev" aria-hidden="true" />
          </summary>
          <ol className="steps">
            {asNeeded.map((item) => (
              <Step key={item.id} item={item} done={isDone(item.id)} today={today} onToggle={(d) => setDone(today, item.id, d)} />
            ))}
          </ol>
        </details>
      )}

      <Toast message={error} onDone={clearError} />
      <Toast message={localError} onDone={clearLocal} />
    </>
  );
}

function Step({
  item,
  index,
  done,
  today,
  meta,
  onToggle,
}: {
  item: TodayItem;
  index?: number;
  done: boolean;
  today: string;
  meta?: string;
  onToggle: (done: boolean) => void;
}) {
  const { timers, now, start, stop } = useTimers();
  const running = timers.find((t) => t.itemId === item.id);
  const left = running ? (running.endsAt - now) / 1000 : 0;

  return (
    <li className={`step${done ? " is-done" : ""}`}>
      <button type="button" className="step-main" aria-pressed={done} onClick={() => onToggle(!done)}>
        <span className="step-check" aria-hidden="true">
          {done ? <Check size={16} strokeWidth={3} /> : index ? <span className="num">{index}</span> : null}
        </span>
        <ProductThumb src={item.image} alt="" size="sm" tooth={!item.productName && /diş/i.test(item.label)} />
        <span className="step-text">
          <span className="step-title">
            {item.label}
            <span className="sr-only">{done ? " (yapıldı)" : " (bekliyor)"}</span>
          </span>
          {item.detail && <span className="step-sub">{item.detail}</span>}
          {meta && <span className="step-meta num">{meta}</span>}
        </span>
      </button>

      {item.timers.length > 0 && (
        <div className="step-timer">
          {running ? (
            <>
              <span className="timer-left num" aria-live="off">
                {formatClock(left)}
              </span>
              <button type="button" className="timer-stop" onClick={() => stop(item.id)} aria-label="Sayacı durdur">
                <Square size={14} />
              </button>
            </>
          ) : (
            item.timers.map((seconds) => (
              <button
                key={seconds}
                type="button"
                className="timer-btn"
                onClick={() => start({ itemId: item.id, day: today, label: item.label, seconds })}
                aria-label={`${item.label} için ${formatDuration(seconds)} sayacı başlat`}
              >
                <Play size={14} aria-hidden="true" />
                {item.timers.length === 1 ? `Başlat · ${formatDuration(seconds)}` : formatDuration(seconds)}
              </button>
            ))
          )}
        </div>
      )}
      {running && (
        <span className="step-progress" style={{ width: `${Math.min(100, (1 - left / running.total) * 100)}%` }} aria-hidden="true" />
      )}
    </li>
  );
}
