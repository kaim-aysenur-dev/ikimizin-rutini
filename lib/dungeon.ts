// Ay Kapısı zindanı (saf motor): yaratık doğurma, yapay zekâ, oyuncuya hasar, tehlikeli zemin, yıldız puanı.
// VERİ ayrı dosyalarda: bölümler dungeon-stages.ts, yaratıklar dungeon-enemies.ts, temalar dungeon-themes.ts, harita okuyucu dungeon-map.ts.
// Çizim monster-draw.ts'te; ödül kaydı battle-server.ts'te. Bahçedeki gece hayaletleri de aynı yaratık sistemini kullanır.
import { FIST, wearStats, weaponStats } from "./combat-stats";
import { type Effect, type Fighter, type Target } from "./combat";
import { type Equipment } from "./equipment";
import { ENEMIES, type EnemyKind } from "./dungeon-enemies";
import { STAGES, type Stage, stageById } from "./dungeon-stages";
import { HAZARD_EFFECT, reachable, stageMap } from "./dungeon-map";

export { ENEMIES, type EnemyKind, STAGES, type Stage, stageById };

/** Tekrar geçişte (aynı gün yalnız bir kez) verilen XP oranı */
export const REPEAT_SHARE = 0.25;
export const GHOST_XP = 15;
export const GHOSTS_PER_NIGHT = 4;

/** Ekipman gücü: silahın saniyedeki hasarı + toplam savunma (bölüm önerisiyle karşılaştırılır) */
export function powerOf(e: Equipment): number {
  const w = (e.weapon && weaponStats(e.weapon)) || FIST, ws = wearStats(e);
  return Math.round(w.damage / w.cooldown + ws.defense * 1.2 + ws.bonusHp * 0.1);
}

export type Enemy = Target & {
  kind: EnemyKind; dmg: number; speed: number; range: number; cd: number; readyAt: number; dir: 1 | -1; dist: number; moving: boolean; spawnAt: number;
  elite?: string; // bölüm şefinin adı (iri, altın halkalı, daha güçlü)
};
export type EnemyShot = { i: number; j: number; vi: number; vj: number; dmg: number; until: number; color: string; kind: EnemyKind };

// güç bölümün seviyesiyle büyür: yeni bölümler eklendikçe ölçek kendiliğinden doğru kalır
const hpMul = (level: number) => 1 + (level - 1) * 0.26;
const dmgMul = (level: number) => 1 + (level - 1) * 0.18;
const ELITE = { hp: 2.4, dmg: 1.35 };

let seq = 0;
export function spawnEnemy(kind: EnemyKind, level: number, i: number, j: number, now: number, elite?: string): Enemy {
  const b = ENEMIES[kind], hp = Math.round(b.hp * hpMul(level) * (elite ? ELITE.hp : 1));
  return {
    id: `${kind}-${++seq}`, kind, i, j, hp, maxHp: hp, hitAt: -9, dmg: b.dmg * dmgMul(level) * (elite ? ELITE.dmg : 1),
    speed: b.speed * (elite ? 1.05 : 1), range: b.range, cd: b.cd, readyAt: now + 1 + Math.random(), dir: -1, dist: 0, moving: false, spawnAt: now, elite,
  };
}

/** Dalganın yaratıkları haritadaki doğma yerlerinde (oyuncudan en uzak olanlardan başlayarak); son dalgada şef de gelir */
export function spawnWave(stage: Stage, wave: number, now: number, player: [number, number]): Enemy[] {
  const m = stageMap(stage), out: Enemy[] = [];
  const spots = [...m.spawns].sort((a, b) => Math.hypot(b[0] - player[0], b[1] - player[1]) - Math.hypot(a[0] - player[0], a[1] - player[1]));
  let k = 0;
  for (const [kind, n] of stage.waves[wave] ?? []) for (let q = 0; q < n; q++, k++) {
    const [i, j] = ENEMIES[kind].boss ? m.boss : spots[k % Math.max(1, spots.length)] ?? m.boss;
    out.push(spawnEnemy(kind, stage.level, i + (Math.random() - 0.5) * 0.4, j + (Math.random() - 0.5) * 0.4, now + k * 0.2));
  }
  if (wave === stage.waves.length - 1) out.push(spawnEnemy(stage.champion.kind, stage.level, m.boss[0], m.boss[1], now + 0.6, stage.champion.name));
  return out;
}

