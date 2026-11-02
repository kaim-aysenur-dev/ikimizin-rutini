"use client";

import { useEffect, useRef, useState } from "react";
import { levelOf } from "@/lib/xp";

// Görev işaretlenince fırlatılan olay: detail = kazanılan (ya da geri alınan) XP
export const XP_EVENT = "ir-xp";
export const gainXp = (delta: number) => window.dispatchEvent(new CustomEvent(XP_EVENT, { detail: delta }));

type Pop = { id: number; delta: number };

// Seviye rozeti + XP çubuğu; "+10 XP" baloncukları ve seviye atlama afişi
export function XpBadge({ initialXp }: { initialXp: number }) {
  const [xp, setXp] = useState(initialXp);
  const [pops, setPops] = useState<Pop[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const seq = useRef(0);
  const lv = levelOf(xp);

  useEffect(() => {
    const on = (e: Event) => {
      const delta = Number((e as CustomEvent).detail) || 0;
      setXp((prev) => {
        const next = Math.max(0, prev + delta);
        if (levelOf(next).level > levelOf(prev).level) setLevelUp(levelOf(next).level);
        return next;
      });
      const id = ++seq.current;
      setPops((p) => [...p, { id, delta }]);
      window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1300);
    };
    window.addEventListener(XP_EVENT, on);
    return () => window.removeEventListener(XP_EVENT, on);
  }, []);

  useEffect(() => {
    if (levelUp === null) return;
    const id = window.setTimeout(() => setLevelUp(null), 2600);
    return () => window.clearTimeout(id);
  }, [levelUp]);

  return (
    <div className="xp-badge" aria-label={`Seviye ${lv.level}, ${lv.title}. ${lv.into} / ${lv.need} XP`}>
      <span className="xp-level">Lv {lv.level}</span>
      <span className="xp-title">{lv.title}</span>
      <span className="xp-bar" aria-hidden="true"><i style={{ width: `${Math.round((lv.into / lv.need) * 100)}%` }} /></span>
      <span className="xp-num">{lv.into}/{lv.need} XP</span>
      {pops.map((p) => (
        <span key={p.id} className={`xp-pop${p.delta < 0 ? " is-minus" : ""}`} aria-hidden="true">{p.delta > 0 ? "+" : ""}{p.delta} XP</span>
      ))}
      {levelUp !== null && (
        <div className="xp-levelup" role="status">SEVİYE ATLADIN! <b>Lv {levelUp}</b> · {levelOf(xp).title}</div>
      )}
    </div>
  );
}
