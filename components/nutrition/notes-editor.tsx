"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash } from "lucide-react";
import { api } from "@/lib/api-client";
import type { NutritionNote } from "@/lib/nutrition";

// Kurallar, içecek planı gibi başlıklı madde listeleri: ekle, düzenle, sil.

export function NotesEditor({ notes }: { notes: NutritionNote[] }) {
  const [editing, setEditing] = useState<string | "yeni" | null>(null);

  return (
    <section className="stack" aria-labelledby="notes-title">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <h2 id="notes-title">Kurallar ve notlar</h2>
        {editing !== "yeni" && (
          <button type="button" className="btn btn-quiet" onClick={() => setEditing("yeni")}>
            <Plus size={18} /> Başlık ekle
          </button>
        )}
      </div>
      {notes.length === 0 && editing !== "yeni" && (
        <p className="muted">Ana kurallar, içecek planı gibi listeleri buraya ekleyebilirsin.</p>
      )}
      <div className="notes-grid">
        {editing === "yeni" && <NoteForm onDone={() => setEditing(null)} />}
        {notes.map((note) =>
          editing === note.id ? (
            <NoteForm key={note.id} note={note} onDone={() => setEditing(null)} />
          ) : (
            <article key={note.id} className="note-card">
              <header>
                <h3>{note.title}</h3>
                <button type="button" className="icon-btn" onClick={() => setEditing(note.id)} aria-label={`${note.title} düzenle`}>
                  <Pencil size={16} />
                </button>
              </header>
              <ul>
                {note.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </article>
          ),
        )}
      </div>
    </section>
  );
}

function NoteForm({ note, onDone }: { note?: NutritionNote; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(note?.title ?? "");
  const [lines, setLines] = useState(note?.lines.join("\n") ?? "");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "save" | "delete") {
    setBusy(true);
    setError(null);
    try {
      if (action === "delete") await api(`/api/nutrition/notes/${note!.id}`, { method: "DELETE" });
      else if (note) await api(`/api/nutrition/notes/${note.id}`, { method: "PATCH", body: { title, lines: lines.split("\n") } });
      else await api("/api/nutrition/notes", { body: { title, lines: lines.split("\n") } });
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }

  return (
    <article className="note-card editing stack">
      <div className="field">
        <label htmlFor={`nt-${note?.id ?? "yeni"}`}>Başlık</label>
        <input id={`nt-${note?.id ?? "yeni"}`} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ör. Ana kurallar" autoFocus />
      </div>
      <div className="field">
        <label htmlFor={`nl-${note?.id ?? "yeni"}`}>Maddeler (her satıra bir tane)</label>
        <textarea id={`nl-${note?.id ?? "yeni"}`} className="input" rows={6} value={lines} onChange={(e) => setLines(e.target.value)} />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => run("save")} disabled={busy}>
          Kaydet
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={busy}>
          Vazgeç
        </button>
        {note &&
          (confirm ? (
            <button type="button" className="btn btn-danger" onClick={() => run("delete")} disabled={busy}>
              Evet, sil
            </button>
          ) : (
            <button type="button" className="icon-btn" onClick={() => setConfirm(true)} aria-label="Bu başlığı sil">
              <Trash size={16} />
            </button>
          ))}
      </div>
    </article>
  );
}