/** Oyuncuya gelen hasar: önce kalkan büyüsü emer, sonra savunma azaltır. Dönen: canından düşen */
export function hitPlayer(f: Fighter, e: Equipment, raw: number): number {
  let dmg = raw;
  if (f.shield > 0) { const take = Math.min(f.shield, dmg); f.shield -= take; dmg -= take; }
  dmg = Math.max(dmg > 0 ? 1 : 0, Math.round(dmg * (100 / (100 + wearStats(e).defense))));
  f.hp = Math.max(0, f.hp - dmg);
  return dmg;
}

/** Tehlikeli zemin: oyuncunun durduğu karenin etkisi (yakma saniyede azami canın oranı, yavaşlatma çarpanı) */
export function hazardAt(stage: Stage | null, i: number, j: number) {
  if (!stage) return null;
  const hz = stageMap(stage).hazard.get(`${Math.floor(i)},${Math.floor(j)}`);
  return hz ? { kind: hz, ...HAZARD_EFFECT[hz] } : null;
}

/**
 * Yaratıklar: oyuncuya yürür (birbirinden biraz uzak durur), menzildeyse saldırır; menzilliler mermi atar ve çok yaklaşınca geri çekilir.
 * blocked: yürünemeyen kareler (uçanlar yok sayar). Dönen: bu karede oyuncuya isabet eden ham hasarlar.
 */
export function stepEnemies(enemies: Enemy[], shots: EnemyShot[], p: { i: number; j: number }, dt: number, now: number, bounds: { w: number; d: number }, blocked?: (i: number, j: number) => boolean): number[] {
  const hits: number[] = [];
  for (const en of enemies) {
    if (en.hp <= 0 || now < en.spawnAt) { en.moving = false; continue; }
    const base = ENEMIES[en.kind], wall = base.flying ? undefined : blocked;
    const di = p.i - en.i, dj = p.j - en.j, d = Math.hypot(di, dj) || 1;
    const want = base.ranged ? en.range * 0.75 : en.range * 0.85;
    let mi = 0, mj = 0;
    if (d > want) { mi = di / d; mj = dj / d; } else if (base.ranged && d < want * 0.5) { mi = -di / d; mj = -dj / d; }
    for (const o of enemies) { // kalabalıkta birbirine girmesin
      if (o === en || o.hp <= 0) continue;
      const oi = en.i - o.i, oj = en.j - o.j, od = Math.hypot(oi, oj);
      if (od > 0 && od < 0.8) { mi += (oi / od) * 0.6; mj += (oj / od) * 0.6; }
    }
    const ml = Math.hypot(mi, mj);
    en.moving = ml > 0.05;
    if (en.moving) {
      const st = (en.speed * dt) / ml, ni = Math.max(0.4, Math.min(bounds.w - 0.4, en.i + mi * st)), nj = Math.max(0.4, Math.min(bounds.d - 0.4, en.j + mj * st));
      const okI = !wall?.(Math.floor(ni), Math.floor(en.j)), okJ = !wall?.(Math.floor(en.i), Math.floor(nj));
      if (okI) en.i = ni;
      if (okJ) en.j = nj;
      // engele takılınca yana kayarak dolaş
      if (!okI && !okJ && wall) { const si = en.i - mj * st, sj = en.j + mi * st; if (!wall(Math.floor(si), Math.floor(sj))) { en.i = si; en.j = sj; } }
      en.dist += st * ml * 8;
    }
    const sx = di - dj; if (Math.abs(sx) > 0.05) en.dir = sx > 0 ? 1 : -1;
    if (d <= en.range + 0.2 && now >= en.readyAt) {
      en.readyAt = now + en.cd;
      if (base.ranged) {
        const sp = base.shot?.speed ?? 5.5;
        shots.push({ i: en.i, j: en.j, vi: (di / d) * sp, vj: (dj / d) * sp, dmg: en.dmg, until: now + (en.range + 1.5) / sp, color: base.shot?.color ?? "#c9a6f0", kind: en.kind });
      } else hits.push(en.dmg);
    }
  }
  // mermiler: oyuncuya değerse vurur (kaçılabilir); engele çarpınca söner
  for (let k = shots.length - 1; k >= 0; k--) {
    const s = shots[k];
    s.i += s.vi * dt; s.j += s.vj * dt;
    if (Math.hypot(s.i - p.i, s.j - p.j) < 0.55) { hits.push(s.dmg); shots.splice(k, 1); continue; }
    if (now > s.until || (blocked?.(Math.floor(s.i), Math.floor(s.j)) && !ENEMIES[s.kind].flying)) shots.splice(k, 1);
  }
  return hits;
}

/** Ölen yaratıklar kısa bir sönme sonrası listeden çıkar (talim hedefi gibi yeniden kalkmasın) */
export const pruneDead = (enemies: Enemy[], now: number) => enemies.filter((e) => e.hp > 0 || (e.downAt !== undefined && now - e.downAt < 0.7));

