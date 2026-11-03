// Otoriter, saf sefer motoru. Zaman, hasar, konum, ganimet ve rastgele olaylar sunucuda hesaplanır.
import { attack, cast, newFighter, stepEffects, tick, type Effect, type Fighter, type Target } from "./combat";
import { armorStats, damageAfterArmor, spellStats, weaponStats } from "./combat-stats";
import { type Equipment, sanitizeEquipment } from "./equipment";
import { ENEMY_INFO, REGIONS, enemyNumbers, regionOf, walkable, type EnemyKind, type Point, type RegionId } from "./expedition-content";

export type Input = { di: number; dj: number; attack: boolean; spell: number | null; dodge: boolean; interact: boolean };
export type Member = Fighter & Point & {
  id: string; name: string; level: number; equipment: Equipment; dir: 1 | -1; input: Input; lastSeq: number;
  seenAt: number; hitAt: number; dodgeUntil: number; dodgeReady: number; revive: number; moving: boolean;
  left?: boolean;
};
export type Warning = Point & { until: number; radius: number; kind: "slam" | "arrow" | "ring"; from: Point };
export type Enemy = Target & {
  kind: EnemyKind; boss: boolean; defense: number; guardDir?: 1 | -1; dir: 1 | -1; home: Point;
  readyAt: number; warning?: Warning; awake: boolean; counted: boolean; slowUntil: number; phase: number;
};
export type Notice = { id: number; text: string; until: number; kind: "story" | "danger" | "reward" };
export type Run = {
  id: string; region: RegionId; difficulty: number; party: number; seed: number; time: number;
  players: Record<string, Member>; enemies: Enemy[]; effects: Effect[]; objectives: number[]; secrets: string[];
  campUsed: boolean; raidAt: number; raided: boolean; checkpoint: Point; status: "waiting" | "active" | "won" | "lost";
  notices: Notice[]; serial: number; kills: number;
};
export type Campaign = { schema: 1; completed: string[]; trophies: string[]; shards: number; runs: number; run: Run | null };
export type HeroInfo = { id: string; name: string; level: number; equipment: Equipment };
export const emptyCampaign = (): Campaign => ({ schema: 1, completed: [], trophies: [], shards: 0, runs: 0, run: null });
export const idleInput = (): Input => ({ di: 0, dj: 0, attack: false, spell: null, dodge: false, interact: false });
const distance = (a: Point, b: Point) => Math.hypot(a.i - b.i, a.j - b.j);
export const isPresent = (p: Member, now: number) => !p.left && now - p.seenAt < 3;
export const partyReady = (r: Run, now = r.time) => Object.values(r.players).filter((p) => isPresent(p, now)).length === 2;
const alivePlayers = (r: Run) => Object.values(r.players).filter((p) => p.hp > 0 && isPresent(p, r.time));
function notice(r: Run, text: string, kind: Notice["kind"] = "story", duration = 5) {
  r.notices.push({ id: ++r.serial, text, kind, until: r.time + duration });
  r.notices = r.notices.slice(-6);
}
function pauseForPartner(r: Run, now: number) {
  const delta = Math.max(0, now - r.time);
  if (r.raidAt && !r.raided) r.raidAt += delta;
  for (const n of r.notices) n.until += delta;
  for (const p of Object.values(r.players)) {
    for (const key of ["readyAt", "shieldUntil", "dodgeUntil", "dodgeReady"] as const) if (p[key] > 0) p[key] += delta;
    for (const id of Object.keys(p.spellReady)) p.spellReady[id] += delta;
  }
  r.time = Math.max(r.time, now); r.status = "waiting"; r.effects = [];
  for (const p of Object.values(r.players)) { p.input = idleInput(); p.moving = false; }
  for (const e of r.enemies) { e.warning = undefined; e.readyAt = r.time + 1.5; }
}
function resumeTogether(r: Run, now: number) {
  if (r.status !== "waiting" || !partyReady(r, now)) return;
  r.time = Math.max(r.time, now);
  r.status = Object.values(r.players).every((p) => p.hp <= 0) ? "lost" : "active";
  notice(r, "İkiniz de buradasınız. Yolculuk birlikte başlıyor.", "story", 8);
}
function spawn(r: Run, kind: EnemyKind, at: Point, index: number, boss = false): Enemy {
  const n = enemyNumbers(regionOf(r.region)!, r.difficulty, kind, r.party, boss);
  return { id: `${r.id}:${index}`, kind, boss, i: at.i, j: at.j, home: { ...at }, hp: n.hp, maxHp: n.hp, defense: n.armor,
    hitAt: -9, respawn: false, dir: -1, guardDir: kind === "muhafiz" ? -1 : undefined, readyAt: r.time + 1,
    awake: !boss, counted: false, slowUntil: 0, phase: 1 };
}
export function canEnter(c: Campaign, regionId: string, difficulty: number, level: number): string | null {
  const region = regionOf(regionId);
  if (!region || !Number.isInteger(difficulty) || difficulty < 0 || difficulty > 2) return "Geçersiz sefer.";
  const required = region.minLevel + difficulty * 30;
  if (level < required) return `Bu sefer için seviye ${required} gerekiyor.`;
  if (region.chapter > 1) {
    const previous = REGIONS.find((r) => r.chapter === region.chapter - 1);
    if (!previous || !c.completed.includes(previous.id)) return "Önce bir önceki bölümü tamamlayın.";
  }
  return null;
}
export function startRun(c: Campaign, regionId: string, difficulty: number, hero: HeroInfo, id: string, seed: number, now: number): string | null {
  const error = canEnter(c, regionId, difficulty, hero.level);
  if (error) return error;
  if (c.run && (c.run.status === "active" || c.run.status === "waiting") && Object.values(c.run.players).some((p) => isPresent(p, now))) return "Hazırlanan sefere katılabilir veya önce seferden ayrılabilirsin.";
  const region = regionOf(regionId)!;
  const r: Run = { id, region: region.id, difficulty, party: 2, seed, time: now, players: {}, enemies: [], effects: [], objectives: [], secrets: [], campUsed: false, raidAt: 0, raided: false, checkpoint: { ...region.path[0] }, status: "waiting", notices: [], serial: 0, kills: 0 };
  c.run = r; c.runs++;
  for (let n = 1; n < region.path.length; n++) {
    const at = region.path[n];
    // Son açıklık yalnız boss'a ait; her ara kampın iki farklı nöbetçisi var.
    if (n === region.path.length - 1) break;
    const count = n === 1 ? 2 : 3;
    for (let k = 0; k < count; k++) r.enemies.push(spawn(r, region.enemies[(n + k - 1) % region.enemies.length], { i: at.i + (k - 1) * 1.8, j: at.j + 2 }, r.enemies.length));
  }
  r.enemies.push(spawn(r, region.bossKind, region.path[region.path.length - 1], r.enemies.length, true));
  joinRun(c, hero, now);
  notice(r, region.story, "story", 12);
  return null;
}
export function joinRun(c: Campaign, hero: HeroInfo, now: number): string | null {
  const r = c.run;
  if (!r || (r.status !== "active" && r.status !== "waiting")) return "Katılabileceğin bir sefer yok.";
  const error = canEnter(c, r.region, r.difficulty, hero.level);
  if (error) return error;
  if (!r.players[hero.id] && Object.keys(r.players).length >= 2) return "Bu yolculuk iki kişilik.";
  if (r.players[hero.id]) { r.players[hero.id].seenAt = now; r.players[hero.id].left = false; resumeTogether(r, now); return null; }
  const eq = sanitizeEquipment(hero.equipment, hero.level);
  r.players[hero.id] = { ...newFighter(hero.level, eq), ...r.checkpoint, ...hero, equipment: eq, dir: 1, input: idleInput(), lastSeq: -1, seenAt: now, hitAt: -9, dodgeUntil: 0, dodgeReady: 0, revive: 0, moving: false };
  if (Object.keys(r.players).length > r.party) {
    r.party = Object.keys(r.players).length;
    for (const e of r.enemies) {
      const n = enemyNumbers(regionOf(r.region)!, r.difficulty, e.kind, r.party, e.boss);
      e.hp = Math.round(e.hp / e.maxHp * n.hp); e.maxHp = n.hp;
    }
    notice(r, `${hero.name} yolculuğa katıldı. Birlikte daha güçlüsünüz; düşman dayanıklılığı da arttı.`);
  }
  resumeTogether(r, now);
  return null;
}
function move(r: Run, p: Point, di: number, dj: number, amount: number) {
  const region = regionOf(r.region)!, len = Math.hypot(di, dj) || 1;
  const ni = p.i + di / len * amount, nj = p.j + dj / len * amount;
  if (walkable(region, ni, p.j)) p.i = ni;
  if (walkable(region, p.i, nj)) p.j = nj;
}
function damagePlayer(r: Run, p: Member, raw: number, magic = false) {
  if (p.hp <= 0 || r.time < p.dodgeUntil) return;
  const defense = p.equipment.armor ? armorStats(p.equipment.armor)?.defense ?? 0 : 0;
  let value = damageAfterArmor(raw, defense * (magic ? 0.35 : 1));
  const absorb = Math.min(p.shield, value); p.shield -= absorb; value -= absorb;
  p.hp = Math.max(0, p.hp - value); p.hitAt = r.time; p.revive = 0;
  r.effects.push({ kind: "hasar", i: p.i, j: p.j, dir: 1, at: r.time, until: r.time + 0.9, value, color: "#ff8585" });
  if (!p.hp) { p.input = idleInput(); notice(r, `${p.name} düştü! Yanında F'yi basılı tutarak yardım edebilirsin.`, "danger"); }
}
function interact(r: Run, p: Member, dt: number, c: Campaign) {
  const region = regionOf(r.region)!;
  const fallen = Object.values(r.players).find((q) => q.id !== p.id && q.hp <= 0 && distance(p, q) < 2.2);
  if (fallen) {
    fallen.revive += dt;
    if (fallen.revive >= 3) { fallen.hp = fallen.maxHp * 0.45; fallen.revive = 0; fallen.dodgeUntil = r.time + 2; notice(r, `${p.name}, ${fallen.name} için elini uzattı. Yeniden birliktesiniz.`); }
    return;
  }
  if (r.enemies.some((e) => e.awake && e.hp > 0 && distance(p, e) < 5)) return;
  const obj = region.objectives.findIndex((q, index) => !r.objectives.includes(index) && distance(p, q) < 2.3);
  if (obj >= 0) {
    r.objectives.push(obj); r.checkpoint = { i: p.i, j: p.j }; c.shards += 3;
    notice(r, `${region.objectives[obj].name} tamamlandı. Yeni toplanma noktası açıldı.`, "reward");
    if (r.objectives.length === region.objectives.length) {
      const boss = r.enemies.find((e) => e.boss)!; boss.awake = true;
      notice(r, `${region.boss} uyandı. Saldırı işaretlerini izle!`, "danger", 7);
    }
    return;
  }
  const landmark = region.landmarks.find((q) => distance(p, q) < 2.3);
  if (!landmark) return;
  if (landmark.kind === "camp" && !r.campUsed) {
    r.campUsed = true; r.checkpoint = { ...landmark };
    for (const q of Object.values(r.players)) if (q.hp > 0 && distance(q, landmark) < 6) { q.hp = q.maxHp; q.mana = q.maxMana; }
    notice(r, "Ateş sizi ısıtıyor. Can ve mana yenilendi. Bu ateşin erzağı bir seferlik.", "reward");
    if (r.seed % 100 < 35) { r.raidAt = r.time + 4; notice(r, "Uzakta bir boru… Çalıların arasında ayak sesleri!", "danger", 5); }
    else if (r.seed % 5 === 0) { r.secrets.push("beyaz-geyik"); c.shards += 5; notice(r, "Beyaz bir geyik ateşe yaklaşıyor. Boynuzlarından yıldız tozu dökülüyor. +5 yıldız parçası", "reward", 8); }
  }
  if (landmark.kind === "chest" && !r.secrets.includes(landmark.name)) {
    r.secrets.push(landmark.name); c.shards += 8;
    notice(r, `${landmark.text} +8 yıldız parçası.`, "reward", 8);
  }
}
function tickRun(c: Campaign, dt: number) {
  const r = c.run!, region = regionOf(r.region)!;
  r.time += dt;
  const players = alivePlayers(r);
  for (const p of players) {
    tick(p, dt, r.time);
    const len = Math.hypot(p.input.di, p.input.dj);
    p.moving = len > 0;
    if (len) { move(r, p, p.input.di, p.input.dj, 3.2 * dt); const sx = p.input.di - p.input.dj; if (sx) p.dir = sx > 0 ? 1 : -1; }
    // Basılı saldırı sunucu adımlarında sürer; ağ sorgu aralığı hızlı silahları yavaşlatmaz.
    if (p.input.attack) r.effects.push(...attack(p, p.equipment, p, r.enemies.filter((e) => e.hp > 0 && e.awake), r.time));
    if (p.input.interact && !len) interact(r, p, dt, c);
  }
  for (const p of Object.values(r.players)) if (p.hp <= 0 && !players.some((q) => q.input.interact && !Math.hypot(q.input.di, q.input.dj) && distance(p, q) < 2.2)) p.revive = 0;
  if (r.raidAt && !r.raided && r.time >= r.raidAt) {
    r.raided = true;
    const camp = region.landmarks.find((q) => q.kind === "camp")!;
    for (let n = 0; n < 3; n++) r.enemies.push(spawn(r, region.enemies[n % region.enemies.length], { i: camp.i + n - 1, j: camp.j + 4 }, r.enemies.length));
    notice(r, "Baskın! Ateşinizin dumanını takip etmişler.", "danger", 6);
  }
  for (const e of r.enemies) {
    if (e.hp <= 0 || !e.awake || !players.length) continue;
    if (e.warning && e.warning.until <= r.time) {
      const w = e.warning;
      if (e.boss && e.kind === "ork" && e.phase > 1) move(r, e, w.i - e.i, w.j - e.j, Math.min(4, distance(e, w)));
      for (const p of players) if (distance(p, w) < w.radius) damagePlayer(r, p, enemyNumbers(region, r.difficulty, e.kind, r.party, e.boss).damage, e.kind === "saman" || e.kind === "golge");
      r.effects.push({ kind: e.kind === "golge" ? "yagmuru" : "patlamasi", i: w.i, j: w.j, dir: e.dir, at: r.time, until: r.time + 0.45, value: w.radius, color: e.kind === "trol" ? "#b3ccaa" : region.colors.accent });
      e.warning = undefined; e.readyAt = r.time + ENEMY_INFO[e.kind].cooldown * (e.boss && e.phase > 1 ? 0.8 : 1);
    }
    const target = players.reduce((a, b) => distance(a, e) < distance(b, e) ? a : b);
    if (distance(target, e) > (e.boss ? 14 : 8)) {
      move(r, e, e.home.i - e.i, e.home.j - e.j, Math.min(distance(e, e.home), dt));
      if (distance(e, e.home) < 0.5 && r.time - e.hitAt > 8) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * dt * 0.1);
      continue;
    }
    const info = ENEMY_INFO[e.kind];
    e.dir = target.i - target.j > e.i - e.j ? 1 : -1;
    e.guardDir = e.kind === "muhafiz" && !e.warning && r.time > e.readyAt - 1 ? e.dir : undefined;
    if (e.warning) continue;
    if (e.boss) {
      const phase = e.hp / e.maxHp < 0.3 ? 3 : e.hp / e.maxHp < 0.65 ? 2 : 1;
      if (phase > e.phase) {
        e.phase = phase; notice(r, `${region.boss}: ${phase}. evre! ${e.kind === "trol" ? "Yer sarsılıyor." : "Saldırı düzeni değişiyor."}`, "danger");
        if (phase === 3 && e.kind === "golge") for (let n = 0; n < 2; n++) r.enemies.push(spawn(r, "golge", { i: e.i + n * 3 - 1.5, j: e.j + 2 }, r.enemies.length));
      }
    }
    const ranged = e.kind === "okcu" || e.kind === "saman" || e.kind === "golge";
    const range = e.boss && e.kind === "ork" && e.phase > 1 ? 4.5 : info.range;
    if (ranged && distance(e, target) < 2.5) move(r, e, e.i - target.i, e.j - target.j, info.speed * dt);
    else if (distance(e, target) > range) move(r, e, target.i - e.i, target.j - e.j, info.speed * (r.time < e.slowUntil ? 0.4 : 1) * dt);
    if (distance(e, target) <= range + 0.3 && r.time >= e.readyAt) {
      if (e.kind === "saman") {
        const ally = r.enemies.find((q) => q.id !== e.id && q.hp > 0 && q.hp < q.maxHp * 0.7 && distance(q, e) < 5);
        if (ally) { const heal = Math.round(ally.maxHp * 0.12); ally.hp = Math.min(ally.maxHp, ally.hp + heal); r.effects.push({ kind: "sifa-sayi", ...ally.home, i: ally.i, j: ally.j, dir: 1, at: r.time, until: r.time + 1, value: heal }); e.readyAt = r.time + 5; continue; }
      }
      const ring = e.boss && e.phase > 1 && (e.kind === "trol" || e.kind === "golge");
      e.warning = { i: ring ? e.i : target.i, j: ring ? e.j : target.j, from: { i: e.i, j: e.j }, radius: ring ? 3.2 : e.kind === "okcu" ? 1 : e.kind === "trol" ? 2.3 : 1.5,
        until: r.time + info.windup + (e.boss ? 0.2 : 0), kind: ring ? "ring" : e.kind === "okcu" ? "arrow" : "slam" };
      if (e.kind === "okcu") r.effects.push({ kind: "ok", i: e.i, j: e.j, dir: e.dir, at: r.time, until: e.warning.until, vi: (target.i - e.i) / info.windup, vj: (target.j - e.j) / info.windup, visualOnly: true });
    }
  }
  const enemyShots = r.effects.filter((e) => e.visualOnly && e.until >= r.time);
  r.effects = [...stepEffects(r.effects.filter((e) => !e.visualOnly), r.enemies.filter((e) => e.awake), r.time), ...enemyShots];
  for (const e of r.enemies) {
    if (e.hp <= 0 && !e.counted) { e.counted = true; r.kills++; c.shards += e.boss ? 20 * (r.difficulty + 1) : 1; }
  }
  const boss = r.enemies.find((e) => e.boss)!;
  if (boss.hp <= 0 && r.status === "active") {
    r.status = "won";
    if (!c.completed.includes(r.region)) c.completed.push(r.region);
    if (!c.trophies.includes(region.trophy)) c.trophies.push(region.trophy);
    notice(r, region.ending, "reward", 60);
  } else if (!players.length && Object.values(r.players).some((p) => isPresent(p, r.time))) { r.status = "lost"; notice(r, "Yolculuk bitmedi. Toplanma noktasında yeniden ayağa kalkabilirsiniz.", "danger", 60); }
  r.notices = r.notices.filter((n) => n.until > r.time);
  r.effects = r.effects.slice(-180);
}
/** Uzakta/çevrimdışı geçirilen zaman bir anda hasara dönüşmez. */
export function advance(c: Campaign, now: number) {
  const r = c.run;
  if (!r || r.status === "won") return;
  if (!partyReady(r, now)) { pauseForPartner(r, now); return; }
  resumeTogether(r, now);
  if (r.status !== "active") return;
  const end = Math.max(r.time, now), start = Math.max(r.time, end - 0.6);
  if (end - r.time > 1) for (const e of r.enemies) { e.warning = undefined; e.readyAt = end + 1.5; }
  r.time = start;
  let remaining = end - start;
  while (remaining > 0.00001 && r.status === "active") { const dt = Math.min(0.05, remaining); tickRun(c, dt); remaining -= dt; }
}
export function command(c: Campaign, userId: string, seq: number, input: Input, now: number): string | null {
  const r = c.run, p = r?.players[userId];
  if (!r || !p) return "Önce sefere katıl.";
  if (p.left) return "Seferden ayrıldın; tekrar katılman gerekiyor.";
  p.seenAt = now;
  resumeTogether(r, now);
  if (seq <= p.lastSeq) return null;
  p.lastSeq = seq;
  if (!partyReady(r, now) || r.status !== "active" || p.hp <= 0) return null;
  p.input = { ...input };
  if (input.dodge && r.time >= p.dodgeReady) {
    const moving = Math.hypot(input.di, input.dj) > 0;
    move(r, p, moving ? input.di : p.dir, moving ? input.dj : -p.dir, 1.5);
    p.dodgeUntil = r.time + 0.45; p.dodgeReady = r.time + 2.2;
  }
  const targets = r.enemies.filter((e) => e.hp > 0 && e.awake);
  if (input.attack) r.effects.push(...attack(p, p.equipment, p, targets, r.time));
  if (input.spell !== null) {
    const id = p.equipment.spells[input.spell], spec = id ? spellStats(id) : null;
    const fx = cast(p, p.equipment, input.spell, p, targets, r.time, alivePlayers(r).some((q) => q.id !== p.id && distance(p, q) < 2.2));
    r.effects.push(...fx);
    if (fx.length && spec) {
      if (spec.shape === "muhru") for (const e of targets) if (distance(p, e) < spec.range + 0.4) e.slowUntil = r.time + (e.boss ? 1 : 2.5);
      if (spec.shape === "iki-kalp") for (const q of alivePlayers(r)) if (q.id !== p.id && distance(p, q) < 2.2) q.hp = Math.min(q.maxHp, q.hp + spec.heal);
    }
  }
  return null;
}
export function depart(c: Campaign, userId: string) {
  const p = c.run?.players[userId];
  if (p) { p.left = true; p.seenAt = 0; p.input = idleInput(); }
  if (c.run && c.run.status !== "won") pauseForPartner(c.run, c.run.time);
}
export function recover(c: Campaign, userId: string): string | null {
  const r = c.run;
  if (!r || !r.players[userId] || r.status !== "lost" || !partyReady(r)) return "Toparlanmak için ikiniz de seferde olmalısınız.";
  r.status = "active"; r.effects = [];
  for (const p of Object.values(r.players)) { p.hp = p.maxHp; p.mana = p.maxMana; p.shield = 0; p.shieldUntil = 0; p.input = idleInput(); p.i = r.checkpoint.i; p.j = r.checkpoint.j; p.dodgeUntil = r.time + 3; }
  for (const e of r.enemies) if (e.hp > 0 || e.boss) { e.hp = e.maxHp; e.i = e.home.i; e.j = e.home.j; e.warning = undefined; e.phase = 1; e.readyAt = r.time + 2; }
  notice(r, "Birlikte yeniden başlayın. Eşyalarınız ve tamamlanan hedefleriniz korundu.");
  return null;
}

export function loadoutSummary(level: number, eq: Equipment) {
  const w = eq.weapon ? weaponStats(eq.weapon) : null, a = eq.armor ? armorStats(eq.armor) : null;
  return { hp: 100 + level * 5 + (a?.bonusHp ?? 0), mana: 50 + level * 3, damage: w?.damage ?? 4,
    dps: w ? w.damage / w.cooldown * (w.combo > 1 ? 1 + 0.8 / w.combo : 1) : 14, reduction: a ? Math.round(a.defense / (60 + a.defense) * 100) : 0 };
}
