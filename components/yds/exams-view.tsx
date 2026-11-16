"use client";

import { useState } from "react";
import { gainXp } from "@/components/xp-badge";
import { api } from "@/lib/api-client";
import { formatDayShort } from "@/lib/dates";
import { SECTIONS, SECTION_ORDER, type Section, scoreOf } from "@/lib/yds";

type Exam = { id: string; day: string; title: string; sections: Partial<Record<Section, { correct: number; total: number }>>; correct: number; total: number; minutes: number | null };
type Rows = Record<Section, { correct: string; total: string }>;
const blankRows = (): Rows => Object.fromEntries(SECTION_ORDER.map((k) => [k, { correct: "", total: String(SECTIONS[k].count) }])) as Rows;
const scaled = (x: { correct: number; total: number }) => scoreOf(x.correct * (80 / x.total));

/** Denemeler: bölüm bölüm doğru gir, puan (her doğru 1,25) ve trend; en çok kaybettiğin bölüm */
export function YdsExamsView({ initial, target, today }: { initial: Exam[]; target: number; today: string }) {
  const [exams, setExams] = useState(initial);
  const [open, setOpen] = useState(initial.length === 0);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(today);
  const [minutes, setMinutes] = useState("180");
  const [rows, setRows] = useState<Rows>(blankRows);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reload = async () => setExams((await api<{ exams: Exam[] }>("/api/yds")).exams);
  const totalC = SECTION_ORDER.reduce((n, k) => n + (Number(rows[k].correct) || 0), 0), totalQ = SECTION_ORDER.reduce((n, k) => n + (Number(rows[k].total) || 0), 0);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const sections = Object.fromEntries(SECTION_ORDER.map((k) => [k, { correct: Number(rows[k].correct) || 0, total: Number(rows[k].total) || 0 }]));
      await api("/api/yds/deneme", { body: { title, day, minutes, sections } });
      gainXp(40); setOpen(false); setTitle(""); setRows(blankRows()); await reload();
    } catch (er) { setErr(er instanceof Error ? er.message : "Kaydedilemedi."); }
    setBusy(false);
  };

  const trend = [...exams].reverse();
  const loss = SECTION_ORDER.map((k) => ({ k, lost: exams.slice(0, 5).reduce((n, x) => n + ((x.sections[k]?.total ?? 0) - (x.sections[k]?.correct ?? 0)), 0) })).sort((a, b) => b.lost - a.lost)[0];

  return (
    <div className="stack">
      {exams.length > 0 && (
        <section className="card stack">
          <h2>📊 Puan trendi</h2>
          <div className="yds-trend" aria-label="Deneme puanları">
            {trend.map((x) => { const sc = scaled(x); return <span key={x.id} title={`${formatDayShort(x.day)}: ${sc}`}><i style={{ height: `${sc}%` }} className={sc >= target ? "is-ok" : undefined} /><small className="num">{Math.round(sc)}</small></span>; })}
            <b className="yds-target" style={{ bottom: `${target}%` }}>hedef {target}</b>
          </div>
          {loss && loss.lost > 0 && <p className="muted">Son 5 denemede en çok puanı <b>{SECTIONS[loss.k].name}</b> bölümünde kaybettin ({loss.lost} yanlış ya da boş): buna ağırlık ver.</p>}
        </section>
      )}
      {!open && <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>+ Deneme ekle</button>}
      {open && (
        <form className="card stack" onSubmit={save}>
          <h2>📝 Deneme ekle</h2>
          <div className="row yds-add">
            <input className="input" placeholder="Ad (ör. Yayınevi 5. deneme)" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="input" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} aria-label="Tarih" />
            <label className="yds-min"><input className="input" type="number" min={1} max={400} value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="Süre (dakika)" /> dk</label>
          </div>
          <table className="yds-table">
            <thead><tr><th>Bölüm</th><th>Doğru</th><th>Soru</th></tr></thead>
            <tbody>
              {SECTION_ORDER.map((k) => (
                <tr key={k}>
                  <td>{SECTIONS[k].name}</td>
                  <td><input className="input" type="number" inputMode="numeric" min={0} max={40} value={rows[k].correct} onChange={(e) => setRows((r) => ({ ...r, [k]: { ...r[k], correct: e.target.value } }))} aria-label={`${SECTIONS[k].name} doğru`} /></td>
                  <td><input className="input" type="number" inputMode="numeric" min={0} max={40} value={rows[k].total} onChange={(e) => setRows((r) => ({ ...r, [k]: { ...r[k], total: e.target.value } }))} aria-label={`${SECTIONS[k].name} soru`} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>Toplam</td><td className="num">{totalC}</td><td className="num">{totalQ}</td></tr></tfoot>
          </table>
          <p className="yds-score">Puan: <b className="num">{totalQ ? scoreOf(totalC * (80 / totalQ)) : 0}</b>{totalQ && totalQ !== 80 ? " (80 soruya oranlandı)" : ""}</p>
          {err && <p className="form-error">{err}</p>}
          <div className="row"><button type="submit" className="btn btn-primary" disabled={busy || !totalQ}>Kaydet</button><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Vazgeç</button></div>
        </form>
      )}
      <section className="card stack">
        <h2>🗂️ Denemeler</h2>
        {exams.length === 0 ? <p className="muted">Henüz deneme yok. Haftada bir tam deneme, sınav temposuna en iyi hazırlık.</p> : (
          <ul className="yds-examlist">
            {exams.map((x) => (
              <li key={x.id}>
                <span className="grow"><b>{x.title || "Deneme"}</b><small className="muted">{formatDayShort(x.day)} · {x.correct}/{x.total} doğru{x.minutes ? ` · ${x.minutes} dk` : ""}</small></span>
                <b className="num yds-examscore">{scaled(x)}</b>
                <button type="button" className="btn btn-quiet btn-sm" aria-label="Denemeyi sil" onClick={async () => { await api(`/api/yds/deneme/${x.id}`, { method: "DELETE" }).catch(() => {}); await reload(); }}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
