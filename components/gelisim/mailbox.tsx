"use client";

// Posta kutusu: gelen ve giden notlar, yeni not yazma (gelisim-world.tsx'ten ayrıldı)
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

type Note = { id: string; body: string; createdAt: string; mine: boolean; read: boolean };

export function Mailbox({ onClose, partner }: { onClose: () => void; partner: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const load = () => api<{ notes: Note[] }>("/api/gelisim/notlar").then((r) => setNotes(r.notes), (e) => setErr(e instanceof Error ? e.message : "Yüklenemedi."));
  useEffect(() => { load(); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true); setErr(null);
    try { await api("/api/gelisim/notlar", { body: { body: text.trim() } }); setText(""); await load(); }
    catch (er) { setErr(er instanceof Error ? er.message : "Gönderilemedi."); }
    setSending(false);
  };
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal gw-mail" role="dialog" aria-modal="true" aria-labelledby="mail-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <h2 id="mail-title">💌 Posta kutusu</h2>
        <form className="stack" onSubmit={send}>
          <label className="field-label" htmlFor="mail-text">{partner} için bir not bırak</label>
          <textarea id="mail-text" className="input" rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="Bugün seni çok düşündüm..." />
          <div className="row"><button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>Kutuya bırak</button><button type="button" className="btn btn-ghost" onClick={onClose}>Kapat</button></div>
        </form>
        {err && <p className="form-error">{err}</p>}
        <ul className="gw-notes">
          {notes === null ? <li className="muted">Yükleniyor...</li> : notes.length === 0 ? <li className="muted">Kutu henüz boş.</li> : notes.map((n) => (
            <li key={n.id} className={n.mine ? "is-mine" : n.read ? undefined : "is-new"}>
              <small>{n.mine ? `Sen → ${partner}` : `${partner} → sen`} · {new Date(n.createdAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{!n.mine && !n.read ? " · yeni" : ""}</small>
              <p>{n.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
