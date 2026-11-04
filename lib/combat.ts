// Gelişim dövüş motoru (saf): can, mana, kılıç kombosu, mermiler ve büyüler. Çizim ve giriş yok.
// Koordinatlar izometrik kare (i, j); "ileri" ekranda sağ (dir 1) ya da sol (dir -1) demek: i - j artar ya da azalır.
import { FIST, type SpellShape, armorStats, spellStats, wearStats, weaponStats } from "./combat-stats";
import { type Equipment, NO_EQUIPMENT } from "./equipment";

export type Fighter = { hp: number; maxHp: number; mana: number; maxMana: number; shield: number; shieldUntil: number; comboStep: number; comboAt: number; readyAt: number; spellReady: Record<string, number> };
export type Target = { id: string; i: number; j: number; hp: number; maxHp: number; hitAt: number; downAt?: number };
export type Effect = {
  kind: "vurus" | SpellShape | "hasar" | "sifa-sayi"; i: number; j: number; dir: 1 | -1; at: number; until: number;
  visualOnly?: boolean; color?: string; value?: number; vi?: number; vj?: number; damage?: number; step?: number; style?: string;
};
export type Pos = { i: number; j: number; dir: 1 | -1 };

const COMBO_WINDOW = 0.5; // sn: bu süre içinde vurulursa kombo sürer
const COMBO_FINISH = 1.8; // son vuruşun hasar çarpanı
const SHOT_SPEED = 9; // kare / sn
const HIT_RADIUS = 0.75;
const RESPAWN = 2; // yıkılan hedef kaç sn sonra kalkar

export function newFighter(level: number, e: Equipment): Fighter {
  const bonus = wearStats(e).bonusHp; // bütün giyilenlerin ek canı
  const maxHp = 100 + level * 5 + bonus, maxMana = 50 + level * 3;
  return { hp: maxHp, maxHp, mana: maxMana, maxMana, shield: 0, shieldUntil: 0, comboStep: 0, comboAt: -9, readyAt: 0, spellReady: {} };
}

// ekranda ileri: i - j farkı; yan sapma: i + j farkı
const ahead = (at: Pos, t: { i: number; j: number }) => ((t.i - t.j) - (at.i - at.j)) * at.dir;
const sideways = (at: Pos, t: { i: number; j: number }) => Math.abs((t.i + t.j) - (at.i + at.j));
const alive = (t: Target) => t.hp > 0;

function hurt(t: Target, amount: number, now: number, out: Effect[], color?: string) {
  if (!alive(t)) return;
  const v = Math.max(1, Math.round(amount));
  t.hp = Math.max(0, t.hp - v); t.hitAt = now;
  if (t.hp === 0) t.downAt = now;
  out.push({ kind: "hasar", i: t.i, j: t.j, dir: 1, at: now, until: now + 0.9, value: v, color });
}

/** Önündeki (ileri yönde, menzilde) en yakın hedef */
function aim(at: Pos, targets: Target[], range: number): Target | null {
  let best: Target | null = null, bd = Infinity;
  for (const t of targets) {
    if (!alive(t)) continue;
    const d = Math.hypot(t.i - at.i, t.j - at.j);
    if (d <= range + 0.5 && ahead(at, t) > -0.3 && sideways(at, t) < Math.max(2, range * 0.6) && d < bd) { best = t; bd = d; }
  }
  return best;
}

/** Hedefe ya da (hedef yoksa) düz ileri giden mermi */
function shot(kind: Effect["kind"], at: Pos, target: Target | null, range: number, damage: number, now: number, color?: string): Effect {
  let vi = at.dir * SHOT_SPEED / Math.SQRT2, vj = -at.dir * SHOT_SPEED / Math.SQRT2;
  if (target) { const di = target.i - at.i, dj = target.j - at.j, l = Math.hypot(di, dj) || 1; vi = (di / l) * SHOT_SPEED; vj = (dj / l) * SHOT_SPEED; }
  return { kind, i: at.i, j: at.j, dir: at.dir, at: now, until: now + (range + 1) / SHOT_SPEED, vi, vj, damage, color };
}

