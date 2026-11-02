"use client";

import { useMemo, useRef, useState } from "react";
import { diffDays, formatDayShort, formatDate } from "@/lib/dates";
import { SKIN_METRICS, type SkinMetric } from "@/lib/slots";

// Puanların zaman içindeki seyri: her ölçüt için ayrı küçük çizgi grafik (tek seri, tek renk).
// x ekseni gerçek tarihe orantılı; y ekseni 1–5. Dokununca / üzerine gelince ipucu.

export type ScorePoint = { day: string; scores: Partial<Record<SkinMetric, number | null>> };

const RANGES = [
  { key: "30", label: "Son 30 gün", days: 30 },
  { key: "90", label: "Son 90 gün", days: 90 },
  { key: "all", label: "Tümü", days: Infinity },
] as const;

const W = 320;
const H = 132;
const PAD = { top: 12, right: 14, bottom: 24, left: 26 };

export function ScoreCharts({ points, metrics, today }: { points: ScorePoint[]; metrics: SkinMetric[]; today: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("90");
  const [table, setTable] = useState(false);
  const days = RANGES.find((r) => r.key === range)!.days;
  const visible = useMemo(
    () => points.filter((p) => diffDays(today, p.day) < days).sort((a, b) => (a.day < b.day ? -1 : 1)),
    [points, days, today],
  );

  return (
    <section className="card stack" aria-labelledby="seyir">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <h2 id="seyir">Puanların seyri</h2>
          <p className="muted">1 = hiç / az, 5 = çok. Aşağı inen çizgi iyiye gidiş demek.</p>
        </div>
      </div>
      <div className="row chart-filters">
        <div className="chips" role="radiogroup" aria-label="Zaman aralığı">
          {RANGES.map((r) => (
            <button key={r.key} type="button" role="radio" className="chip" aria-checked={range === r.key} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
        <button type="button" className="chip" aria-pressed={table} onClick={() => setTable((v) => !v)}>
          Tablo
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="muted">Bu aralıkta kayıt yok.</p>
      ) : table ? (
        <div className="score-table-wrap">
          <table className="score-table">
            <thead>
              <tr>
                <th scope="col">Tarih</th>
                {metrics.map((m) => (
                  <th key={m} scope="col">
                    {SKIN_METRICS[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...visible].reverse().map((p) => (
                <tr key={p.day}>
                  <th scope="row">{formatDayShort(p.day)}</th>
                  {metrics.map((m) => (
                    <td key={m} className="num">
                      {p.scores[m] ?? "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="charts-grid">
          {metrics.map((m) => (
            <MiniChart key={m} metric={m} points={visible} />
          ))}
        </div>
      )}
    </section>
  );
}

function MiniChart({ metric, points }: { metric: SkinMetric; points: ScorePoint[] }) {
  const data = points.filter((p) => p.scores[metric]).map((p) => ({ day: p.day, v: p.scores[metric]! }));
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const first = data[0]?.day;
  const last = data.at(-1)?.day;
  const span = first && last ? Math.max(1, diffDays(last, first)) : 1;
  const x = (day: string) =>
    data.length === 1 ? PAD.left + (W - PAD.left - PAD.right) / 2 : PAD.left + (diffDays(day, first!) / span) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + ((5 - v) / 4) * (H - PAD.top - PAD.bottom);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(d.day).toFixed(1)},${y(d.v).toFixed(1)}`).join("");
  const latest = data.at(-1);
  const change = data.length > 1 ? data.at(-1)!.v - data[0]!.v : 0;

  function onPointer(event: React.PointerEvent<SVGSVGElement>) {
    if (!data.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    let best = 0;
    data.forEach((d, i) => {
      if (Math.abs(x(d.day) - px) < Math.abs(x(data[best]!.day) - px)) best = i;
    });
    setActive(best);
  }

  const point = active !== null ? data[active] : null;

  return (
    <figure className="mini-chart">
      <figcaption>
        <span className="mini-title">{SKIN_METRICS[metric]}</span>
        {latest && (
          <span className="mini-latest">
            son <span className="num">{latest.v}</span>
            {change !== 0 && (
              <span className={`mini-delta ${change < 0 ? "good" : "bad"}`}>
                {change < 0 ? "▼" : "▲"} {Math.abs(change)}
              </span>
            )}
          </span>
        )}
      </figcaption>
      {data.length === 0 ? (
        <p className="muted small">Bu ölçüt için puan yok.</p>
      ) : (
        <div className="mini-plot">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`${SKIN_METRICS[metric]}: ${data.length} kayıt, son puan ${latest!.v}`}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={() => setActive(null)}
          >
            {[1, 2, 3, 4, 5].map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="grid" />
                {v % 2 === 1 && (
                  <text x={PAD.left - 8} y={y(v)} className="tick" textAnchor="end" dominantBaseline="middle">
                    {v}
                  </text>
                )}
              </g>
            ))}
            <text x={PAD.left} y={H - 6} className="tick">
              {formatDayShort(first!)}
            </text>
            {data.length > 1 && (
              <text x={W - PAD.right} y={H - 6} className="tick" textAnchor="end">
                {formatDayShort(last!)}
              </text>
            )}
            {point && <line x1={x(point.day)} x2={x(point.day)} y1={PAD.top} y2={H - PAD.bottom} className="crosshair" />}
            <path d={path} className="series" />
            {data.map((d, i) => (
              <circle key={d.day} cx={x(d.day)} cy={y(d.v)} r={i === active ? 6 : 4} className="dot" />
            ))}
          </svg>
          {point && (
            <div
              className="chart-tip"
              style={{
                left: `${(x(point.day) / W) * 100}%`,
                top: `${(y(point.v) / H) * 100}%`,
              }}
            >
              <span>{formatDate(point.day)}</span>
              <strong className="num">{point.v}</strong>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
