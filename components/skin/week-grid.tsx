"use client";

import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { ProductThumb } from "@/components/product-thumb";
import { Toast } from "@/components/toast";
import { useChecks, useDayRollover } from "@/components/use-checks";
import { WEEKDAY_LONG, WEEKDAY_SHORT, dayOfMonth } from "@/lib/dates";
import { cellState, checkKey, weekSummary, weeklyCount, type CellState } from "@/lib/progress";
import { SLOTS, SLOT_LABEL, type Slot } from "@/lib/slots";

export type GridItem = {
  id: string;
  slot: Slot;
  label: string;
  weeklyTarget: number | null;
  since: string;
  productName: string | null;
  image: string | null;
};

type Props = {
  days: string[];
  today: string;
  rangeLabel: string;
  prevHref: string;
  nextHref: string;
  thisWeekHref: string | null;
  items: GridItem[];
  initialChecks: string[];
};

const STATE_LABEL: Record<CellState, string> = {
  done: "Yapıldı",
  missed: "Yapılmadı",
  pending: "Bekliyor",
  upcoming: "Sırada",
  open: "İşaretlenmedi",
};

export function WeekGrid({ days, today, rangeLabel, prevHref, nextHref, thisWeekHref, items, initialChecks }: Props) {
  const { checked, setDone, error, clearError } = useChecks(initialChecks);
  useDayRollover(today);
  const summary = weekSummary(items, days, today, checked);
  const total = summary.done + summary.missed + summary.pending + summary.upcoming;
  const pct = (n: number) => `${total ? (n / total) * 100 : 0}%`;

  return (
    <>
      <div className="week-nav">
        <Link href={prevHref} className="icon-btn" aria-label="Önceki hafta" scroll={false}>
          <ChevronLeft size={20} />
        </Link>
        <span className="week-range">{rangeLabel}</span>
        <Link href={nextHref} className="icon-btn" aria-label="Sonraki hafta" scroll={false}>
          <ChevronRight size={20} />
        </Link>
        {thisWeekHref ? (
          <Link href={thisWeekHref} className="btn btn-quiet week-today" scroll={false}>
            Bu hafta
          </Link>
        ) : (
          <span className="week-today-badge">Bu hafta</span>
        )}
      </div>

      <section className="stats" aria-label="Haftanın özeti">
        <div className="stat">
          <span className="stat-label">
            <span className="dot seg-ok" /> Yapıldı
          </span>
          <span className="stat-value">{summary.done}</span>
        </div>
        <div className="stat">
          <span className="stat-label">
            <span className="dot seg-bad" /> Yapılmadı
          </span>
          <span className="stat-value">{summary.missed}</span>
        </div>
        <div className="stat">
          <span className="stat-label">
            <span className="dot seg-wait" /> Bekliyor
          </span>
          <span className="stat-value">{summary.pending}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Tamamlanma</span>
          <span className="stat-value">{summary.percent === null ? "—" : `%${summary.percent}`}</span>
        </div>
      </section>
      <div
        className="bar week-bar"
        role="img"
        aria-label={`${summary.done} yapıldı, ${summary.missed} yapılmadı, ${summary.pending} bekliyor, ${summary.upcoming} sırada`}
      >
        <span className="seg-ok" style={{ width: pct(summary.done) }} />
        <span className="seg-bad" style={{ width: pct(summary.missed) }} />
        <span className="seg-wait" style={{ width: pct(summary.pending) }} />
      </div>
      <p className="hint week-hint">
        Tamamlanma, şu ana kadar yapılması gerekenlere göre hesaplanır. Gri kısım haftanın kalan günleri.
      </p>

      <div className="wk">
        <div className="wk-days">
          <span className="wk-corner" aria-hidden="true" />
          {days.map((day, i) => (
            <span
              key={day}
             
              className={`wk-day${day === today ? " is-today" : ""}`}
              aria-label={`${WEEKDAY_LONG[i]} ${dayOfMonth(day)}`}
            >
              {WEEKDAY_SHORT[i]}
              <span className="num">{dayOfMonth(day)}</span>
            </span>
          ))}
        </div>

        {SLOTS.map((slot) => {
          const group = items.filter((i) => i.slot === slot);
          if (!group.length) return null;
          return (
            <div key={slot} className="wk-group">
              <div className="wk-group-head">
                <span className="tag" data-slot={slot}>
                  {slot === "haftalik" ? "Haftalık hedef" : SLOT_LABEL[slot]}
                </span>
                {slot === "gerektiginde" && <span className="hint">İşaretlenmezse kaçırılmış sayılmaz</span>}
              </div>
              {group.map((item) => {
                const count = slot === "haftalik" ? weeklyCount(item.id, days, checked) : 0;
                return (
                  <div key={item.id} className="wk-row">
                    <div className="wk-item">
                      <ProductThumb src={item.image} alt="" size="xs" tooth={!item.productName && /diş/i.test(item.label)} />
                      <span className="wk-item-text">
                        <span className="wk-item-name">{item.label}</span>
                        {slot === "haftalik" && (
                          <span className={`wk-item-meta num${count >= (item.weeklyTarget ?? 1) ? " is-met" : ""}`}>
                            {count}/{item.weeklyTarget} bu hafta
                          </span>
                        )}
                      </span>
                    </div>
                    {days.map((day, i) => {
                      const done = checked.has(checkKey(day, item.id));
                      const state = cellState(item, day, today, done);
                      return (
                        <button
                          key={day}
                          type="button"
                         
                          className={`cell${day === today ? " is-today" : ""}`}
                          data-state={state}
                          disabled={state === "upcoming"}
                          aria-pressed={done}
                          aria-label={`${WEEKDAY_LONG[i]} ${dayOfMonth(day)}, ${item.label}: ${STATE_LABEL[state]}`}
                          onClick={() => setDone(day, item.id, !done)}
                        >
                          <CellIcon state={state} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <ul className="legend" aria-label="Durumlar">
        <li>
          <span className="cell mini" data-state="done">
            <Check size={12} strokeWidth={3} />
          </span>
          Yapıldı
        </li>
        <li>
          <span className="cell mini" data-state="missed">
            <X size={12} strokeWidth={3} />
          </span>
          Yapılmadı
        </li>
        <li>
          <span className="cell mini" data-state="pending">
            <Clock size={11} strokeWidth={2.5} />
          </span>
          Bekliyor
        </li>
        <li>
          <span className="cell mini" data-state="upcoming" />
          Sırada
        </li>
      </ul>
      <Toast message={error} onDone={clearError} />
    </>
  );
}

function CellIcon({ state }: { state: CellState }) {
  if (state === "done") return <Check size={18} strokeWidth={3} aria-hidden="true" />;
  if (state === "missed") return <X size={16} strokeWidth={3} aria-hidden="true" />;
  if (state === "pending") return <Clock size={15} strokeWidth={2.5} aria-hidden="true" />;
  return null;
}