/** Silah vuruşu: bekleme süresine uyar, kombo adımını sayar; yakın silah hemen vurur, yay ve asa mermi atar */
export function attack(f: Fighter, e: Equipment, at: Pos, targets: Target[], now: number): Effect[] {
  if (now < f.readyAt) return [];
  const w = (e.weapon && weaponStats(e.weapon)) || FIST;
  f.comboStep = now - f.comboAt <= COMBO_WINDOW + w.cooldown && f.comboStep < w.combo ? f.comboStep + 1 : 1;
  f.comboAt = now; f.readyAt = now + w.cooldown;
  const finisher = w.combo > 1 && f.comboStep === w.combo;
  const damage = w.damage * (finisher ? COMBO_FINISH : 1);
  const out: Effect[] = [{ kind: "vurus", i: at.i, j: at.j, dir: at.dir, at: now, until: now + w.cooldown, step: f.comboStep, style: w.style, color: w.trail }];
  if (w.style === "yay" || w.style === "asa") {
    out.push(shot(w.style === "yay" ? "ok" : "kivilcim", at, aim(at, targets, w.range), w.range, damage, now, w.style === "asa" ? "#c9a6f0" : undefined));
    return out;
  }
  const reach = w.range + (finisher ? 0.4 : 0);
  for (const t of targets) {
    if (!alive(t) || Math.hypot(t.i - at.i, t.j - at.j) > reach + 0.3) continue;
    if (ahead(at, t) < -0.3 || sideways(at, t) > reach + 0.6) continue;
    hurt(t, damage, now, out, w.trail);
  }
  return out;
}

/** Büyü: yuvadaki büyüyü atar. Mana ya da bekleme yetmezse hiçbir şey değişmez. */
export function cast(f: Fighter, e: Equipment, slot: number, at: Pos, targets: Target[], now: number, partnerNear: boolean): Effect[] {
  const id = e.spells[slot];
  const s = id ? spellStats(id) : null;
  if (!id || !s || f.mana < s.mana || now < (f.spellReady[id] ?? 0)) return [];
  f.mana -= s.mana; f.spellReady[id] = now + s.cooldown;
  const out: Effect[] = [];
  const base = { i: at.i, j: at.j, dir: at.dir, at: now, color: s.color };
  const area = (ci: number, cj: number, r: number) => { for (const t of targets) if (Math.hypot(t.i - ci, t.j - cj) <= r + 0.4) hurt(t, s.damage, now, out, s.color); };
  switch (s.shape) {
    case "kivilcim": case "ok":
      out.push(shot(s.shape, at, aim(at, targets, s.range), s.range, s.damage, now, s.color)); break;
    case "kalkani":
      f.shield = 20 + Math.round(s.mana * 1.5); f.shieldUntil = now + 6;
      out.push({ ...base, kind: "kalkani", until: now + 6 }); break;
    case "muhru": case "patlamasi":
      area(at.i, at.j, s.range); out.push({ ...base, kind: s.shape, until: now + 0.9, value: s.range }); break;
    case "yagmuru": {
      const ci = at.i + at.dir * 2.1, cj = at.j - at.dir * 2.1;
      area(ci, cj, 2); out.push({ ...base, kind: "yagmuru", i: ci, j: cj, until: now + 1.2, value: 2 }); break;
    }
    case "ejder":
      for (const t of targets) if (alive(t) && ahead(at, t) > 0 && ahead(at, t) <= s.range * 1.4 && sideways(at, t) < 2.5) hurt(t, s.damage * 1.5, now, out, s.color);
      out.push({ ...base, kind: "ejder", until: now + 1.6, value: s.range }); break;
    case "sifa": case "iki-kalp": {
      const heal = s.heal * (s.shape === "iki-kalp" && partnerNear ? 2 : 1), before = f.hp;
      f.hp = Math.min(f.maxHp, f.hp + heal);
      out.push({ ...base, kind: s.shape, until: now + 1.2 }, { ...base, kind: "sifa-sayi", until: now + 1, value: f.hp - before });
      break;
    }
  }
  return out;
}

/** Can ve mana zamanla dolar; kalkanın süresi biter */
export function tick(f: Fighter, dt: number, now = 0): void {
  f.hp = Math.min(f.maxHp, f.hp + 2 * dt);
  f.mana = Math.min(f.maxMana, f.mana + 4 * dt);
  if (f.shield > 0 && now > f.shieldUntil && now > 0) f.shield = 0;
}

/** Mermileri ilerletir (çarpınca vurur), süresi dolan efektleri atar, yıkılan hedefleri kaldırır */
export function stepEffects(effects: Effect[], targets: Target[], now: number): Effect[] {
  for (const t of targets) if (t.hp === 0 && t.downAt !== undefined && now - t.downAt >= RESPAWN) { t.hp = t.maxHp; t.downAt = undefined; }
  const out: Effect[] = [];
  for (const e of effects) {
    if (e.vi !== undefined && e.vj !== undefined) {
      const k = now - e.at, pi = e.i + e.vi * k, pj = e.j + e.vj * k;
      const hit = targets.find((t) => alive(t) && Math.hypot(t.i - pi, t.j - pj) <= HIT_RADIUS);
      if (hit) { if (!e.visualOnly) hurt(hit, e.damage ?? 0, now, out, e.color); continue; }
    }
    if (now <= e.until) out.push(e);
  }
  return out;
}

