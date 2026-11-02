"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { api } from "@/lib/api-client";
import { gainXp } from "@/components/xp-badge";
import { XP } from "@/lib/xp";
import { addDays } from "@/lib/dates";
import { INTENSITIES, INTENSITY_LABEL, type ActivityType, type Intensity } from "@/lib/sport-shared";

type Props = {
  today: string;
  types: ActivityType[];
  last: Record<string, { minutes: number | null; rounds: number | null }>;
  onClose: () => void;
  onSaved: () => void;
};

/** "Spor yaptım" paneli: tür, gün, süre, (boks gibi türlerde) tur, yoğunluk, not */
export function LogSheet({ today, types, last, onClose, onSaved }: Props) {
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const type = types.find((t) => t.id === typeId);
  const [day, setDay] = useState(today);
  const [minutes, setMinutes] = useState(() => last[typeId]?.minutes ?? 30);
  const [rounds, setRounds] = useState(() => last[typeId]?.rounds ?? 6);
  const [intensity, setIntensity] = useState<Intensity>("orta");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pick(id: string) {
    setTypeId(id);
    setMinutes(last[id]?.minutes ?? 30);
    setRounds(last[id]?.rounds ?? 6);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/sport/sessions", {
        body: { day, typeId, minutes, rounds: type?.tracksRounds ? rounds : null, intensity, note },
      });
      gainXp(XP.sport);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form className="modal sheet" role="dialog" aria-modal="true" aria-labelledby="log-title" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2 id="log-title">Spor yaptım</h2>

        <fieldset className="field">
          <legend className="field-label">Ne yaptın?</legend>
          <div className="type-grid">
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                className="type-option"
                data-color={t.color}
                aria-pressed={t.id === typeId}
                onClick={() => pick(t.id)}
              >
                <span className="type-swatch" aria-hidden="true" />
                {t.name}
              </button>
            ))}
            <Link href="/spor/hedef" className="type-option type-add">
              <Plus size={16} aria-hidden="true" />
              Yeni tür
            </Link>
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field-label">Ne zaman?</legend>
          <div className="seg" role="radiogroup" aria-label="Gün">
            {[
              { v: today, label: "Bugün" },
              { v: addDays(today, -1), label: "Dün" },
            ].map((o) => (
              <button key={o.v} type="button" role="radio" aria-checked={day === o.v} onClick={() => setDay(o.v)}>
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="form-grid two">
          <Stepper label="Süre" value={minutes} unit="dk" step={5} min={5} max={600} onChange={setMinutes} />
          {type?.tracksRounds && <Stepper label="Tur sayısı" value={rounds} step={1} min={1} max={100} onChange={setRounds} />}
        </div>

        <fieldset className="field">
          <legend className="field-label">Nasıldı?</legend>
          <div className="seg" role="radiogroup" aria-label="Yoğunluk">
            {INTENSITIES.map((i) => (
              <button key={i} type="button" role="radio" aria-checked={intensity === i} onClick={() => setIntensity(i)}>
                {INTENSITY_LABEL[i]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="log-note">Not (isteğe bağlı)</label>
          <input id="log-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Ör. Torba + 3 tur sparring" />
        </div>

        {type?.logsSets && (
          <p className="form-info">
            Setleri ve kiloları <Link href="/spor/kayit">Set kaydı</Link> sayfasında girebilirsin; bu kayıt haftalık hedefe sayılır.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}

        <div className="row">
          <button type="submit" className="btn btn-primary grow" disabled={busy || !typeId}>
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </button>
        </div>
      </form>
    </div>
  );
}

function Stepper({
  label,
  value,
  unit,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="stepper-box">
        <button type="button" className="icon-btn" onClick={() => onChange(Math.max(min, value - step))} aria-label={`${label} azalt`}>
          <Minus size={16} />
        </button>
        <span className="stepper-num num" aria-live="polite">
          {value}
          {unit && <small> {unit}</small>}
        </span>
        <button type="button" className="icon-btn" onClick={() => onChange(Math.min(max, value + step))} aria-label={`${label} artır`}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
