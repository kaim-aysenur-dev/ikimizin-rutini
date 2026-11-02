"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";
import type { Template, WaterSettings } from "@/lib/nutrition";

/** Şablonlar: mevcut planı kaydet, şablonu uygula, sil */
export function TemplatesCard({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState<{ id: string; action: "apply" | "delete" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ ok: true, text: ok });
      setConfirm(null);
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "İşlem yapılamadı." });
    }
    setBusy(false);
  }

  return (
    <section className="card stack" aria-labelledby="tpl-title">
      <div>
        <h2 id="tpl-title">Şablonlar</h2>
        <p className="muted">Haftalık planı şablon olarak sakla; istediğin zaman geri yükle.</p>
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => api("/api/nutrition/templates", { body: { name } }), "Plan şablon olarak kaydedildi.").then(() => setName(""));
        }}
      >
        <input className="input grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="Şablon adı (ör. Ekmeksiz akşam)" aria-label="Şablon adı" />
        <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length < 2}>
          Kaydet
        </button>
      </form>
      {templates.length > 0 && (
        <ul className="plain-list">
          {templates.map((t) => (
            <li key={t.id} className="list-row">
              <span className="grow">
                <strong>{t.name}</strong>
                <span className="muted small"> · {t.meals} öğün · {formatDate(t.updatedAt)}</span>
              </span>
              {confirm?.id === t.id ? (
                <>
                  <button
                    type="button"
                    className={confirm.action === "apply" ? "btn btn-primary" : "btn btn-danger"}
                    disabled={busy}
                    onClick={() =>
                      confirm.action === "apply"
                        ? run(() => api(`/api/nutrition/templates/${t.id}`, { method: "POST" }), `"${t.name}" planına geçildi.`)
                        : run(() => api(`/api/nutrition/templates/${t.id}`, { method: "DELETE" }), "Şablon silindi.")
                    }
                  >
                    {confirm.action === "apply" ? "Planı değiştir" : "Sil"}
                  </button>
                  <button type="button" className="btn btn-quiet" onClick={() => setConfirm(null)}>
                    Vazgeç
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-quiet" onClick={() => setConfirm({ id: t.id, action: "apply" })}>
                    Uygula
                  </button>
                  <button type="button" className="icon-btn" onClick={() => setConfirm({ id: t.id, action: "delete" })} aria-label={`${t.name} şablonunu sil`}>
                    <Trash size={16} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {confirm?.action === "apply" && <p className="hint">Uygularsan mevcut haftalık planın bu şablonla değişir.</p>}
      {message && <p className={message.ok ? "form-ok" : "form-error"}>{message.text}</p>}
    </section>
  );
}

/** Su hedefi: bardak hacmi, normal gün ve spor günü hedefi */
export function WaterSettingsCard({ settings }: { settings: WaterSettings }) {
  const router = useRouter();
  const [v, setV] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const liters = (glasses: number) => ((glasses * v.glassMl) / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  const set = (k: keyof WaterSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: Number(e.target.value) }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/nutrition/settings", { method: "PUT", body: v });
      setMessage({ ok: true, text: "Su hedefi kaydedildi." });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Kaydedilemedi." });
    }
    setBusy(false);
  }

  return (
    <form className="card stack" onSubmit={save} aria-labelledby="water-title">
      <div>
        <h2 id="water-title">Su hedefi</h2>
        <p className="muted">Spor günleri, spor planında hareket olan günlerdir.</p>
      </div>
      <div className="form-grid three">
        <div className="field">
          <label htmlFor="w-glass">Bardak (ml)</label>
          <input id="w-glass" className="input" type="number" inputMode="numeric" min={50} max={1000} step={10} value={v.glassMl} onChange={set("glassMl")} />
        </div>
        <div className="field">
          <label htmlFor="w-target">Normal gün (bardak)</label>
          <input id="w-target" className="input" type="number" inputMode="numeric" min={1} max={40} value={v.target} onChange={set("target")} />
          <span className="hint">≈ {liters(v.target)} L</span>
        </div>
        <div className="field">
          <label htmlFor="w-sport">Spor günü (bardak)</label>
          <input id="w-sport" className="input" type="number" inputMode="numeric" min={1} max={40} value={v.targetSport} onChange={set("targetSport")} />
          <span className="hint">≈ {liters(v.targetSport)} L</span>
        </div>
      </div>
      {message && <p className={message.ok ? "form-ok" : "form-error"}>{message.text}</p>}
      <div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Kaydet
        </button>
      </div>
    </form>
  );
}
