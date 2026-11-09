"use client";

// Şatodaki günlük görev panosu: bugünkü rutin hedefleri parşömen gibi; tamamlanan her birine mühür basılır.
import Link from "next/link";
import { useEffect } from "react";

export type Quest = { id: string; label: string; emoji: string; value: number; target: number; href: string | null };

export function QuestBoard({ quests, onClose }: { quests: Quest[] | null; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const done = quests?.filter((q) => q.value >= q.target).length ?? 0;
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal gw-quests" role="dialog" aria-modal="true" aria-labelledby="quest-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div className="gw-armory-head">
          <h2 id="quest-title">📜 Günün görevleri</h2>
          <button type="button" className="btn btn-quiet" onClick={onClose} aria-label="Kapat">✕</button>
        </div>
        <p className="muted">{quests ? `${done}/${quests.length} mühür · hepsi tamamlanınca bahçede kuyu, arena ve aynalar parlar` : "Yükleniyor..."}</p>
        <ul className="gw-quest-list">
          {quests?.map((q) => {
            const ok = q.value >= q.target, pct = Math.min(100, Math.round((q.value / q.target) * 100));
            return (
              <li key={q.id} className={ok ? "is-done" : undefined}>
                <span className="gw-quest-emoji" aria-hidden="true">{q.emoji}</span>
                <div>
                  <b>{q.label}</b>
                  <div className="gw-quest-bar" role="progressbar" aria-valuenow={Math.min(q.value, q.target)} aria-valuemin={0} aria-valuemax={q.target}><span style={{ width: `${pct}%` }} /></div>
                  <small>{Math.min(q.value, q.target)}/{q.target}{q.id === "calisma" ? " dk · masada T ile" : ""}</small>
                </div>
                {ok ? <span className="gw-seal" aria-label="Tamamlandı">✔</span> : q.href ? <Link className="btn btn-ghost" href={q.href}>Git</Link> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
