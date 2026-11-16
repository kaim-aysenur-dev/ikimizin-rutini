"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { INTERVALS } from "@/lib/yds";

type Word = { id: string; en: string; tr: string; box: number | null; due: string | null };

/** Kendi kelimelerin: kitaptan, denemeden bilmediklerin. Eklediğin kelime sıradaki oturumda yeni kart olarak gelir */
export function YdsWordsView({ initial }: { initial: Word[] }) {
  const [words, setWords] = useState(initial);
  const [en, setEn] = useState("");
  const [tr, setTr] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reload = async () => setWords((await api<{ words: Word[] }>("/api/yds/kelime")).words);
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api("/api/yds/kelime", { body: { en, tr } }); setEn(""); setTr(""); await reload(); }
    catch (er) { setErr(er instanceof Error ? er.message : "Eklenemedi."); }
    setBusy(false);
  };
  const shown = words.filter((w) => !q.trim() || `${w.en} ${w.tr}`.toLocaleLowerCase("tr").includes(q.trim().toLocaleLowerCase("tr")));
  return (
    <div className="stack">
      <form className="card stack" onSubmit={add}>
        <h2>➕ Kelime ekle</h2>
        <p className="muted">Soru çözerken bilmediğin kelimeyi ya da phrasal verb&apos;ü ekle; sıradaki kelime oturumunda karşına çıkar.</p>
        <div className="row yds-add">
          <input className="input" lang="en" placeholder="İngilizce (ör. bring about)" maxLength={80} value={en} onChange={(e) => setEn(e.target.value)} required />
          <input className="input" placeholder="Türkçe anlamı" maxLength={160} value={tr} onChange={(e) => setTr(e.target.value)} required />
          <button type="submit" className="btn btn-primary" disabled={busy || !en.trim() || !tr.trim()}>Ekle</button>
        </div>
        {err && <p className="form-error">{err}</p>}
      </form>
      <section className="card stack">
        <h2>📒 Kelimelerin <small className="muted">{words.length}</small></h2>
        <input className="input" type="search" placeholder="Ara" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Kelime ara" />
        {shown.length === 0 ? <p className="muted">{words.length ? "Eşleşen yok." : "Henüz kendi kelimen yok."}</p> : (
          <ul className="yds-wordlist">
            {shown.map((w) => (
              <li key={w.id}>
                <b lang="en">{w.en}</b><span>{w.tr}</span>
                <small className="muted">{w.box === null ? "yeni" : w.box >= 4 ? `öğrenildi · ${INTERVALS[w.box]} günde bir` : `kutu ${w.box} · sıradaki ${w.due}`}</small>
                <button type="button" className="btn btn-quiet btn-sm" aria-label={`${w.en} sil`} onClick={async () => { await api(`/api/yds/kelime/${w.id}`, { method: "DELETE" }).catch(() => {}); await reload(); }}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
