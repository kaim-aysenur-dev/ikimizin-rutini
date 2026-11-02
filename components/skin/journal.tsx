"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";
import { uploadImage } from "@/lib/upload-client";
import { SKIN_METRICS, type SkinMetric } from "@/lib/slots";

export type JournalItem = {
  day: string;
  scores: Partial<Record<SkinMetric, number | null>>;
  note: string;
  photoThumb: string | null;
  photoLarge: string | null;
};

type Scores = Partial<Record<SkinMetric, number | null>>;

export function JournalForm({ today, metrics, entries }: { today: string; metrics: SkinMetric[]; entries: JournalItem[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const find = (day: string) => entries.find((e) => e.day === day);
  const [day, setDay] = useState(today);
  const [scores, setScores] = useState<Scores>(() => find(today)?.scores ?? {});
  const [note, setNote] = useState(() => find(today)?.note ?? "");
  const [photo, setPhoto] = useState<{ preview: string | null; publicId?: string | null }>(() => ({
    preview: find(today)?.photoThumb ?? null,
  }));
  const [busy, setBusy] = useState<"save" | "photo" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const existing = find(day);

  function pickDay(next: string) {
    setDay(next);
    const entry = find(next);
    setScores(entry?.scores ?? {});
    setNote(entry?.note ?? "");
    setPhoto({ preview: entry?.photoThumb ?? null });
    setMessage(null);
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy("photo");
    setMessage(null);
    try {
      const publicId = await uploadImage(file, "cilt", 1600);
      setPhoto({ preview: URL.createObjectURL(file), publicId });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Fotoğraf yüklenemedi." });
    }
    if (fileRef.current) fileRef.current.value = "";
    setBusy(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save");
    setMessage(null);
    try {
      await api("/api/skin/journal", {
        method: "PUT",
        body: { day, scores, note, ...(photo.publicId !== undefined ? { photoPublicId: photo.publicId } : {}) },
      });
      setMessage({ ok: true, text: `${formatDate(day)} kaydedildi.` });
      setPhoto((p) => ({ preview: p.preview }));
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Kaydedilemedi." });
    }
    setBusy(null);
  }

  return (
    <form className="card stack" onSubmit={onSubmit} noValidate>
      <div className="section-head" style={{ marginBottom: 0 }}>
        <h2>{existing ? "Kaydı güncelle" : "Yeni kayıt"}</h2>
        <input
          type="date"
          className="input date-input"
          value={day}
          max={today}
          onChange={(e) => e.target.value && pickDay(e.target.value)}
          aria-label="Tarih"
        />
      </div>
      <p className="hint">1 = hiç / çok az, 5 = çok. Hepsinde düşük puan daha iyi.</p>

      <div className="scores">
        {metrics.map((metric) => (
          <div key={metric} className="score-row" role="radiogroup" aria-label={SKIN_METRICS[metric]}>
            <span className="score-label">{SKIN_METRICS[metric]}</span>
            <div className="score-buttons">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={scores[metric] === n}
                  className="score-btn num"
                  data-level={n}
                  onClick={() => setScores((s) => ({ ...s, [metric]: s[metric] === n ? null : n }))}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="field">
        <label htmlFor="j-note">Not</label>
        <textarea
          id="j-note"
          className="input"
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ör. Çene hattında 2 sivilce, tıraştan sonra hafif yanma"
        />
      </div>

      <div className="row">
        {photo.preview && (
          <span className="journal-photo">
            <img src={photo.preview} alt="Seçilen cilt fotoğrafı" />
          </span>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
          <Camera size={18} /> {busy === "photo" ? "Yükleniyor…" : photo.preview ? "Fotoğrafı değiştir" : "Fotoğraf ekle"}
        </button>
        {photo.preview && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => setPhoto({ preview: null, publicId: null })}
            aria-label="Fotoğrafı kaldır"
          >
            <Trash size={18} />
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
      </div>
      <p className="hint">Fotoğraflar yalnızca sana görünür; adresleri imzalıdır ve tahmin edilemez.</p>

      {message && (
        <p className={message.ok ? "form-ok" : "form-error"} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy !== null}>
          {busy === "save" ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}

export function JournalList({ entries, metrics }: { entries: JournalItem[]; metrics: SkinMetric[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<JournalItem | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(day: string) {
    try {
      await api(`/api/skin/journal?day=${day}`, { method: "DELETE" });
      setConfirm(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  if (!entries.length) return <p className="muted">Henüz kayıt yok. İlk kaydın, zaman içindeki değişimi görmenin başlangıcı olur.</p>;

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      <ul className="journal-list">
        {entries.map((entry) => (
          <li key={entry.day} className="journal-entry">
            {entry.photoThumb ? (
              <button type="button" className="journal-thumb" onClick={() => setOpen(entry)} aria-label={`${formatDate(entry.day)} fotoğrafını büyüt`}>
                <img src={entry.photoThumb} alt="" loading="lazy" />
              </button>
            ) : (
              <span className="journal-thumb empty-thumb" aria-hidden="true" />
            )}
            <div className="journal-body">
              <div className="journal-top">
                <strong>{formatDate(entry.day)}</strong>
                {confirm === entry.day ? (
                  <span className="row" style={{ gap: 6 }}>
                    <button type="button" className="btn btn-danger" onClick={() => remove(entry.day)}>
                      Sil
                    </button>
                    <button type="button" className="btn btn-quiet" onClick={() => setConfirm(null)}>
                      Vazgeç
                    </button>
                  </span>
                ) : (
                  <button type="button" className="icon-btn" onClick={() => setConfirm(entry.day)} aria-label={`${formatDate(entry.day)} kaydını sil`}>
                    <Trash size={16} />
                  </button>
                )}
              </div>
              <div className="score-chips">
                {metrics
                  .filter((m) => entry.scores[m])
                  .map((m) => (
                    <span key={m} className="score-chip" data-level={entry.scores[m]}>
                      {SKIN_METRICS[m]} <span className="num">{entry.scores[m]}</span>
                    </span>
                  ))}
              </div>
              {entry.note && <p className="journal-note">{entry.note}</p>}
            </div>
          </li>
        ))}
      </ul>

      {open?.photoLarge && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(null)}>
          <div className="modal photo-modal" role="dialog" aria-modal="true" aria-label={formatDate(open.day)} onClick={(e) => e.stopPropagation()}>
            <div className="section-head">
              <strong>{formatDate(open.day)}</strong>
              <button type="button" className="icon-btn" onClick={() => setOpen(null)} aria-label="Kapat">
                <X size={18} />
              </button>
            </div>
            <img src={open.photoLarge} alt={`${formatDate(open.day)} cilt fotoğrafı`} />
          </div>
        </div>
      )}
    </>
  );
}
