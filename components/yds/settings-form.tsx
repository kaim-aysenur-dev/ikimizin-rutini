"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { LOCKS, type Lock, MODES, type Mode, type YdsSettings, correctFor, daysLeft } from "@/lib/yds";

const LOCK_COLOR: Record<Lock, string> = { kapali: "#8e95a3", zindan: "#c89a3e", sert: "#a8454e" };

/** İngilizce ayarları: mod (YDS ya da genel), sınav tarihi ve hedef (YDS), günlük kota ve Gelişim kilidi */
export function YdsSettingsForm({ initial, today }: { initial: YdsSettings; today: string }) {
  const router = useRouter();
  const [s, setS] = useState({ ...initial, examDate: initial.examDate ?? "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((x) => ({ ...x, [k]: v }));
  const left = daysLeft(s.examDate || null, today);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api("/api/yds", { method: "PUT", body: s }); router.push("/ingilizce"); router.refresh(); }
    catch (er) { setErr(er instanceof Error ? er.message : "Kaydedilemedi."); setBusy(false); }
  };
  return (
    <form className="card stack yds-settings" onSubmit={save}>
      <h2>⚙️ Ayarlar</h2>
      <span className="field-label">Neye çalışıyorsun?</span>
      <div className="wd-tiers yds-locks" role="radiogroup" aria-label="Mod">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={s.mode === m} className="wd-tier-card" style={{ "--tier": m === "yds" ? "#9a6ad6" : "#5a9ac8" } as React.CSSProperties} onClick={() => set("mode", m)}>
            <b>{MODES[m].title}</b><small className="muted">{MODES[m].hint}</small>
          </button>
        ))}
      </div>
      {s.mode === "yds" && <div className="st-two">
        <span>
          <label className="field-label" htmlFor="yds-date">Sınav tarihi</label>
          <input id="yds-date" className="input" type="date" min={today} value={s.examDate} onChange={(e) => set("examDate", e.target.value)} />
          {left !== null && left > 0 && <small className="muted">{left} gün kaldı</small>}
        </span>
        <span>
          <label className="field-label" htmlFor="yds-target">Hedef puan</label>
          <input id="yds-target" className="input" type="number" min={1} max={100} value={s.target} onChange={(e) => set("target", Number(e.target.value))} />
          <small className="muted">80 sorudan en az {correctFor(s.target || 1)} doğru</small>
        </span>
      </div>}
      <div className="st-two">
        <span>
          <label className="field-label" htmlFor="yds-words">Günlük kart (yeni + tekrar)</label>
          <input id="yds-words" className="input" type="number" min={5} max={300} value={s.dailyWords} onChange={(e) => set("dailyWords", Number(e.target.value))} />
        </span>
        <span>
          <label className="field-label" htmlFor="yds-new">Günde yeni kelime</label>
          <input id="yds-new" className="input" type="number" min={0} max={100} value={s.dailyNew} onChange={(e) => set("dailyNew", Number(e.target.value))} />
        </span>
      </div>
      <label className="field-label" htmlFor="yds-q">{s.mode === "yds" ? "Günlük soru" : "Günlük pratik (dakika: okuma, dinleme, konuşma...)"}</label>
      <input id="yds-q" className="input" type="number" min={0} max={300} value={s.dailyQuestions} onChange={(e) => set("dailyQuestions", Number(e.target.value))} />
      <p className="muted">Kaçırdığın günün eksiği (en çok bir günlük kota kadar) ertesi güne eklenir.</p>
      <span className="field-label">Gelişim kilidi · kota bitmeden</span>
      <div className="wd-tiers yds-locks" role="radiogroup" aria-label="Kilit">
        {(Object.keys(LOCKS) as Lock[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={s.lock === k} className="wd-tier-card" style={{ "--tier": LOCK_COLOR[k] } as React.CSSProperties} onClick={() => set("lock", k)}>
            <b>{LOCKS[k].name}</b><small className="muted">{LOCKS[k].hint}</small>
          </button>
        ))}
      </div>
      {err && <p className="form-error">{err}</p>}
      <div className="row"><button type="submit" className="btn btn-primary" disabled={busy}>Kaydet</button></div>
    </form>
  );
}
