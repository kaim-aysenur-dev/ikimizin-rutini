"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash } from "lucide-react";
import { api } from "@/lib/api-client";
import type { Exercise } from "@/lib/sport";

const REGIONS = ["Göğüs", "Sırt", "Omuz", "Kol", "Bacak", "Kalça", "Karın / core", "Tüm vücut", "Kardiyo", "Esneme"];

/** Hareket kütüphanesi: ad, çalıştırdığı bölge, kısa yapılış tarifi */
export function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const [editing, setEditing] = useState<string | "yeni" | null>(exercises.length ? null : "yeni");
  const groups = [...new Set(exercises.map((e) => e.region || "Diğer"))];

  return (
    <div className="stack">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <h2>Hareket kütüphanesi</h2>
          <p className="muted">Planda ve kayıtta kullanacağın hareketler. Bölgeye göre gruplanır.</p>
        </div>
        {editing !== "yeni" && (
          <button type="button" className="btn btn-primary" onClick={() => setEditing("yeni")}>
            <Plus size={18} /> Hareket ekle
          </button>
        )}
      </div>
      {editing === "yeni" && <ExerciseForm onDone={() => setEditing(null)} canCancel={exercises.length > 0} />}
      {groups.map((group) => (
        <section key={group} className="stack" style={{ gap: 8 }}>
          <h3 className="group-title">{group}</h3>
          {exercises
            .filter((e) => (e.region || "Diğer") === group)
            .map((e) =>
              editing === e.id ? (
                <ExerciseForm key={e.id} exercise={e} onDone={() => setEditing(null)} canCancel />
              ) : (
                <article key={e.id} className="ex-card">
                  <div className="grow">
                    <h4>{e.name}</h4>
                    {e.howTo && <p className="muted small pre">{e.howTo}</p>}
                  </div>
                  <button type="button" className="icon-btn" onClick={() => setEditing(e.id)} aria-label={`${e.name} düzenle`}>
                    <Pencil size={16} />
                  </button>
                </article>
              ),
            )}
        </section>
      ))}
    </div>
  );
}

function ExerciseForm({ exercise, onDone, canCancel }: { exercise?: Exercise; onDone: () => void; canCancel: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(exercise?.name ?? "");
  const [region, setRegion] = useState(exercise?.region ?? "");
  const [howTo, setHowTo] = useState(exercise?.howTo ?? "");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = exercise?.id ?? "yeni";

  async function run(action: "save" | "delete") {
    setBusy(true);
    setError(null);
    try {
      if (action === "delete") await api(`/api/sport/exercises/${exercise!.id}`, { method: "DELETE" });
      else if (exercise) await api(`/api/sport/exercises/${exercise.id}`, { method: "PATCH", body: { name, region, howTo } });
      else await api("/api/sport/exercises", { body: { name, region, howTo } });
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }

  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        void run("save");
      }}
    >
      <div className="form-grid two">
        <div className="field">
          <label htmlFor={`ex-name-${id}`}>Hareket adı</label>
          <input id={`ex-name-${id}`} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ör. Squat" maxLength={80} autoFocus />
        </div>
        <div className="field">
          <label htmlFor={`ex-region-${id}`}>Çalıştırdığı bölge</label>
          <input id={`ex-region-${id}`} className="input" list="regions" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Ör. Bacak" maxLength={60} />
          <datalist id="regions">
            {REGIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
        <div className="field span-2">
          <label htmlFor={`ex-how-${id}`}>Kısa yapılış tarifi</label>
          <textarea id={`ex-how-${id}`} className="input" rows={3} value={howTo} onChange={(e) => setHowTo(e.target.value)} maxLength={1000} />
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length < 2}>
          {exercise ? "Kaydet" : "Ekle"}
        </button>
        {canCancel && (
          <button type="button" className="btn btn-ghost" onClick={onDone} disabled={busy}>
            Vazgeç
          </button>
        )}
        {exercise &&
          (confirm ? (
            <button type="button" className="btn btn-danger" onClick={() => run("delete")} disabled={busy}>
              Evet, kaldır
            </button>
          ) : (
            <button type="button" className="icon-btn" onClick={() => setConfirm(true)} aria-label="Hareketi kaldır">
              <Trash size={16} />
            </button>
          ))}
      </div>
      {confirm && <p className="hint">Hareket kütüphaneden ve plandan çıkar; geçmiş kayıtlar silinmez.</p>}
    </form>
  );
}
