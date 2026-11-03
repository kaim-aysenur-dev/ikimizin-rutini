"use client";

import { PixelIcon } from "@/components/pixel-icon";
import { GEAR } from "@/lib/gear";
import { SPELL_SLOTS } from "@/lib/equipment";
import { MAX_LEVEL, type levelOf } from "@/lib/xp";

export type HudSpell = { id: string; mana: number; readyIn: number; cooldown: number };
const byId = new Map(GEAR.map((g) => [g.id, g]));

export function CombatHud({ hp, maxHp, mana, maxMana, shield, spells, name, progress, onCast }: {
  hp: number; maxHp: number; mana: number; maxMana: number; shield: number; spells: HudSpell[];
  name: string; progress: ReturnType<typeof levelOf>; onCast: (slot: number) => void;
}) {
  const bar = (v: number, max: number) => `${Math.max(0, Math.min(100, v / Math.max(1, max) * 100))}%`;
  return <section className="gw-hud" aria-label="Karakter göstergeleri" onPointerDown={(e) => e.stopPropagation()}>
    <div className="gw-hud-heading"><b>{name.split(" ")[0]}</b><span>Sv. {progress.level} · {progress.title}</span></div>
    <div className="gw-xp" role="meter" aria-label={`Seviye ${progress.level} deneyimi`} aria-valuemin={0} aria-valuemax={progress.need} aria-valuenow={progress.into}>
      <div className="gw-xp-label"><span>{progress.level === MAX_LEVEL ? "En yüksek seviye" : `Seviye ${progress.level + 1}'e ilerleme`}</span><small className="num">{progress.into}/{progress.need} XP</small></div>
      <span className="gw-meter is-xp"><i style={{ width: bar(progress.into, progress.need) }} /></span>
    </div>
    <div className="gw-bar-row" role="meter" aria-label="Can" aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={Math.round(hp)}>
      <span className="gw-bar-ico" aria-hidden="true">♥</span><span className="gw-meter is-hp"><i style={{ width: bar(hp, maxHp) }} />{shield > 0 && <b style={{ width: bar(shield, maxHp) }} />}</span><small className="num">{Math.round(hp)}/{maxHp}</small>
    </div>
    <div className="gw-bar-row" role="meter" aria-label="Mana" aria-valuemin={0} aria-valuemax={maxMana} aria-valuenow={Math.round(mana)}>
      <span className="gw-bar-ico" aria-hidden="true">✦</span><span className="gw-meter is-mana"><i style={{ width: bar(mana, maxMana) }} /></span><small className="num">{Math.round(mana)}/{maxMana}</small>
    </div>
    <div className="gw-slots" aria-label="Büyü yuvaları">
      {Array.from({ length: SPELL_SLOTS }, (_, k) => {
        const s = spells[k], g = s ? byId.get(s.id) : undefined, dim = !!s && (s.readyIn > 0 || mana < s.mana);
        return <button key={k} type="button" className={`gw-slot${dim ? " is-dim" : ""}`} disabled={!s || dim} onClick={() => onCast(k)} aria-label={g ? `${k + 1}: ${g.name}` : `${k + 1}: boş yuva`} title={g ? `${g.name} · ${s!.mana} mana` : "Boş yuva: 3. kattaki büyü kürsüsünden büyü kuşan"}>
          {g && <PixelIcon draw={(c, _w, _h, t) => g.draw(c, t)} size={[24, 24]} scale={1.5} />}
          {s && s.readyIn > 0 && <i className="gw-cd" style={{ height: `${Math.min(100, s.readyIn / s.cooldown * 100)}%` }} />}
          <kbd>{k + 1}</kbd>
        </button>;
      })}
    </div>
  </section>;
}
