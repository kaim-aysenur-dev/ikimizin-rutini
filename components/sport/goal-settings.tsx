"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus, Trash } from "lucide-react";
import { api } from "@/lib/api-client";
import { ACTIVITY_COLORS, COLOR_LABEL, TYPE_PRESETS, type ActivityColor, type ActivityType, type SportGoal } from "@/lib/sport-shared";

/** Spor · Hedef: haftalık gün hedefi ve aktivite türleri */
export function GoalSettings({ goal, types }: { goal: SportGoal | null; types: ActivityType[] }) {
  return (
    <div className="stack section-stack">
      <GoalForm goal={goal} types={types} />
      <TypeList types={types} />
    </div>
  );
}

function GoalForm({ goal, types }: { goal: SportGoal | null; types: ActivityType[] }) {
  const router = useRouter();
  const [days, setDays] = useState(goal?.daysPerWeek ?? 4);
  const [minTypeId, setMinTypeId] = useState(goal?.minTypeId ?? "");
  const [minDays, setMinDays] = useState(goal?.minTypeDays ?? 2);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const subDays = Math.min(minDays, days);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/sport/goal", { method: "PUT", body: { daysPerWeek: days, minTypeId: minTypeId || null, minTypeDays: minTypeId ? subDays : null } });
      setMessage({ ok: true, text: "Hedef kaydedildi." });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Kaydedilemedi." });
    }
    setBusy(false);
  }

  return (
    <form className="card stack" onSubmit={save} aria-labelledby="hedef-baslik">
      <div>
        <h2 id="hedef-baslik">Haftalık hedef</h2>
        <p className="muted">Hangi gün yaptığın fark etmez; spor yaptığın her gün sayılır. Hafta pazartesi başlar.</p>
      </div>

      <div className="field">
        <span className="field-label" id="hedef-gun">
          Haftada kaç gün?
        </span>
        <div className="stepper-box" role="group" aria-labelledby="hedef-gun">
          <button type="button" className="icon-btn" onClick={() => setDays(Math.max(1, days - 1))} aria-label="Bir gün azalt">
            <Minus size={16} />
          </button>
          <span className="stepper-num num" aria-live="polite">
            {days} <small>gün</small>
          </span>
          <button type="button" className="icon-btn" onClick={() => setDays(Math.min(7, days + 1))} aria-label="Bir gün artır">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {types.length > 0 && (
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="hedef-tur">Alt hedef: en az birkaç gün şu spor (isteğe bağlı)</label>
            <select id="hedef-tur" className="input" value={minTypeId} onChange={(e) => setMinTypeId(e.target.value)}>
              <option value="">Alt hedef yok</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}

                </option>
              ))}
            </select>
          </div>
          {minTypeId && (
            <div className="field">
              <span className="field-label" id="hedef-alt">
                Kaç gün?
              </span>
              <div className="stepper-box" role="group" aria-labelledby="hedef-alt">
                <button type="button" className="icon-btn" onClick={() => setMinDays(Math.max(1, subDays - 1))} aria-label="Bir gün azalt">
                  <Minus size={16} />
                </button>
                <span className="stepper-num num" aria-live="polite">
                  {subDays} <small>gün</small>
                </span>
                <button type="button" className="icon-btn" onClick={() => setMinDays(Math.min(days, subDays + 1))} aria-label="Bir gün artır">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {message && <p className={message.ok ? "form-ok" : "form-error"}>{message.text}</p>}
      <div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {goal ? "Hedefi kaydet" : "Hedefi koy"}
        </button>
      </div>
    </form>
  );
}

