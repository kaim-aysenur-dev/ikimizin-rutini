"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { ALL_SKIN_METRICS, SKIN_METRICS, type SkinMetric } from "@/lib/slots";

/** Cilt günlüğünde hangi ölçütlerin puanlanacağı */
export function SkinMetricsForm({ initial }: { initial: SkinMetric[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<SkinMetric[]>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const changed = selected.join() !== initial.join();

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/profile", { method: "PATCH", body: { skinMetrics: selected } });
      setMessage({ ok: true, text: "Kaydedildi." });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Kaydedilemedi." });
    }
    setBusy(false);
  }

  return (
    <div className="stack">
      <div className="chips" role="group" aria-label="Cilt günlüğü ölçütleri">
        {ALL_SKIN_METRICS.map((m) => (
          <button
            key={m}
            type="button"
            className="chip"
            aria-pressed={selected.includes(m)}
            onClick={() =>
              setSelected((s) => (s.includes(m) ? s.filter((x) => x !== m) : ALL_SKIN_METRICS.filter((x) => x === m || s.includes(x))))
            }
          >
            {SKIN_METRICS[m]}
          </button>
        ))}
      </div>
      {message && <p className={message.ok ? "form-ok" : "form-error"}>{message.text}</p>}
      <div>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !changed || selected.length === 0}>
          Kaydet
        </button>
      </div>
    </div>
  );
}
