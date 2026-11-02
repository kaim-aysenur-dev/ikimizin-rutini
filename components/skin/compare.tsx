"use client";

import { useState } from "react";
import { formatDate } from "@/lib/dates";
import { SKIN_METRICS, type SkinMetric } from "@/lib/slots";

export type PhotoEntry = {
  day: string;
  photo: string;
  scores: Partial<Record<SkinMetric, number | null>>;
};

/** Önce / sonra: iki tarihli fotoğrafı yan yana karşılaştırma */
export function Compare({ photos, metrics }: { photos: PhotoEntry[]; metrics: SkinMetric[] }) {
  // photos tarihe göre artan
  const [before, setBefore] = useState(photos[0]!.day);
  const [after, setAfter] = useState(photos.at(-1)!.day);
  const a = photos.find((p) => p.day === before)!;
  const b = photos.find((p) => p.day === after)!;

  return (
    <section className="card stack" aria-labelledby="karsilastir">
      <div>
        <h2 id="karsilastir">Önce / sonra</h2>
        <p className="muted">İki tarih seç; fotoğraflar ve puanlar yan yana gelsin.</p>
      </div>
      <div className="compare">
        {[
          { title: "Önce", entry: a, value: before, set: setBefore },
          { title: "Sonra", entry: b, value: after, set: setAfter },
        ].map(({ title, entry, value, set }) => (
          <figure key={title} className="compare-side">
            <label className="field">
              <span className="field-label">{title}</span>
              <select className="input" value={value} onChange={(e) => set(e.target.value)}>
                {photos.map((p) => (
                  <option key={p.day} value={p.day}>
                    {formatDate(p.day)}
                  </option>
                ))}
              </select>
            </label>
            <div className="compare-photo">
              <img src={entry.photo} alt={`${formatDate(entry.day)} cilt fotoğrafı`} />
            </div>
            <figcaption className="score-chips">
              {metrics
                .filter((m) => entry.scores[m])
                .map((m) => (
                  <span key={m} className="score-chip" data-level={entry.scores[m]}>
                    {SKIN_METRICS[m]} <span className="num">{entry.scores[m]}</span>
                  </span>
                ))}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