/** Hasar sayısı efekti (oyuncunun üstünde, kırmızı) */
export const hurtFx = (i: number, j: number, v: number, now: number): Effect => ({ kind: "hasar", i, j, dir: 1, at: now, until: now + 0.9, value: v, color: "#ff5a5a", visualOnly: true });

/** Yıldız: az hasar alıp hızlı bitirene üç yıldız */
export function starsFor(hpLostShare: number, seconds: number): 1 | 2 | 3 {
  if (hpLostShare < 0.35 && seconds < 150) return 3;
  if (hpLostShare < 0.75) return 2;
  return 1;
}

// kendi kendini denetler: bölüm verisi ve haritalar tutarlı, motor doğru çalışıyor
if (process.env.NODE_ENV !== "production") {
  console.assert(STAGES.every((s, k) => s.id === k + 1 && (k === 0 || (s.level > STAGES[k - 1].level && s.power > STAGES[k - 1].power && s.xp > STAGES[k - 1].xp))), "bölümler sırayla zorlaşır");
  for (const s of STAGES) {
    const m = stageMap(s);
    console.assert(s.map.every((r) => r.length === m.w) && m.w >= 16 && m.d >= 12, `${s.name}: harita satırları eşit uzunlukta`);
    console.assert(s.map.join("").split("S").length === 2 && s.map.join("").split("E").length === 2 && s.map.join("").split("B").length === 2, `${s.name}: bir giriş, bir çıkış, bir şef yeri`);
    console.assert(m.spawns.length >= 4, `${s.name}: en az dört doğma yeri`);
    const can = reachable(m, m.start), at = (c: [number, number]) => can.has(`${Math.floor(c[0])},${Math.floor(c[1])}`);
    console.assert(at(m.exit) && at(m.boss) && m.spawns.every(at), `${s.name}: çıkışa, şefe ve doğma yerlerine yürünür`);
    console.assert(s.waves.length === 3 && s.waves.every((w) => w.every(([kind, n]) => ENEMIES[kind] && n > 0)) && ENEMIES[s.champion.kind], `${s.name}: üç dalga ve şef`);
    console.assert([...s.map.join("")].every((ch) => ".SEmB#oRTgxfcnhue$Yk~=Lpwrit".includes(ch)), `${s.name}: bilinmeyen harita karakteri yok`);
  }
  const en = spawnEnemy("goblin", 1, 5, 5, 0); en.readyAt = 0;
  const hits = stepEnemies([en], [], { i: 5.5, j: 5 }, 0.1, 1, { w: 22, d: 16 });
  console.assert(hits.length === 1 && hits[0] === 4, "yakındaki goblin vurur");
  const f: Fighter = { hp: 100, maxHp: 100, mana: 0, maxMana: 0, shield: 10, shieldUntil: 9, comboStep: 0, comboAt: 0, readyAt: 0, spellReady: {} };
  const none: Equipment = { armor: null, helmet: null, legs: null, shield: null, cape: null, gloves: null, boots: null, trinket: null, saddle: null, barding: null, weapon: null, spells: [] };
  console.assert(hitPlayer(f, none, 15) === 5 && f.shield === 0 && f.hp === 95, "kalkan önce emer");
  console.assert(hitPlayer({ ...f, hp: 100, shield: 0 }, { ...none, armor: "efsane-zirhi" }, 100) < 100, "savunma hasarı azaltır");
  console.assert(spawnEnemy("goblin", 82, 0, 0, 0).maxHp > spawnEnemy("goblin", 1, 0, 0, 0).maxHp * 10, "ileri bölümde yaratık güçlenir");
  console.assert(spawnEnemy("ork", 10, 0, 0, 0, "Şef").maxHp > spawnEnemy("ork", 10, 0, 0, 0).maxHp * 2, "şef daha güçlü");
  const last = spawnWave(STAGES[0], 2, 0, stageMap(STAGES[0]).start);
  console.assert(last.some((e) => e.elite) && spawnWave(STAGES[0], 0, 0, [1, 1]).every((e) => !e.elite), "şef yalnız son dalgada");
  console.assert(powerOf({ ...none, weapon: "kilic-gok", armor: "gogusluk-gok" }) > powerOf(none) * 5, "güç ekipmanla artar");
  console.assert(hazardAt(stageById(13), 0.5, 0.5)?.kind === "lav" && hazardAt(stageById(13), 3.5, 7.5) === null, "lav yakar, taş zemin yakmaz");
  console.assert(starsFor(0.1, 60) === 3 && starsFor(0.9, 60) === 1, "yıldız puanı");
}
