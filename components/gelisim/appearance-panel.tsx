"use client";

// Görünüm: unvan (isim etiketinin altında), yürürken arkada kalan iz ve binek. Kilitliler gri; nasıl açılacağı yazar.
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { MOUNTS, type Progress, type Style, TITLES, TRAILS, unlockHint, unlocked } from "@/lib/character";

type Tab = "unvan" | "iz" | "binek";

export function AppearancePanel({ style, progress, onSaved, onClose }: { style: Style; progress: Progress; onSaved: (s: Style) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("unvan");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(true);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const save = async (next: Style) => {
    setBusy(true); setErr(null);
    try { const res = await api<{ style: Style }>("/api/gelisim/gorunum", { body: next }); onSaved(res.style); }
    catch (e) { setErr(e instanceof Error ? e.message : "Kaydedilemedi."); }
    setBusy(false);
  };
  const titles = TITLES.filter((t) => !onlyOpen || t.ok(progress));
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal gw-armory gw-look" role="dialog" aria-modal="true" aria-labelledby="look-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div className="gw-armory-head">
          <h2 id="look-title">🎭 Görünüm</h2>
          <button type="button" className="btn btn-quiet" onClick={onClose} aria-label="Kapat">✕</button>
        </div>
        <div className="gw-armory-slots" role="tablist" aria-label="Görünüm türü">
          {([["unvan", "🏷 Unvan"], ["iz", "✨ İz"], ["binek", "🐴 Binek"]] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={`chip${tab === k ? " is-on" : ""}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        {err && <p className="form-error">{err}</p>}
        {tab === "unvan" && (
          <>
            <p className="muted">Kazandığın her rozet ve geçtiğin her zindan bölümü bir unvan açar. Seçtiğin unvan adının altında görünür.</p>
            <label className="check-row"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Yalnız açılanlar</label>
            <ul className="gw-items gw-titles">
              <li className={`gw-item${!style.title ? " is-active" : ""}`}><div><b>Unvansız</b><small>Yalnız adın görünür</small></div><button type="button" className="btn btn-ghost" disabled={busy || !style.title} onClick={() => save({ ...style, title: null })}>Seç</button></li>
              {titles.map((t) => { const ok = t.ok(progress), on = style.title === t.id; return (
                <li key={t.id} className={`gw-item${ok ? "" : " is-locked"}${on ? " is-active" : ""}`}>
                  <div><b>{t.name}{on && " ✓"}</b><small>{t.source} · {ok ? "açık" : `🔒 ${t.hint}`}</small></div>
                  {ok && <button type="button" className={`btn ${on ? "btn-ghost" : "btn-primary"}`} disabled={busy || on} onClick={() => save({ ...style, title: t.id })}>Seç</button>}
                </li>
              ); })}
            </ul>
          </>
        )}
        {tab === "iz" && (
          <ul className="gw-items">
            <li className={`gw-item${!style.trail ? " is-active" : ""}`}><div><b>İz yok</b><small>Sade yürüyüş</small></div><button type="button" className="btn btn-ghost" disabled={busy || !style.trail} onClick={() => save({ ...style, trail: null })}>Seç</button></li>
            {TRAILS.map((t) => { const ok = unlocked(t.unlock, progress), on = style.trail === t.id; return (
              <li key={t.id} className={`gw-item${ok ? "" : " is-locked"}${on ? " is-active" : ""}`}>
                <span className="gw-dungeon-emoji" aria-hidden="true">{t.icon}</span>
                <div><b>{t.name}{on && " ✓"}</b><small>{ok ? "Yürürken arkanda kalır" : `🔒 ${unlockHint(t.unlock)}`}</small></div>
                {ok && <button type="button" className={`btn ${on ? "btn-ghost" : "btn-primary"}`} disabled={busy || on} onClick={() => save({ ...style, trail: t.id })}>Seç</button>}
              </li>
            ); })}
          </ul>
        )}
        {tab === "binek" && (
          <>
            <p className="muted">Bahçede <kbd>Z</kbd> ile biner ya da inersin. Eyer ve at zırhı şatonun 3. katındaki zırh askısında.</p>
            <ul className="gw-items">
              <li className={`gw-item${!style.mount ? " is-active" : ""}`}><div><b>Bineksiz</b><small>Yürüyerek</small></div><button type="button" className="btn btn-ghost" disabled={busy || !style.mount} onClick={() => save({ ...style, mount: null })}>Seç</button></li>
              {MOUNTS.map((m) => { const ok = unlocked(m.unlock, progress), on = style.mount === m.id; return (
                <li key={m.id} className={`gw-item${ok ? "" : " is-locked"}${on ? " is-active" : ""}`}>
                  <span className="gw-dungeon-emoji" aria-hidden="true" style={{ background: m.body }}>{m.icon}</span>
                  <div><b>{m.name}{on && " ✓"}</b><small>{ok ? `%${Math.round((m.speed - 1) * 100)} daha hızlı` : `🔒 ${unlockHint(m.unlock)}`}</small></div>
                  {ok && <button type="button" className={`btn ${on ? "btn-ghost" : "btn-primary"}`} disabled={busy || on} onClick={() => save({ ...style, mount: m.id })}>Seç</button>}
                </li>
              ); })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
