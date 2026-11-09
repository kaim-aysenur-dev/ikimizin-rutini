"use client";

// Ay Kapısı: zindan bölümleri. Seviyesi yetmeyen kilitli; önerilen güç ile senin gücün yan yana (ekipman güçlendikçe zorlar kolaylaşır).
// İlk geçiş tam XP, aynı gün tekrar geçişin ödülü bir kez ve daha az.
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { ENEMIES, REPEAT_SHARE, STAGES } from "@/lib/dungeon";

export type BattleLog = { cleared: number[]; today: number[]; ghostsToday: number[] };

export function DungeonPanel({ level, power, onEnter, onClose }: { level: number; power: number; onEnter: (stage: number) => void; onClose: () => void }) {
  const [log, setLog] = useState<BattleLog | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api<BattleLog>("/api/gelisim/zindan").then(setLog, (e) => setErr(e instanceof Error ? e.message : "Yüklenemedi.")); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal gw-armory gw-dungeon" role="dialog" aria-modal="true" aria-labelledby="dungeon-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div className="gw-armory-head">
          <h2 id="dungeon-title">🌕 Ay Kapısı</h2>
          <button type="button" className="btn btn-quiet" onClick={onClose} aria-label="Kapat">✕</button>
        </div>
        <p className="muted">Lv {level} · Gücün <b>{power}</b> · Her bölüm üç dalga; hepsini yenince portal açılır. İlk geçiş tam XP, sonraki günlerde %{Math.round(REPEAT_SHARE * 100)}.</p>
        {err && <p className="form-error">{err}</p>}
        <ul className="gw-items">
          {STAGES.map((s) => {
            const locked = s.level > level, done = log?.cleared.includes(s.id), today = log?.today.includes(s.id);
            const ratio = power / s.power, risk = ratio >= 1 ? "is-ok" : ratio >= 0.7 ? "is-warn" : "is-hard";
            const kinds = [...new Set(s.waves.flat().map(([k]) => k))];
            return (
              <li key={s.id} className={`gw-item${locked ? " is-locked" : ""}${done ? " is-active" : ""}`}>
                <span className="gw-dungeon-emoji" aria-hidden="true">{locked ? "🔒" : s.emoji}</span>
                <div>
                  <b>{s.id}. {s.name}{done && " ✓"}</b>
                  <small>{locked ? `Seviye ${s.level}'de açılır` : s.story}</small>
                  {!locked && (
                    <small>
                      <span className={`gw-power ${risk}`}>Önerilen güç {s.power}</span> · {kinds.map((k) => ENEMIES[k].name).join(", ")} ·{" "}
                      {today ? "bugün alındı" : `+${done ? Math.round(s.xp * REPEAT_SHARE) : s.xp} XP`} · Şef: {s.champion.name}
                    </small>
                  )}
                </div>
                {!locked && <button type="button" className="btn btn-primary" onClick={() => onEnter(s.id)}>Gir</button>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
