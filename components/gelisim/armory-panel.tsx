"use client";

// Şatonun 3. katındaki zırh odası: istasyonun türündeki (zırh, silah, büyü) bütün eşyalar seviye sırasıyla.
// Açık olanlar kuşanılır ya da çıkarılır; kilitliler gri görünür ve hangi seviyede açılacağını söyler.
import { useEffect, useState } from "react";
import { PixelIcon } from "@/components/pixel-icon";
import { armorStats, gearSpeed, setBonus, spellStats, trinketStats, wearStats, weaponStats } from "@/lib/combat-stats";
import { type Equipment, SLOT_NAME, SPELL_SLOTS, WEAR_SLOTS, type WearSlot, slotOf, twoHanded, worn as wornList } from "@/lib/equipment";
import { GEAR, type GearKind, animated } from "@/lib/gear";

const STYLE_NAME: Record<string, string> = { kilic: "Kılıç", hancer: "Hançer", yay: "Yay", mizrak: "Mızrak", agir: "Ağır silah", asa: "Asa", "iki-elli": "İki elli kılıç" };
const TIER_NAME: Record<string, string> = { cloth: "Kumaş", leather: "Deri", steel: "Çelik", gold: "Altın", legend: "Efsane" };
const KIND_TITLE: Record<GearKind, string> = { Zırh: "🛡 Zırh askısı", Silah: "⚔ Silah rafı", Büyü: "✨ Büyü kürsüsü" };

/** Eşyanın oyundaki değerleri, kartta kısa yazı olarak */
function statLine(id: string): string {
  const w = weaponStats(id);
  if (w) return `${STYLE_NAME[w.style]} · hasar ${w.damage} · ${(1 / w.cooldown).toFixed(1)} vuruş/sn · menzil ${w.range}${w.combo > 1 ? ` · ${w.combo}'lü kombo` : ""}`;
  const tr = trinketStats(id);
  if (tr) return `Takı · ${[tr.hpRegen && "can yenilenmesi", tr.manaRegen && "mana yenilenmesi", tr.speed && `%${Math.round(tr.speed * 100)} hız`, tr.together && "ikiniz takınca"].filter(Boolean).join(" · ")}`;
  const a = armorStats(id), slot = slotOf(id);
  if (a) return `${slot ? SLOT_NAME[slot] : ""} · ${TIER_NAME[a.tier]} · savunma ${a.defense} · +${a.bonusHp} can${slot === "boots" ? " · daha hızlı" : ""}`;
  const s = spellStats(id);
  if (s) return `${s.heal ? `şifa ${s.heal}` : s.damage ? `hasar ${s.damage}` : "koruma"} · ${s.mana} mana · ${s.cooldown} sn bekleme`;
  return "";
}

export function ArmoryPanel({ kind, level, equipment, busy, onToggle, onClose }: {
  kind: GearKind; level: number; equipment: Equipment; busy: boolean; onToggle: (gearId: string) => void; onClose: () => void;
}) {
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [slot, setSlot] = useState<WearSlot | "all">("all");
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const items = GEAR.filter((g) => g.kind === kind && (!onlyOpen || g.level <= level) && (kind !== "Zırh" || slot === "all" || slotOf(g.id) === slot));
  const worn = (id: string) => wornList(equipment).includes(id) || equipment.weapon === id || equipment.spells.includes(id);
  const set = setBonus(equipment), ws = wearStats(equipment), speed = gearSpeed(equipment);
  const open = GEAR.filter((g) => g.kind === kind && g.level <= level).length, total = GEAR.filter((g) => g.kind === kind).length;
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal gw-armory" role="dialog" aria-modal="true" aria-labelledby="armory-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div className="gw-armory-head">
          <h2 id="armory-title">{KIND_TITLE[kind]}</h2>
          <button type="button" className="btn btn-quiet" onClick={onClose} aria-label="Kapat">✕</button>
        </div>
        <p className="muted">
          {open}/{total} açık · Lv {level}
          {kind === "Büyü" && ` · ${equipment.spells.length}/${SPELL_SLOTS} yuva dolu (1–4 tuşları)`}
        </p>
        {kind === "Zırh" && (
          <>
            <p className="gw-armory-sum">Savunma {ws.defense} · +{ws.bonusHp} can{speed > 1 ? ` · %${Math.round((speed - 1) * 100)} hız` : ""}{set ? ` · ✨ ${set.mat} seti (+${set.defense})` : " · aynı malzemeden göğüslük, miğfer ve kalkan set olur"}</p>
            <div className="gw-armory-slots" role="tablist" aria-label="Yuva">
              {(["all", ...WEAR_SLOTS] as const).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={slot === k} className={`chip${slot === k ? " is-on" : ""}`} onClick={() => setSlot(k)}>
                  {k === "all" ? "Tümü" : SLOT_NAME[k]}{k !== "all" && equipment[k] ? " ✓" : ""}
                </button>
              ))}
            </div>
            {equipment.shield === null && twoHanded(equipment.weapon) && <p className="muted">İki elli silah taşırken kalkan kuşanınca silah bırakılır.</p>}
          </>
        )}
        <label className="check-row"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Yalnız açılanları göster</label>
        <ul className="gw-items">
          {items.map((g) => {
            const locked = g.level > level, on = worn(g.id);
            return (
              <li key={g.id} className={`gw-item${locked ? " is-locked" : ""}${on ? " is-active" : ""}`}>
                <PixelIcon draw={(c, _w, _h, t) => g.draw(c, t)} size={[24, 24]} scale={2} animate={!locked && animated(g)} className="gw-item-icon" />
                <div>
                  <b>{locked ? "???" : g.name}{on && " ✓"}</b>
                  <small>{locked ? `🔒 Seviye ${g.level}` : `Lv ${g.level} · ${statLine(g.id)}`}</small>
                </div>
                {!locked && (
                  <button type="button" className={`btn ${on ? "btn-ghost" : "btn-primary"}`} disabled={busy} onClick={() => onToggle(g.id)}>
                    {on ? "Çıkar" : "Kuşan"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
