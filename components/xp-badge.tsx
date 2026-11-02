"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GEAR } from "@/lib/gear";
import { BADGES, type Stats, TIER_NAMES, levelOf, nextReward, rewardAt, tierOf, titleOf, xpToLevel } from "@/lib/xp";

// Görev işaretlenince fırlatılan olay: detail = kazanılan (ya da geri alınan) XP
export const XP_EVENT = "ir-xp";
export const gainXp = (delta: number) => window.dispatchEvent(new CustomEvent(XP_EVENT, { detail: delta }));

type Pop = { id: number; delta: number };
type Props = { initialXp: number; stats: Stats; meToday: boolean; partnerToday: boolean; partnerName: string | null };

const CONFETTI = Array.from({ length: 32 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 8) * 0.11,
  color: ["#f3d48a", "#b56b7a", "#5f9e6e", "#6f86d6", "#e48aa0"][i % 5],
}));

// seviye atlama melodisi: kısa kare dalga arpej. Bir tıkın ardından çaldığı için tarayıcı izin verir.
function fanfare() {
  try {
    const a = new AudioContext();
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => {
      const at = a.currentTime + i * 0.11;
      const o = a.createOscillator(), g = a.createGain();
      o.type = "square"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.07, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + (i === 5 ? 0.6 : 0.25));
      o.connect(g).connect(a.destination);
      o.start(at); o.stop(at + 0.65);
    });
    window.setTimeout(() => void a.close(), 1600);
  } catch {
    // ses yoksa kutlama sessiz geçer
  }
}

// Seviye rozeti + XP çubuğu + seri; "+10 XP" baloncukları, seviye atlama kutlaması ve Macera Günlüğü penceresi
export function XpBadge({ initialXp, stats, meToday, partnerToday, partnerName }: Props) {
  const [xp, setXp] = useState(initialXp);
  const [pops, setPops] = useState<Pop[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
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
    fanfare();
    const id = window.setTimeout(() => setLevelUp(null), 3400);
    return () => window.clearTimeout(id);
  }, [levelUp]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  const next = nextReward(lv.level);
  const earned = BADGES.filter((b) => b.ok(stats, lv.level));
  const partner = partnerName ?? "Diğeriniz";
  // shortcut: bugünün durumu sayfa yüklenirken hesaplanır; tik atınca değil, sayfa yenilenince güncellenir
  const bonusText = meToday && partnerToday
    ? "Bugün ikiniz de günü tamamladınız: bugünün XP'si ×2!"
    : meToday ? `Sen bugünü tamamladın. ${partner} da tamamlarsa bugünün XP'si ×2.`
    : partnerToday ? `${partner} bugünü tamamladı. Sen de tamamlarsan bugünün XP'si ×2.`
    : "Aynı gün ikiniz de günü tamamlarsanız o günün XP'si ×2.";

  const unlockedNow = levelUp === null ? [] : [
    rewardAt(levelUp) && `Salon: ${rewardAt(levelUp)!.label}`,
    tierOf(levelUp) !== tierOf(levelUp - 1) && `Zırh: ${TIER_NAMES[tierOf(levelUp)]}`,
    ...GEAR.filter((g) => g.level === levelUp).map((g) => `${g.kind}: ${g.name}`),
  ].filter(Boolean) as string[];

  return (
    <>
      <button type="button" className="xp-badge" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Seviye ${lv.level}, ${lv.title}. ${lv.into} / ${lv.need} XP. Seri ${stats.streak} gün. Macera Günlüğünü aç`}>
        {stats.streak > 0 && <span className="xp-streak" aria-hidden="true">🔥{stats.streak}</span>}
        <span className="xp-level">Lv {lv.level}</span>
        <span className="xp-title">{lv.title}</span>
        <span className="xp-bar" aria-hidden="true"><i style={{ width: `${Math.round((lv.into / lv.need) * 100)}%` }} /></span>
        <span className="xp-num">{lv.into}/{lv.need} XP</span>
        {pops.map((p) => (
          <span key={p.id} className={`xp-pop${p.delta < 0 ? " is-minus" : ""}`} aria-hidden="true">{p.delta > 0 ? "+" : ""}{p.delta} XP</span>
        ))}
      </button>

      {levelUp !== null && (
        <div className="xp-celebrate" role="status">
          <div className="xp-confetti" aria-hidden="true">
            {CONFETTI.map((c, i) => <i key={i} style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, background: c.color }} />)}
          </div>
          <div className="xp-levelup">
            SEVİYE ATLADIN! <b>Lv {levelUp}</b> · {titleOf(levelUp)}
            {unlockedNow.map((u) => <small key={u}>Yeni · {u}</small>)}
          </div>
        </div>
      )}

      {open && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="modal xp-journal" role="dialog" aria-modal="true" aria-labelledby="xpj-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="xpj-title">Macera Günlüğü</h2>
            <div className="xpj-level">
              <b>Lv {lv.level}</b> {lv.title} · {TIER_NAMES[tierOf(lv.level)]}
              <span className="xp-bar" aria-hidden="true"><i style={{ width: `${Math.round((lv.into / lv.need) * 100)}%` }} /></span>
              <small>{lv.into}/{lv.need} XP · toplam {xp} XP</small>
            </div>
            {next && <p className="xpj-next">Sonraki ödül <b>Lv {next.level}</b>: {next.label} ({xpToLevel(next.level) - xp} XP kaldı)</p>}
            <div className="xpj-stats">
              <span>🔥 Seri <b>{stats.streak}</b> gün <small>(en iyi {stats.best})</small></span>
              <span>❤️ Birlikte <b>{stats.together}</b> gün</span>
            </div>
            <p className="xpj-bonus">{bonusText}</p>
            <h3>Rozetler <small>{earned.length}/{BADGES.length}</small></h3>
            <ul className="xpj-badges">
              {BADGES.map((b) => {
                const ok = earned.includes(b);
                return (
                  <li key={b.id} className={ok ? "is-on" : undefined}>
                    <span aria-hidden="true">{b.icon}</span>
                    <b>{b.name}</b>
                    <small>{ok ? "Kazanıldı" : b.hint}</small>
                  </li>
                );
              })}
            </ul>
            <div className="row">
              <Link href="/hazine" className="btn btn-primary" onClick={() => setOpen(false)}>Hazineyi aç</Link>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Kapat</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
