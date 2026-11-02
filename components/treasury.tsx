"use client";

import { useState } from "react";
import { PixelCanvas } from "@/components/pixel-canvas";
import { STAND_F } from "@/lib/anim";
import { GEAR, type GearKind } from "@/lib/gear";
import { type Ctx, drawCharacter, rect } from "@/lib/pixel";
import { CHEER, TIERS } from "@/lib/scenes/hall";
import { REWARDS, TIER_NAMES, levelOf, tierOf, xpToLevel } from "@/lib/xp";

const FILTERS: ("Tümü" | GearKind)[] = ["Tümü", "Zırh", "Silah", "Büyü"];

// Hazine: seviyeyle açılan zırhlar, silahlar, büyüler ve salon ödülleri
export function Treasury({ xp }: { xp: number }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tümü");
  const lv = levelOf(xp);
  const tier = tierOf(lv.level);
  const shown = GEAR.filter((g) => filter === "Tümü" || g.kind === filter);
  const open = GEAR.filter((g) => g.level <= lv.level).length;

  // önizleme: ikisi karşılıklı, şu anki zırhla; arada bir sevinçle kollarını kaldırırlar
  const heroes = (c: Ctx, w: number, h: number, t: number, still: boolean) => {
    rect(c, 0, 0, w, h, "#2b2833");
    rect(c, 0, h - 6, w, 6, "#3e3a46"); rect(c, 0, h - 6, w, 1, "#5e5a66");
    const { outfit, tint } = TIERS[tier];
    const up = !still && t % 6 > 5;
    drawCharacter(c, { who: "cengiz", x: w / 2 - 9, y: h - 6, dir: 1, pose: up ? CHEER : STAND_F, outfit, tint, blink: !still && t % 4 < 0.12 });
    drawCharacter(c, { who: "aysenur", x: w / 2 + 9, y: h - 6, dir: -1, pose: up ? CHEER : STAND_F, outfit, tint, blink: !still && (t + 1.3) % 4 < 0.12 });
  };

  return (
    <>
      <section className="card treasury-hero" aria-label="Şu anki kuşanım">
        <PixelCanvas draw={heroes} size={[64, 40]} scale={4} fps={8} className="treasury-heroes" label="Cengiz ve Ayşenur şu anki zırhlarıyla" />
        <div className="stack">
          <h2>Lv {lv.level} · {lv.title}</h2>
          <p>Kuşanım: <b>{TIER_NAMES[tier]}</b></p>
          <span className="xp-bar" aria-hidden="true"><i style={{ width: `${Math.round((lv.into / lv.need) * 100)}%` }} /></span>
          <p className="muted">{lv.into}/{lv.need} XP · Hazinede {open}/{GEAR.length} eşya açık</p>
        </div>
      </section>

      <div className="chips treasury-filter" role="tablist" aria-label="Eşya türü">
        {FILTERS.map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className="chip" onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <ul className="treasury-grid">
        {shown.map((g) => {
          const locked = g.level > lv.level;
          return (
            <li key={g.id} className={`treasury-item${locked ? " is-locked" : ""}`}>
              <PixelCanvas draw={(c, w, h, t) => { c.clearRect(0, 0, w, h); g.draw(c, t); }} size={[24, 24]} scale={3} fps={locked ? 1 : g.kind === "Büyü" ? 10 : 4} className="treasury-icon" />
              <div>
                <p className="treasury-meta">{g.kind} · {g.owner} · <b>Lv {g.level}</b></p>
                <h3>{locked ? "???" : g.name}</h3>
                <p className="muted">{locked ? `🔒 Seviye ${g.level}'de açılır · ${xpToLevel(g.level) - xp} XP kaldı` : g.desc}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="card stack" aria-labelledby="salon">
        <h2 id="salon">Salon ödülleri</h2>
        <p className="muted">Panelin arkasındaki şato salonuna seviyeyle gelenler.</p>
        <ul className="treasury-rewards">
          {REWARDS.map((r) => (
            <li key={r.id} className={r.level <= lv.level ? "is-on" : undefined}>
              <b>Lv {r.level}</b> {r.level <= lv.level ? r.label : `🔒 ${r.label}`}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
