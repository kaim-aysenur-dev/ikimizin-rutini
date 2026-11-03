"use client";

// Dövüş göstergesi: sol üstte can (kırmızı) ve mana (mavi) barı, altında 4 büyü yuvası.
// Yuvada büyünün ikonu, tuşu (1-4), bekleme süresi örtüsü; manası yetmeyen yuva soluk görünür.
import { PixelIcon } from "@/components/pixel-icon";
import { GEAR } from "@/lib/gear";
import { SPELL_SLOTS } from "@/lib/equipment";

export type HudSpell = { id: string; mana: number; readyIn: number; cooldown: number };
const byId = new Map(GEAR.map((g) => [g.id, g]));

export function CombatHud({ hp, maxHp, mana, maxMana, shield, spells, onCast }: {
  hp: number; maxHp: number; mana: number; maxMana: number; shield: number; spells: HudSpell[]; onCast: (slot: number) => void;
}) {
  const bar = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100))}%`;
  return (
    <div className="gw-hud" onPointerDown={(e) => e.stopPropagation()}>
      <div className="gw-bar-row" role="meter" aria-label="Can" aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={Math.round(hp)}>
        <span className="gw-bar-ico" aria-hidden="true">♥</span>
        <span className="gw-meter is-hp"><i style={{ width: bar(hp, maxHp) }} />{shield > 0 && <b style={{ width: bar(shield, maxHp) }} />}</span>
        <small className="num">{Math.round(hp)}/{maxHp}</small>
      </div>
      <div className="gw-bar-row" role="meter" aria-label="Mana" aria-valuemin={0} aria-valuemax={maxMana} aria-valuenow={Math.round(mana)}>
        <span className="gw-bar-ico" aria-hidden="true">✦</span>
        <span className="gw-meter is-mana"><i style={{ width: bar(mana, maxMana) }} /></span>
        <small className="num">{Math.round(mana)}/{maxMana}</small>
      </div>
      <div className="gw-slots">
        {Array.from({ length: SPELL_SLOTS }, (_, k) => {
          const s = spells[k], g = s ? byId.get(s.id) : undefined;
          const dim = !!s && (s.readyIn > 0 || mana < s.mana);
          return (
            <button key={k} type="button" className={`gw-slot${dim ? " is-dim" : ""}`} disabled={!s} onClick={() => onCast(k)}
              aria-label={g ? `${k + 1}: ${g.name}` : `${k + 1}: boş yuva`} title={g ? `${g.name} · ${s!.mana} mana` : "Boş yuva: 3. kattaki büyü kürsüsünden büyü kuşan"}>
              {g && <PixelIcon draw={(c, _w, _h, t) => g.draw(c, t)} size={[24, 24]} scale={1.5} />}
              {s && s.readyIn > 0 && <i className="gw-cd" style={{ height: `${Math.min(100, (s.readyIn / s.cooldown) * 100)}%` }} />}
              <kbd>{k + 1}</kbd>
            </button>
          );
        })}
      </div>
    </div>
  );
}
