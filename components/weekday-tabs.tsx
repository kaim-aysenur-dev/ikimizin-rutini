"use client";

import { WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/dates";

/** Pazartesi–Pazar seçici. marks: o günde içerik var mı (nokta gösterir) */
export function WeekdayTabs({
  value,
  onChange,
  today,
  marks,
}: {
  value: number;
  onChange: (weekday: number) => void;
  today: number;
  marks?: boolean[];
}) {
  return (
    <div className="weekday-tabs" role="tablist" aria-label="Gün">
      {WEEKDAY_SHORT.map((label, i) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={value === i}
          aria-label={`${WEEKDAY_LONG[i]}${i === today ? " (bugün)" : ""}`}
          className={`weekday-tab${i === today ? " is-today" : ""}`}
          onClick={() => onChange(i)}
        >
          {label}
          <span className={`weekday-dot${marks?.[i] ? " on" : ""}`} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