function TypeList({ types }: { types: ActivityType[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "yeni" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const presets = TYPE_PRESETS.filter((p) => !types.some((t) => t.name.toLocaleLowerCase("tr") === p.name.toLocaleLowerCase("tr")));

  async function addPreset(p: (typeof TYPE_PRESETS)[number]) {
    setError(null);
    try {
      await api("/api/sport/types", { body: p });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eklenemedi.");
    }
  }

  return (
    <section className="card stack" aria-labelledby="turler-baslik">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <h2 id="turler-baslik">Yaptığın sporlar</h2>
          <p className="muted">“Spor yaptım” derken bunlardan seçersin. Renkler haftalık şeritte görünür.</p>
        </div>
        {editing !== "yeni" && (
          <button type="button" className="btn btn-ghost" onClick={() => setEditing("yeni")}>
            <Plus size={18} /> Tür ekle
          </button>
        )}
      </div>

      {editing === "yeni" && <TypeForm onDone={() => setEditing(null)} />}

      {types.length > 0 && (
        <ul className="plain-list type-list">
          {types.map((t) =>
            editing === t.id ? (
              <li key={t.id}>
                <TypeForm type={t} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={t.id} className="list-row" data-color={t.color}>
                <span className="type-dot" aria-hidden="true" />
                <span className="grow">
                  <strong>{t.name}</strong>
                  {(t.tracksRounds || t.logsSets) && (
                    <span className="muted small"> · {t.tracksRounds ? "tur sayısı sorulur" : "setler Salon'da girilir"}</span>
                  )}
                </span>
                <button type="button" className="icon-btn" onClick={() => setEditing(t.id)} aria-label={`${t.name} düzenle`}>
                  <Pencil size={15} />
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      {presets.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="field-label">{types.length ? "Hızlı ekle" : "Önerilenler: dokununca eklenir"}</span>
          <div className="chips">
            {presets.map((p) => (
              <button key={p.name} type="button" className="chip" data-color={p.color} onClick={() => addPreset(p)}>
                <Plus size={14} aria-hidden="true" /> {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}

function TypeForm({ type, onDone }: { type?: ActivityType; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(type?.name ?? "");
  const [color, setColor] = useState<ActivityColor>(type?.color ?? "pm");
  const [tracksRounds, setTracksRounds] = useState(type?.tracksRounds ?? false);
  const [logsSets, setLogsSets] = useState(type?.logsSets ?? false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = type?.id ?? "yeni";

  async function run(action: "save" | "delete") {
    setBusy(true);
    setError(null);
    const body = { name, color, tracksRounds, logsSets };
    try {
      if (action === "delete") await api(`/api/sport/types/${type!.id}`, { method: "DELETE" });
      else if (type) await api(`/api/sport/types/${type.id}`, { method: "PATCH", body });
      else await api("/api/sport/types", { body });
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }

  return (
    <form
      className="stack type-form"
      onSubmit={(e) => {
        e.preventDefault();
        void run("save");
      }}
    >
      <div className="field">
        <label htmlFor={`t-name-${key}`}>Adı</label>
        <input id={`t-name-${key}`} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ör. Pilates" autoFocus />
      </div>
      <fieldset className="field">
        <legend className="field-label">Renk</legend>
        <div className="swatches" role="radiogroup" aria-label="Renk">
          {ACTIVITY_COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={color === c} data-color={c} className="swatch" onClick={() => setColor(c)} aria-label={COLOR_LABEL[c]} />
          ))}
        </div>
      </fieldset>
      <label className="check-row">
        <input type="checkbox" checked={tracksRounds} onChange={(e) => setTracksRounds(e.target.checked)} />
        Tur sayısı da sorulsun (ör. boks)
      </label>
      <label className="check-row">
        <input type="checkbox" checked={logsSets} onChange={(e) => setLogsSets(e.target.checked)} />
        Setleri Salon’daki set kaydına gireceğim (ör. ağırlık)
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length < 2}>
          {type ? "Kaydet" : "Ekle"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={busy}>
          Vazgeç
        </button>
        {type &&
          (confirm ? (
            <button type="button" className="btn btn-danger" onClick={() => run("delete")} disabled={busy}>
              Evet, kaldır
            </button>
          ) : (
            <button type="button" className="icon-btn" onClick={() => setConfirm(true)} aria-label="Türü kaldır">
              <Trash size={16} />
            </button>
          ))}
      </div>
      {confirm && <p className="hint">Tür listeden kalkar; geçmiş oturumların silinmez.</p>}
    </form>
  );
}
