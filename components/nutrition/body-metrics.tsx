"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "lucide-react";
import { Toast } from "@/components/toast";
import { api } from "@/lib/api-client";
import { diffDays, formatDate, formatDayShort, weekStart } from "@/lib/dates";

export type BodyField = "weight" | "waist" | "hip" | "chest" | "arm" | "thigh";
export type BodyEntry = { day: string; note: string } & Record<BodyField, number | null>;

const FIELDS: { key: BodyField; label: string; unit: string }[] = [
  { key: "weight", label: "Kilo", unit: "kg" },
  { key: "waist", label: "Bel", unit: "cm" },
  { key: "hip", label: "Kalça", unit: "cm" },
  { key: "chest", label: "Göğüs", unit: "cm" },
  { key: "arm", label: "Kol", unit: "cm" },
  { key: "thigh", label: "Uyluk", unit: "cm" },
];

const fmt = (n: number, digits = 1) => n.toLocaleString("tr-TR", { maximumFractionDigits: digits });

export function BodyMetrics({ entries, today }: { entries: BodyEntry[]; today: string }) {
  const router = useRouter();
  const find = (day: string) => entries.find((e) => e.day === day);
  const blank = () => Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as Record<BodyField, string>;
  const fromEntry = (e?: BodyEntry) =>
    e ? (Object.fromEntries(FIELDS.map((f) => [f.key, e[f.key] === null ? "" : String(e[f.key]).replace(".", ",")])) as Record<BodyField, string>) : blank();
  const [day, setDay] = useState(today);
  const [values, setValues] = useState(() => fromEntry(find(today)));
  const [note, setNote] = useState(() => find(today)?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  function pick(d: string) {
    setDay(d);
    setValues(fromEntry(find(d)));
    setNote(find(d)?.note ?? "");
    setMessage(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/nutrition/body", { method: "PUT", body: { day, values, note } });
      setMessage({ ok: true, text: `${formatDate(day)} kaydedildi.` });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Kaydedilemedi." });
    }
    setBusy(false);
  }

  async function remove(d: string) {
    try {
      await api(`/api/nutrition/body?day=${d}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  const first = (f: BodyField) => entries.find((e) => e[f] !== null)?.[f] ?? null;
  const last = (f: BodyField) => [...entries].reverse().find((e) => e[f] !== null)?.[f] ?? null;

  return (
    <div className="stack">
      <form className="card stack" onSubmit={save} aria-labelledby="olcu-form">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h2 id="olcu-form">{find(day) ? "Kaydı güncelle" : "Yeni ölçüm"}</h2>
          <input type="date" className="input date-input" value={day} max={today} onChange={(e) => e.target.value && pick(e.target.value)} aria-label="Tarih" />
        </div>
        <div className="form-grid three">
          {FIELDS.map((f) => (
            <div key={f.key} className="field">
              <label htmlFor={`b-${f.key}`}>
                {f.label} <span className="muted">({f.unit})</span>
              </label>
              <input
                id={`b-${f.key}`}
                className="input"
                inputMode="decimal"
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder="—"
              />
            </div>
          ))}
        </div>
        <div className="field">
          <label htmlFor="b-note">Not</label>
          <input id="b-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ör. Sabah aç karnına" maxLength={500} />
        </div>
        <p className="hint">Kiloyu her gün aynı saatte (ör. sabah, aç karnına) ölçmek dalgalanmayı azaltır. Boş bıraktığın alanlar kaydedilmez.</p>
        {message && <p className={message.ok ? "form-ok" : "form-error"}>{message.text}</p>}
        <div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </form>

      <WeightChart entries={entries} />

      {entries.length > 0 && (
        <section className="card stack" aria-labelledby="olculer-ozet">
          <h2 id="olculer-ozet">Ölçüler</h2>
          <div className="stats">
            {FIELDS.filter((f) => last(f.key) !== null).map((f) => {
              const a = first(f.key)!;
              const b = last(f.key)!;
              const delta = b - a;
              return (
                <div key={f.key} className="stat">
                  <span className="stat-label">{f.label}</span>
                  <span className="stat-value">
                    {fmt(b)} <small className="muted">{f.unit}</small>
                  </span>
                  {delta !== 0 && (
                    <span className="small muted">
                      {delta < 0 ? "▼" : "▲"} {fmt(Math.abs(delta))} {f.unit} ilk kayda göre
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="score-table-wrap">
            <table className="score-table">
              <thead>
                <tr>
                  <th scope="col">Tarih</th>
                  {FIELDS.map((f) => (
                    <th key={f.key} scope="col">
                      {f.label}
                    </th>
                  ))}
                  <th scope="col">
                    <span className="sr-only">Sil</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().slice(0, 30).map((e) => (
                  <tr key={e.day}>
                    <th scope="row">
                      <button type="button" className="link-btn" onClick={() => pick(e.day)}>
                        {formatDayShort(e.day)}
                      </button>
                    </th>
                    {FIELDS.map((f) => (
                      <td key={f.key} className="num">
                        {e[f.key] === null ? "–" : fmt(e[f.key]!)}
                      </td>
                    ))}
                    <td>
                      <button type="button" className="icon-btn" onClick={() => remove(e.day)} aria-label={`${formatDate(e.day)} kaydını sil`}>
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <Toast message={error} onDone={clearError} />
    </div>
  );
}

/* ---------- kilo grafiği: günlük noktalar soluk, haftalık ortalama çizgi ---------- */

const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

function WeightChart({ entries }: { entries: BodyEntry[] }) {
  const daily = entries.filter((e) => e.weight !== null).map((e) => ({ day: e.day, v: e.weight! }));
  const weekly = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const d of daily) map.set(weekStart(d.day), [...(map.get(weekStart(d.day)) ?? []), d.v]);
    return [...map.entries()].map(([week, vs]) => ({ week, v: vs.reduce((a, b) => a + b, 0) / vs.length, n: vs.length }));
  }, [daily]);
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (daily.length < 2) {
    return (
      <section className="card">
        <h2>Kilo</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          Grafik için en az iki kilo kaydı gerekiyor.
        </p>
      </section>
    );
  }

  const first = daily[0]!.day;
  const lastDay = daily.at(-1)!.day;
  const span = Math.max(1, diffDays(lastDay, first));
  const x = (day: string) => PAD.left + (diffDays(day, first) / span) * (W - PAD.left - PAD.right);
  const values = daily.map((d) => d.v);
  const lo = Math.floor(Math.min(...values) - 0.5);
  const hi = Math.ceil(Math.max(...values) + 0.5);
  const y = (v: number) => PAD.top + ((hi - v) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
  // haftalık ortalama, haftanın ortasına (Perşembe) çizilir; ilk/son kayıt sınırına kırpılır
  const wx = (week: string) => {
    const mid = new Date(`${week}T00:00:00Z`);
    mid.setUTCDate(mid.getUTCDate() + 3);
    const iso = mid.toISOString().slice(0, 10);
    return x(iso < first ? first : iso > lastDay ? lastDay : iso);
  };
  const ticks = Array.from(new Set([lo, Math.round((lo + hi) / 2), hi]));
  const path = weekly.map((w, i) => `${i ? "L" : "M"}${wx(w.week).toFixed(1)},${y(w.v).toFixed(1)}`).join("");
  const point = active !== null ? weekly[active] : null;
  const change = weekly.length > 1 ? weekly.at(-1)!.v - weekly[0]!.v : 0;

  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    weekly.forEach((w, i) => {
      if (Math.abs(wx(w.week) - px) < Math.abs(wx(weekly[best]!.week) - px)) best = i;
    });
    setActive(best);
  }

  return (
    <section className="card stack" aria-labelledby="kilo-grafik">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <h2 id="kilo-grafik">Kilo</h2>
        <span className="small muted">
          son haftalık ort. <strong className="num">{fmt(weekly.at(-1)!.v)} kg</strong>
          {change !== 0 && ` · ${change < 0 ? "▼" : "▲"} ${fmt(Math.abs(change))} kg`}
        </span>
      </div>
      <ul className="chart-legend" aria-label="Gösterim">
        <li>
          <span className="key-line" /> Haftalık ortalama
        </li>
        <li>
          <span className="key-dot" /> Günlük ölçüm
        </li>
      </ul>
      <div className="mini-plot">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Kilo: ${daily.length} ölçüm, son haftalık ortalama ${fmt(weekly.at(-1)!.v)} kg`}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="grid" />
              <text x={PAD.left - 8} y={y(t)} className="tick" textAnchor="end" dominantBaseline="middle">
                {t}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={H - 8} className="tick">
            {formatDayShort(first)}
          </text>
          <text x={W - PAD.right} y={H - 8} className="tick" textAnchor="end">
            {formatDayShort(lastDay)}
          </text>
          {daily.map((d) => (
            <circle key={d.day} cx={x(d.day)} cy={y(d.v)} r={3} className="dot-muted" />
          ))}
          {point && <line x1={wx(point.week)} x2={wx(point.week)} y1={PAD.top} y2={H - PAD.bottom} className="crosshair" />}
          <path d={path} className="series" />
          {weekly.map((w, i) => (
            <circle key={w.week} cx={wx(w.week)} cy={y(w.v)} r={i === active ? 6 : 4} className="dot" />
          ))}
        </svg>
        {point && (
          <div className="chart-tip" style={{ left: `${(wx(point.week) / W) * 100}%`, top: `${(y(point.v) / H) * 100}%` }}>
            <span>{formatDate(point.week)} haftası</span>
            <strong className="num">{fmt(point.v)} kg</strong>
            <span>{point.n} ölçüm</span>
          </div>
        )}
      </div>
    </section>
  );
}