/** Mermi efektinin şu anki konumu (çizim için) */
export const shotAt = (e: Effect, now: number): [number, number] => (e.vi === undefined || e.vj === undefined ? [e.i, e.j] : [e.i + e.vi * (now - e.at), e.j + e.vj * (now - e.at)]);

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  const dummy = (i: number, j: number, id = "t"): Target => ({ id, i, j, hp: 1000, maxHp: 1000, hitAt: -9 });
  const dmg = (fx: Effect[]) => fx.filter((e) => e.kind === "hasar").reduce((n, e) => n + (e.value ?? 0), 0);
  const me: Pos = { i: 0, j: 0, dir: 1 };
  {
    const f = newFighter(10, NO_EQUIPMENT);
    console.assert(f.maxHp === 150 && f.maxMana === 80 && f.hp === 150 && f.mana === 80, "can 100+lv*5, mana 50+lv*3");
    const a = armorStats("efsane-zirhi")!;
    console.assert(newFighter(30, { ...NO_EQUIPMENT, armor: "efsane-zirhi" }).maxHp === 250 + a.bonusHp, "zırh ek can verir");
  }
  {
    const eq = { ...NO_EQUIPMENT, weapon: "tahta-kilic" }, f = newFighter(5, eq), t = dummy(1, 0);
    const d1 = dmg(attack(f, eq, me, [t], 0)), d2 = dmg(attack(f, eq, me, [t], 0.4)), d3 = dmg(attack(f, eq, me, [t], 0.8));
    console.assert(d1 === weaponStats("tahta-kilic")!.damage && d2 === d1 && d3 === Math.round(d1 * 1.8), "üçlü kombo, üçüncüsü 1.8 kat");
    console.assert(t.hp === 1000 - d1 - d2 - d3, "hedefin canı azalır");
    console.assert(attack(f, eq, me, [t], 0.85).length === 0, "bekleme dolmadan vuruş yok");
    attack(f, eq, me, [t], 2.5);
    console.assert(f.comboStep === 1, "uzun aradan sonra kombo başa döner");
    const back = dummy(-1, 0);
    attack(f, eq, me, [back], 4);
    console.assert(back.hp === 1000, "arkadaki hedef vurulmaz");
  }
  {
    const eq = { ...NO_EQUIPMENT, spells: ["alev-topu", "sifa"] }, f = newFighter(20, eq);
    f.mana = 5;
    console.assert(cast(f, eq, 0, me, [], 0, false).length === 0 && f.mana === 5, "mana yetmezse büyü yok, mana değişmez");
    f.mana = f.maxMana; f.hp = f.maxHp - 5;
    cast(f, eq, 1, me, [], 0, false);
    console.assert(f.hp === f.maxHp && f.mana === f.maxMana - spellStats("sifa")!.mana, "şifa canı aşmaz, mana harcar");
    console.assert(cast(f, eq, 1, me, [], 0.5, false).length === 0, "büyü bekleme süresi");
    console.assert(cast(f, eq, 3, me, [], 9, false).length === 0, "boş yuva");
  }
  {
    const eq = { ...NO_EQUIPMENT, weapon: "avci-yayi" }, f = newFighter(5, eq), far = dummy(3, -2);
    let fx = attack(f, eq, me, [far], 0);
    console.assert(fx.some((e) => e.vi !== undefined) && far.hp === 1000, "yay ok atar, hemen vurmaz");
    for (let now = 0.05; now < 1.5; now += 0.05) fx = stepEffects(fx, [far], now);
    console.assert(far.hp < 1000, "ok uçup hedefe çarpar");
  }
  {
    const t = dummy(1, 0); t.hp = 1;
    const eq = { ...NO_EQUIPMENT, weapon: "tahta-kilic" }, f = newFighter(5, eq);
    stepEffects(attack(f, eq, me, [t], 0), [t], 0);
    console.assert(t.hp === 0, "hedef yıkılır");
    stepEffects([], [t], 2.2);
    console.assert(t.hp === t.maxHp, "yıkılan manken 2 sn sonra kalkar");
  }
  {
    const f = newFighter(10, NO_EQUIPMENT); f.mana = 0; f.hp = 10;
    tick(f, 1);
    console.assert(f.mana === 4 && f.hp === 12, "mana 4/sn, can 2/sn dolar");
    tick(f, 1000);
    console.assert(f.mana === f.maxMana && f.hp === f.maxHp, "en çok tam dolar");
  }
}
