"use client";

import { useEffect, useRef, useState } from "react";
import { GlassWater, Minus, Plus } from "lucide-react";
import { api } from "@/lib/api-client";

/** Su (bardak) sayacı. Dokunuşlar hemen görünür, sunucuya kısa bir beklemeyle tek seferde yazılır. */
export function WaterCounter({
  day,
  initial,
  target,
  glassMl,
  sportDay,
  onChange,
}: {
  day: string;
  initial: number;
  target: number;
  glassMl: number;
  sportDay?: boolean;
  onChange?: (glasses: number) => void;
}) {
  const [glasses, setGlasses] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const saved = useRef(initial);
  // Hızlı art arda dokunuşlarda da en güncel değerden say
  const current = useRef(initial);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function change(delta: number) {
    const value = Math.max(0, Math.min(40, current.current + delta));
    current.current = value;
    setGlasses(value);
    onChange?.(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        await api("/api/nutrition/day", { method: "PUT", body: { day, water: value } });
        saved.current = value;
        setError(null);
      } catch (err) {
        current.current = saved.current;
        setGlasses(saved.current);
        onChange?.(saved.current);
        setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      }
    }, 450);
  }

  const liters = (n: number) => ((n * glassMl) / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  const reached = glasses >= target;

  return (
    <div className={`water${reached ? " is-done" : ""}`}>
      <div className="water-head">
        <GlassWater size={20} aria-hidden="true" />
        <div className="water-text">
          <strong>
            <span className="num">{glasses}</span>/<span className="num">{target}</span> bardak
          </strong>
          <span className="muted small">
            {liters(glasses)} L / {liters(target)} L{sportDay ? " · spor günü" : ""}
          </span>
        </div>
        <div className="water-buttons">
          <button type="button" className="icon-btn" onClick={() => change(-1)} disabled={glasses === 0} aria-label="Bir bardak azalt">
            <Minus size={18} />
          </button>
          <button type="button" className="water-add" onClick={() => change(1)} aria-label="Bir bardak ekle">
            <Plus size={18} /> Bardak
          </button>
        </div>
      </div>
      <div className="water-glasses" aria-hidden="true">
        {Array.from({ length: Math.max(target, glasses) }, (_, i) => (
          <span key={i} className={i < glasses ? "on" : ""} />
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
