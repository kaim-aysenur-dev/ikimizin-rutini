"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Minus, Pencil, Plus, Trash } from "lucide-react";
import { ProductThumb } from "@/components/product-thumb";
import { api } from "@/lib/api-client";
import { SLOTS, SLOT_LABEL, TIMER_PRESETS, formatDuration, type Slot } from "@/lib/slots";

export type EditStep = {
  id: string;
  slot: Slot;
  label: string;
  detail: string;
  weeklyTarget: number | null;
  timers: number[];
  productTimers: number[];
  productId: string | null;
  productName: string | null;
  image: string | null;
};

/** Rutin adımları: sırala, düzenle (ad, açıklama, sayaç, haftalık hedef), kaldır, ürünsüz adım ekle */
export function RoutineEditor({ steps }: { steps: EditStep[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem yapılamadı.");
    }
  }

  return (
    <div className="stack">
      {error && <p className="form-error">{error}</p>}
      {SLOTS.map((slot) => {
        const group = steps.filter((s) => s.slot === slot);
        return (
          <section key={slot} className="card stack" aria-label={SLOT_LABEL[slot]}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <span className="tag" data-slot={slot}>
                {SLOT_LABEL[slot]}
              </span>
              {editing !== `yeni-${slot}` && (
                <button type="button" className="btn btn-quiet" onClick={() => setEditing(`yeni-${slot}`)}>
                  <Plus size={16} /> Adım ekle
                </button>
              )}
            </div>
            {group.length === 0 && editing !== `yeni-${slot}` && <p className="muted small">Bu grupta adım yok.</p>}
            <ol className="plan-list">
              {group.map((s, i) =>
                editing === s.id ? (
                  <li key={s.id}>
                    <StepForm step={s} slot={slot} onDone={() => setEditing(null)} />
                  </li>
                ) : (
                  <li key={s.id} className="plan-item">
                    <ProductThumb src={s.image} alt="" size="xs" tooth={!s.productId && /diş/i.test(s.label)} />
                    <div className="grow">
                      <strong>{s.label}</strong>
                      <span className="muted small">
                        {s.productName ?? "Ürünsüz adım"}
                        {slot === "haftalik" && s.weeklyTarget ? ` · haftada ${s.weeklyTarget}` : ""}
                        {(s.timers.length ? s.timers : s.productTimers).length
                          ? ` · sayaç ${(s.timers.length ? s.timers : s.productTimers).map(formatDuration).join(" / ")}`
                          : ""}
                      </span>
                    </div>
                    <div className="plan-actions">
                      <button type="button" className="icon-btn" disabled={i === 0} onClick={() => call(() => api(`/api/skin/routine/${s.id}`, { method: "PATCH", body: { move: -1 } }))} aria-label="Yukarı taşı">
                        <ArrowUp size={16} />
                      </button>
                      <button type="button" className="icon-btn" disabled={i === group.length - 1} onClick={() => call(() => api(`/api/skin/routine/${s.id}`, { method: "PATCH", body: { move: 1 } }))} aria-label="Aşağı taşı">
                        <ArrowDown size={16} />
                      </button>
                      <button type="button" className="icon-btn" onClick={() => setEditing(s.id)} aria-label={`${s.label} düzenle`}>
                        <Pencil size={16} />
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ol>
            {editing === `yeni-${slot}` && <StepForm slot={slot} onDone={() => setEditing(null)} />}
          </section>
        );
      })}
    </div>
  );
}

function StepForm({ step, slot, onDone }: { step?: EditStep; slot: Slot; onDone: () => void }) {
  const router = useRouter();
  const [label, setLabel] = useState(step?.label ?? "");
  const [detail, setDetail] = useState(step?.detail ?? "");
  const [timers, setTimers] = useState<number[]>(step?.timers ?? []);
  const [target, setTarget] = useState(step?.weeklyTarget ?? 2);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uid = step?.id ?? `yeni-${slot}`;

  async function run(action: "save" | "delete") {
    setBusy(true);
    setError(null);
    const body = { label, detail, timers, weeklyTarget: slot === "haftalik" ? target : null };
    try {
      if (action === "delete") await api(`/api/skin/routine/${step!.id}`, { method: "DELETE" });
      else if (step) await api(`/api/skin/routine/${step.id}`, { method: "PATCH", body });
      else await api("/api/skin/routine", { body: { ...body, slot } });
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }

  return (
    <form
      className="card stack plan-form"
      onSubmit={(e) => {
        e.preventDefault();
        void run("save");
      }}
    >
      {step?.productName && <p className="muted small">Ürün: {step.productName}</p>}
      <div className="form-grid two">
        <div className="field">
          <label htmlFor={`st-label-${uid}`}>Adım adı</label>
          <input id={`st-label-${uid}`} className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ör. Diş (florürlü macun)" maxLength={60} autoFocus />
        </div>
        <div className="field">
          <label htmlFor={`st-detail-${uid}`}>Kısa açıklama</label>
          <input id={`st-detail-${uid}`} className="input" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={step?.productId ? "Boşsa ürünün 'nereye · süre' bilgisi" : "Ör. 2 dk, florürlü macunla"} maxLength={200} />
        </div>
      </div>
      {slot === "haftalik" && (
        <div className="stepper" role="group" aria-label="Haftalık hedef">
          <button type="button" className="icon-btn" onClick={() => setTarget((v) => Math.max(1, v - 1))} aria-label="Azalt">
            <Minus size={18} />
          </button>
          <span className="num stepper-value">Haftada {target}</span>
          <button type="button" className="icon-btn" onClick={() => setTarget((v) => Math.min(7, v + 1))} aria-label="Artır">
            <Plus size={18} />
          </button>
        </div>
      )}
      <div className="field">
        <span className="field-label">Bekleme sayacı</span>
        <div className="chips" role="group" aria-label="Sayaç süreleri">
          {TIMER_PRESETS.map((sec) => (
            <button
              key={sec}
              type="button"
              className="chip"
              aria-pressed={timers.includes(sec)}
              onClick={() => setTimers((t) => (t.includes(sec) ? t.filter((x) => x !== sec) : [...t, sec].sort((a, b) => a - b).slice(-3)))}
            >
              {formatDuration(sec)}
            </button>
          ))}
        </div>
        {step?.productId && <span className="hint">Seçmezsen ürünün sayacı kullanılır.</span>}
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy || label.trim().length < 2}>
          {step ? "Kaydet" : "Ekle"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={busy}>
          Vazgeç
        </button>
        {step &&
          (confirm ? (
            <button type="button" className="btn btn-danger" onClick={() => run("delete")} disabled={busy}>
              Evet, rutinden çıkar
            </button>
          ) : (
            <button type="button" className="icon-btn" onClick={() => setConfirm(true)} aria-label="Rutinden çıkar">
              <Trash size={16} />
            </button>
          ))}
      </div>
    </form>
  );
}
