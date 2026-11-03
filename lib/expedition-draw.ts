import { at, box, shade, tile, type Origin } from "./iso";
import { P, STAND, WALK, disc, drawCharacter, line, poly, px, rect, rnd, type Ctx } from "./pixel";
import { drawEffect, drawHeld } from "./combat-draw";
import { armorStats, weaponStats } from "./combat-stats";
import { TIERS } from "./scenes/hall";
import { tierOf } from "./xp";
import { MAP, pathDistance, regionOf, walkable, type Landmark, type Region } from "./expedition-content";
import { isPresent, type Enemy, type Member, type Run } from "./expedition";
import { lights } from "./env";

type Ground = { i: number; j: number; path: boolean; open: boolean; random: number };
const maps = new Map<string, Ground[]>();
function terrain(r: Region): Ground[] {
  let cells = maps.get(r.id);
  if (!cells) {
    cells = [];
    for (let i = -12; i < MAP.w + 12; i++) for (let j = -12; j < MAP.h + 12; j++) cells.push({ i, j, path: pathDistance(r, { i, j }) < 1.6, open: walkable(r, i, j), random: rnd(i * 307 + j * 53 + r.chapter * 29) });
    maps.set(r.id, cells);
    if (maps.size > 8) maps.delete(maps.keys().next().value!);
  }
  return cells;
}
function label(c: Ctx, x: number, y: number, text: string, color = "#eee1bd", size = 7) {
  c.font = `${size}px monospace`; c.textAlign = "center";
  const w = c.measureText(text).width;
  rect(c, x - w / 2 - 3, y - size, w + 6, size + 3, "#111623dc");
  c.fillStyle = color; c.fillText(text, Math.round(x), Math.round(y));
}
function glow(c: Ctx, x: number, y: number, color: string, radius = 32) {
  const g = c.createRadialGradient(x, y, 1, x, y, radius);
  g.addColorStop(0, color); g.addColorStop(1, "transparent"); c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function fire(c: Ctx, x: number, y: number, t: number, blue = false) {
  glow(c, x, y - 8, blue ? "#8dcdf02d" : "#edb65a38");
  line(c, [x - 5, y], [x + 5, y - 2], 3, "#3e3028"); line(c, [x - 4, y - 3], [x + 4, y + 1], 2, "#8a6443");
  for (let k = 0; k < 5; k++) { const h = 4 + Math.sin(t * 10 + k * 2) * 2; rect(c, x - 4 + k * 2, y - h - 2, 2, h, blue ? "#7bc6f0" : "#ee934d"); px(c, x - 4 + k * 2, y - h, blue ? "#def5ff" : "#ffe5a0"); }
  for (let k = 0; k < 3; k++) px(c, x + Math.sin(t * 3 + k) * 4, y - ((t * 7 + k * 5) % 20), "#e2b45a");
}
function tree(c: Ctx, x: number, y: number, seed: number, r: Region, t: number) {
  const h = 27 + Math.floor(seed * 25);
  rect(c, x - 3, y - h, 6, h, "#151e22"); rect(c, x - 1, y - h, 2, h, "#574538");
  line(c, [x, y - 18], [x - 9, y - 29], 2, "#453a32"); line(c, [x + 1, y - 25], [x + 10, y - 38], 2, "#453a32");
  for (let k = 0; k < 3; k++) line(c, [x, y - 2], [x - 5 + k * 5, y + 2], 2, "#403c2e");
  if (r.biome !== "pass" && seed > 0.18) {
    const sway = Math.round(Math.sin(t * 0.8 + seed * 30));
    for (let k = 0; k < 3; k++) {
      const top = y - h - k * 6, width = 17 - k * 3;
      poly(c, [[x + sway, top - 13], [x + width, top + 9], [x + 5, top + 7], [x, top + 12], [x - width, top + 8]], k % 2 ? r.colors.canopy : r.colors.edge);
      line(c, [x - width + 4, top + 5], [x - 1, top - 7], 1, r.colors.canopy);
    }
  } else for (let k = 0; k < 4; k++) line(c, [x, y - h + k * 6], [x + (k % 2 ? -1 : 1) * (7 + k), y - h + k * 6 - 7], 2, "#54494b");
  if (r.biome === "swamp") for (let k = 0; k < 3; k++) line(c, [x + k * 4 - 3, y - h + 8], [x + k * 4 - 4, y - h + 20], 1, "#5b7e63");
}
function ruin(c: Ctx, o: Origin, i: number, j: number, seed: number, r: Region, t: number) {
  const [x, y] = at(o, i, j);
  box(c, o, i, j, 1.3, 0.6, 12 + seed * 16, shade(r.biome === "castle" ? "#514859" : "#62605b"));
  for (let k = 0; k < 4; k++) line(c, [x - 2, y - 6 - k * 5], [x + 8, y - 3 - k * 5], 1, "#35343c");
  if (seed > 0.6) { line(c, [x + 4, y - 22], [x + 4, y - 12], 2, "#322931"); poly(c, [[x + 4, y - 23], [x + 12, y - 19], [x + 4, y - 15]], r.biome === "castle" ? "#773a64" : "#8f513c"); }
  if (seed > 0.85) fire(c, x + 5, y - 18, t, r.biome === "castle");
}
function landmark(c: Ctx, o: Origin, l: Landmark, r: Region, t: number, done: boolean) {
  const [x, y] = at(o, l.i, l.j), accent = done ? "#9fd8ac" : r.colors.accent;
  glow(c, x, y - 5, `${accent}22`, 30);
  if (l.kind === "camp") {
    fire(c, x, y, t);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; disc(c, x + Math.cos(a) * 8, y + Math.sin(a) * 4, 2, "#7d7a71"); }
    poly(c, [[x - 28, y - 2], [x - 16, y - 21], [x - 3, y - 3]], "#212329", 1);
    poly(c, [[x - 27, y - 3], [x - 16, y - 20], [x - 14, y - 3]], "#796244");
    poly(c, [[x - 16, y - 20], [x - 5, y - 4], [x - 14, y - 3]], "#4b4635");
    rect(c, x + 13, y - 3, 14, 3, "#76583e"); rect(c, x + 15, y, 2, 3, "#322c2c");
    disc(c, x + 16, y - 6, 2, "#c4b98e"); line(c, [x + 9, y - 4], [x + 8, y - 16], 1, "#6f6151"); rect(c, x + 6, y - 17, 4, 4, "#c4a05b");
  } else if (l.kind === "cage") {
    box(c, o, l.i - 1, l.j - 1, 2, 2, 2, shade("#65513d"));
    for (let k = -12; k <= 12; k += 4) line(c, [x + k, y - 3], [x + k, y - 23], 1, "#969495");
    line(c, [x - 12, y - 23], [x + 12, y - 23], 2, "#494951");
    if (!done) { disc(c, x, y - 13, 3, "#c6a17e"); rect(c, x - 2, y - 10, 5, 7, "#8d7a57"); }
    else line(c, [x + 12, y - 23], [x + 22, y - 9], 1, "#969495");
  } else if (l.kind === "tower") {
    box(c, o, l.i - 1, l.j, 2, 1.3, 21, shade("#696563"));
    for (let k = 0; k < 3; k++) { rect(c, x - 7 + k * 6, y - 29, 4, 6, "#9a9183"); line(c, [x - 6, y - k * 5], [x + 4, y + 3 - k * 5], 1, "#45424b"); }
    rect(c, x - 2, y - 19, 5, 9, "#24232d");
    if (done) fire(c, x, y - 29, t); else { line(c, [x - 20, y - 1], [x - 9, y - 11], 3, "#765c45"); rect(c, x - 21, y - 3, 7, 2, "#b49b6b"); }
  } else if (l.kind === "bridge") {
    for (let k = -2; k <= 2; k++) box(c, o, l.i + k * 0.7, l.j - 1, 0.65, 2, 2, shade("#8b7354"));
    for (const side of [-1, 1]) { line(c, [x - 15, y + side * 6 - 10], [x + 15, y + side * 6 - 10], 1, "#b1a17d"); rect(c, x - 15, y + side * 6 - 12, 2, 13, "#4b4136"); }
  } else if (l.kind === "cart") {
    box(c, o, l.i - 1, l.j - 0.5, 2, 1.4, 7, shade("#7c5f43"));
    for (const dx of [-10, 10]) { disc(c, x + dx, y + 2, 4, "#29242a"); disc(c, x + dx, y + 2, 2, "#a18559"); }
    rect(c, x - 5, y - 13, 9, 6, "#af9b6b"); line(c, [x + 10, y - 6], [x + 23, y - 3], 2, "#715540");
  } else if (l.kind === "chest") {
    box(c, o, l.i - 0.6, l.j - 0.6, 1.2, 1, 7, shade(done ? "#554632" : "#83683e"));
    rect(c, x - 3, y - 6, 3, 5, accent); line(c, [x - 8, y - 9], [x + 7, y - 3], 1, "#c2a575");
    if (!done) for (let k = 0; k < 3; k++) px(c, x - 7 + k * 7, y - 14 - Math.sin(t * 3 + k) * 3, "#f5df99");
  } else {
    box(c, o, l.i - 1, l.j - 1, 2, 2, l.kind === "altar" ? 10 : 3, shade("#626278"));
    for (let k = 0; k < 8; k++) { const a = t * 0.4 + k * Math.PI / 4; px(c, x + Math.cos(a) * 10, y - 10 + Math.sin(a) * 5, accent); }
    poly(c, [[x, y - 25], [x + 5, y - 16], [x, y - 10], [x - 5, y - 16]], accent); px(c, x - 1, y - 20, "#f1edff");
  }
  label(c, x, y - (l.kind === "tower" ? 39 : 32), `${done ? "✓ " : ""}${l.name}`, accent, 6);
}
function campDetails(c: Ctx, o: Origin, l: Landmark, r: Region, t: number) {
  const [x, y] = at(o, l.i - 2, l.j - 2);
  if (r.biome === "forest") {
    poly(c, [[x - 32, y], [x - 15, y - 25], [x + 3, y]], "#352c29", 1);
    poly(c, [[x - 30, y - 1], [x - 15, y - 24], [x - 12, y - 1]], "#9b7651");
    poly(c, [[x - 15, y - 24], [x + 2, y - 1], [x - 12, y - 1]], "#65513d");
    rect(c, x - 13, y - 9, 5, 8, "#30282a"); line(c, [x - 15, y - 26], [x - 15, y + 1], 1, "#bea77a");
    for (let k = 0; k < 5; k++) { const sx = x + 14 + k * 4; line(c, [sx, y + 8 + k], [sx, y - 4 + k], 2, "#6b5b42"); px(c, sx, y - 5 + k, "#b19b71"); }
    fire(c, x + 18, y + 22, t); line(c, [x + 9, y + 14], [x + 27, y + 14], 1, "#8b7961"); disc(c, x + 18, y + 17, 4, "#34313c");
    rect(c, x + 3, y + 16, 6, 3, "#a9996a");
  } else if (r.biome === "pass") {
    box(c, o, l.i - 3, l.j - 3, 2, 1.5, 18, shade("#73665c"));
    const [bx, by] = at(o, l.i - 3, l.j - 3);
    poly(c, [[bx - 11, by - 18], [bx + 7, by - 35], [bx + 30, by - 17], [bx + 15, by - 9]], "#4a3d40", 1);
    line(c, [bx + 5, by - 27], [bx + 22, by - 16], 2, "#967460");
    rect(c, bx + 7, by - 15, 4, 7, "#1b222a");
    for (let k = 0; k < 3; k++) box(c, o, l.i + 2.5, l.j - 2 + k, 0.8, 0.8, 4 + k * 2, shade(k % 2 ? "#93764c" : "#6d674f"));
    line(c, [x + 10, y + 17], [x + 34, y + 25], 3, "#50433d"); line(c, [x + 12, y + 12], [x + 29, y + 28], 2, "#9d7951");
  } else if (r.biome === "swamp") {
    for (let k = 0; k < 4; k++) { const [sx, sy] = at(o, l.i - 3 + k, l.j - 2); rect(c, sx, sy - 9, 2, 16, "#4b4b3d"); line(c, [sx - 3, sy - 5], [sx + 5, sy - 2], 1, "#83a090"); }
    const [boatX, boatY] = at(o, l.i + 3, l.j - 1);
    poly(c, [[boatX - 15, boatY - 3], [boatX + 15, boatY + 3], [boatX + 8, boatY + 10], [boatX - 10, boatY + 4]], "#675a45", 1);
    poly(c, [[boatX - 11, boatY - 1], [boatX + 10, boatY + 3], [boatX + 6, boatY + 6], [boatX - 8, boatY + 3]], "#303b39");
    line(c, [boatX - 4, boatY - 10], [boatX + 12, boatY + 13], 2, "#ab9970");
    glow(c, boatX + 6, boatY - 10, "#8ad9c13a", 20); disc(c, boatX + 6, boatY - 10, 2, "#9edac6");
    for (let k = 0; k < 8; k++) { const [rx, ry] = at(o, l.i + 3 + k % 3, l.j + k / 4); line(c, [rx, ry], [rx + Math.sin(t + k), ry - 8 - k % 4], 1, "#709577"); }
  } else {
    const [sx, sy] = at(o, l.i - 3, l.j - 3);
    for (const side of [-1, 1]) { rect(c, sx + side * 16 - 3, sy - 38, 7, 36, "#51475d"); rect(c, sx + side * 16 - 2, sy - 36, 2, 32, "#8a7a8d"); disc(c, sx + side * 16, sy - 40, 5, "#77677c"); }
    line(c, [sx - 16, sy - 38], [sx, sy - 48], 5, "#6a5b73"); line(c, [sx, sy - 48], [sx + 16, sy - 38], 5, "#6a5b73");
    rect(c, sx - 12, sy - 15, 24, 8, "#743f5d"); line(c, [sx - 12, sy - 11], [sx + 12, sy - 11], 1, "#d0b37b");
    fire(c, sx - 17, sy - 19, t, true); fire(c, sx + 17, sy - 19, t, true);
    for (let k = 0; k < 4; k++) { const [bx, by] = at(o, l.i + 2, l.j - 3 + k * 0.6); rect(c, bx - 3, by - 7, 8, 6, k % 2 ? "#795368" : "#526383"); px(c, bx - 1, by - 5, "#c8af72"); }
  }
}
function arena(c: Ctx, o: Origin, r: Region, t: number, awake: boolean) {
  const p = r.path[r.path.length - 1];
  for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) if (i * i + j * j < 19) {
    tile(c, o, p.i + i, p.j + j, (i + j) % 2 ? "#55515a" : "#454550");
    if (i * i + j * j > 12) { const [x, y] = at(o, p.i + i + 0.5, p.j + j + 0.5); px(c, x, y - 1, awake ? r.colors.accent : "#878080"); }
  }
  const [x, y] = at(o, p.i, p.j);
  for (const side of [-1, 1]) { box(c, o, p.i + side * 3, p.j - 3, 0.8, 0.8, 33, shade("#68606c")); const [tx, ty] = at(o, p.i + side * 3, p.j - 3); fire(c, tx, ty - 35, t, r.biome === "castle"); }
  poly(c, [[x - 5, y - 23], [x + 5, y - 23], [x + 8, y - 8], [x - 8, y - 8]], "#3b303e");
  if (!awake) label(c, x, y - 63, "Üç mührün ardında…", "#b0a7a0", 6);
}
function enemy(c: Ctx, x: number, y: number, e: Enemy, r: Region, t: number) {
  if (e.hp <= 0) { line(c, [x - 5, y - 2], [x + 6, y + 1], 3, "#302f33"); rect(c, x + 3, y - 4, 2, 2, "#8a7a5d"); return; }
  const scale = e.boss ? 1.8 : e.kind === "trol" ? 1.5 : 1;
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(scale, scale);
  disc(c, 0, 0, 8, "#00000044");
  const skin = e.kind === "ork" ? "#7e9a59" : e.kind === "trol" ? "#819786" : e.kind === "golge" ? "#aaa0c9" : "#c2a18a";
  const body = e.kind === "saman" ? "#765782" : e.kind === "muhafiz" ? "#8f8a99" : e.kind === "golge" ? "#4c385d" : "#655344";
  const bob = e.warning ? -1 : Math.round(Math.sin(t * 5 + e.home.i));
  if (e.kind === "kurt") {
    poly(c, [[-10, -5], [-7, -12], [3, -11], [10 * e.dir, -16], [12 * e.dir, -8], [7, -4]], "#686e79", 1);
    rect(c, -6, -4, 2, 5, "#a4a69b"); rect(c, 5, -4, 2, 5, "#a4a69b"); px(c, e.dir * 9, -12, "#f3bd70");
    line(c, [-8 * e.dir, -8], [-14 * e.dir, -13], 2, "#62656f");
  } else {
    rect(c, -5, -8, 4, 8, "#282b34"); rect(c, 2, -8, 4, 8, "#282b34");
    rect(c, -7, -20 + bob, 15, 14, "#151924"); rect(c, -6, -19 + bob, 13, 11, body);
    rect(c, -5, -27 + bob, 10, 9, "#172027"); rect(c, -4, -26 + bob, 8, 7, skin);
    rect(c, -7, -19 + bob, 3, 10, skin); rect(c, 6, -19 + bob, 3, 9, skin);
    px(c, -2, -23 + bob, "#f6dfa6"); px(c, 2, -23 + bob, "#f6dfa6");
    if (e.kind === "ork" || e.kind === "trol") { rect(c, -3, -20 + bob, 1, 3, "#ece2b8"); rect(c, 2, -20 + bob, 1, 3, "#ece2b8"); }
    if (e.kind === "muhafiz") { rect(c, -5, -28 + bob, 10, 4, "#b0a9b5"); line(c, [-4, -22 + bob], [4, -22 + bob], 2, "#3b3444"); }
    const hand: [number, number] = [e.dir * 8, -12 + bob];
    if (e.kind === "okcu") { line(c, [hand[0], -23], [hand[0], -4], 1, "#b6a282"); poly(c, [[hand[0], -23], [hand[0] + e.dir * 5, -13], [hand[0], -4]], "#735a43"); }
    else if (e.kind === "saman" || e.kind === "golge") { line(c, hand, [e.dir * 10, -32], 2, "#806644"); disc(c, e.dir * 10, -33, 3, r.colors.accent); }
    else { const lift = e.warning ? -13 : 0; line(c, hand, [e.dir * 12, -22 + lift], 2, "#9b7950"); rect(c, e.dir * 12 - 4, -26 + lift, 8, 5, e.kind === "trol" ? "#8a9691" : "#a9abb3"); }
    if (e.guardDir) { poly(c, [[-e.dir * 4, -20], [-e.dir * 12, -18], [-e.dir * 11, -8], [-e.dir * 6, -5]], "#36394b", 1); line(c, [-e.dir * 8, -18], [-e.dir * 8, -8], 1, "#b2a077"); }
    rect(c, -5, -9, 10, 2, "#342a2d"); px(c, 0, -9, "#c4aa6c");
    if (e.boss) { poly(c, [[-5, -28], [-7, -34], [-1, -30], [3, -35], [6, -28]], "#d5b675"); rect(c, -7, -18, 2, 19, "#8d3c55"); }
  }
  if (t - e.hitAt < 0.15) { c.globalCompositeOperation = "source-atop"; rect(c, -9, -28, 18, 28, "#ffffff66"); }
  c.restore();
  const bar = e.boss ? 48 : 22, top = y - 32 * scale;
  rect(c, x - bar / 2 - 1, top - 2, bar + 2, 5, "#11101c"); rect(c, x - bar / 2, top - 1, bar * e.hp / e.maxHp, 3, e.boss ? "#db6974" : "#c58b72");
  if (e.boss) label(c, x, top - 5, r.boss, "#edc17e");
}
function player(c: Ctx, o: Origin, p: Member, t: number, me: boolean) {
  const [x, y] = at(o, p.i, p.j);
  if (p.hp <= 0) { disc(c, x, y - 2, 5, "#b56b7a"); line(c, [x - 6, y - 2], [x + 6, y - 2], 2, "#e4c7ac"); label(c, x, y - 15, `${p.name} · yardım bekliyor`, "#f5b6b9", 6); if (p.revive) rect(c, x - 10, y - 10, p.revive / 3 * 20, 2, "#a1deb5"); return; }
  const a = p.equipment.armor ? armorStats(p.equipment.armor) : null, tier = TIERS[a?.tier ?? tierOf(p.level)];
  const w = p.equipment.weapon ? weaponStats(p.equipment.weapon) : null, since = t - p.comboAt;
  const swing = since >= 0 && since < (w?.cooldown ?? 0.4) ? since / (w?.cooldown ?? 0.4) : 0;
  c.save(); if (t < p.dodgeUntil) c.globalAlpha = 0.65;
  const anchor = drawCharacter(c, { who: /ay[sş]enur/i.test(p.name) ? "aysenur" : "cengiz", x, y, dir: p.dir, pose: p.moving ? WALK[Math.floor(t * 8) % WALK.length] : STAND, outfit: tier.outfit, tint: tier.tint, blink: (t + p.i) % 5 < 0.1 });
  drawHeld(c, p.equipment.weapon, anchor.hand, p.dir, swing);
  if (p.shield > 0) { c.strokeStyle = "#b3d0fa"; c.beginPath(); c.ellipse(x, y - 12, 10, 16, 0, 0, Math.PI * 2); c.stroke(); }
  c.restore();
  label(c, x, y - 39, `${p.name} · ${Math.ceil(p.hp)}`, me ? "#f4db9d" : "#bfdbef", 6);
}
export function drawExpedition(c: Ctx, r: Run, me: string, t: number, o: Origin) {
  const region = regionOf(r.region)!, w = c.canvas.width, h = c.canvas.height;
  lights.length = 0;
  rect(c, 0, 0, w, h, region.colors.sky);
  const cells = terrain(region), list: { depth: number; draw: () => void }[] = [];
  for (const cell of cells) {
    const { i, j, random, open, path } = cell, [x, y] = at(o, i, j);
    if (x < -50 || x > w + 50 || y < -20 || y > h + 85) continue;
    const water = region.biome === "swamp" && !open;
    tile(c, o, i, j, path ? region.colors.path : water ? (random > 0.5 ? "#233d4b" : "#1f3545") : random > 0.6 ? region.colors.ground : region.colors.edge);
    if (water) { if (random > 0.7) line(c, [x - 3, y + 3], [x + Math.sin(t + i) * 2 + 3, y + 3], 1, "#46616a"); }
    else if (random > 0.7) { px(c, x + 2, y + 3, path ? "#b29b6b55" : "#74906c55"); px(c, x - 3, y + 4, "#101e2633"); }
    if (!open && random > 0.67 && i % 2 === 0 && j % 2 === 0) list.push({ depth: i + j, draw: () => {
      const hero = r.players[me]; c.save();
      if (hero) { const [hx, hy] = at(o, hero.i, hero.j); if (Math.abs(hx - x) < 27 && hy > y - 85 && hy < y + 12) c.globalAlpha = 0.22; }
      if (region.biome === "castle" || region.biome === "pass" && random > 0.84) ruin(c, o, i, j, random, region, t); else tree(c, x, y, random, region, t);
      c.restore();
    } });
    if (open && !path && random > 0.87) { rect(c, x - 2, y + 1, 1, -3, "#8e986b"); px(c, x - 2, y - 3, region.biome === "swamp" ? "#9bddcd" : "#b4859e"); }
  }
  arena(c, o, region, t, r.enemies.find((e) => e.boss)!.awake);
  for (const l of region.objectives) list.push({ depth: l.i + l.j - 3.5, draw: () => campDetails(c, o, l, region, t) });
  for (const [index, l] of region.objectives.entries()) list.push({ depth: l.i + l.j, draw: () => landmark(c, o, l, region, t, r.objectives.includes(index)) });
  for (const l of region.landmarks) list.push({ depth: l.i + l.j, draw: () => landmark(c, o, l, region, t, l.kind === "camp" ? r.campUsed : r.secrets.includes(l.name)) });
  if (r.secrets.includes("beyaz-geyik")) {
    const camp = region.landmarks.find((l) => l.kind === "camp")!;
    list.push({ depth: camp.i + camp.j + 2, draw: () => {
      const [x, y] = at(o, camp.i + 2, camp.j);
      glow(c, x, y - 12, "#d4f1f122", 26);
      poly(c, [[x - 9, y - 7], [x - 8, y - 16], [x + 5, y - 16], [x + 9, y - 25], [x + 13, y - 23], [x + 10, y - 8]], "#dce9df", 1);
      for (const dx of [-7, -3, 5, 8]) line(c, [x + dx, y - 8], [x + dx - 1, y], 1, "#c6d9d1");
      line(c, [x + 9, y - 24], [x + 5, y - 34], 1, "#e8d9ae"); line(c, [x + 12, y - 24], [x + 15, y - 35], 1, "#e8d9ae");
      for (let k = 0; k < 3; k++) { line(c, [x + 6 - k, y - 28 - k * 2], [x + 2 - k, y - 30 - k * 2], 1, "#e8d9ae"); px(c, x + Math.sin(t + k) * 12, y - 20 - k * 6, "#f3dfaa"); }
      px(c, x + 12, y - 22, "#5c8087");
    } });
  }
  for (const e of r.enemies) {
    if (e.warning) {
      const [x, y] = at(o, e.warning.i, e.warning.j), radius = e.warning.radius;
      c.fillStyle = "#ef55552b"; c.strokeStyle = Math.floor(t * 8) % 2 ? "#ffbc75" : "#ee6c70"; c.lineWidth = 1;
      c.beginPath(); c.ellipse(x, y, radius * 11.3, radius * 5.65, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      if (e.warning.kind === "arrow") { const [fx, fy] = at(o, e.warning.from.i, e.warning.from.j); c.setLineDash([2, 3]); c.beginPath(); c.moveTo(fx, fy - 12); c.lineTo(x, y); c.stroke(); c.setLineDash([]); }
    }
    list.push({ depth: e.i + e.j, draw: () => { const [x, y] = at(o, e.i, e.j); if (x > -70 && x < w + 70 && y > -30 && y < h + 80) enemy(c, x, y, e, region, t); } });
  }
  for (const p of Object.values(r.players)) if (isPresent(p, r.time) || p.hp <= 0) list.push({ depth: p.i + p.j + 0.1, draw: () => player(c, o, p, t, p.id === me) });
  list.sort((a, b) => a.depth - b.depth);
  for (const item of list) item.draw();
  for (const e of r.effects) drawEffect(c, o, e, t);
  for (const e of r.effects) drawEffect(c, o, e, t, true);
  // Ateş böcekleri ve sis: savaş alanının okunaklılığı korunur.
  for (let k = 0; k < 22; k++) {
    const x = (rnd(k * 77) * w + Math.sin(t * 0.4 + k) * 12 + w) % w, y = (rnd(k * 39) * h - t * 2 % h + h) % h;
    px(c, x, y, region.biome === "castle" ? "#d58aa650" : "#addcc350");
  }
  for (let k = 0; k < 5; k++) {
    const x = ((t * 5 + k * 181) % (w + 200)) - 100, y = h * 0.3 + k * 37;
    const fog = c.createRadialGradient(x, y, 2, x, y, 90); fog.addColorStop(0, "#c2d0da07"); fog.addColorStop(1, "transparent"); c.fillStyle = fog; c.fillRect(x - 90, y - 90, 180, 180);
  }
  const shadeEdge = c.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.7); shadeEdge.addColorStop(0, "transparent"); shadeEdge.addColorStop(1, "#070c1666"); c.fillStyle = shadeEdge; c.fillRect(0, 0, w, h);
}
export function drawMinimap(c: Ctx, r: Run, me: string) {
  const region = regionOf(r.region)!; rect(c, 0, 0, c.canvas.width, c.canvas.height, "#10161f");
  const sx = c.canvas.width / MAP.w, sy = c.canvas.height / MAP.h;
  for (const cell of terrain(region)) if (cell.open) rect(c, cell.i * sx, cell.j * sy, sx, sy, cell.path ? "#796e57" : "#37463e");
  for (const [n, obj] of region.objectives.entries()) rect(c, obj.i * sx - 1, obj.j * sy - 1, 3, 3, r.objectives.includes(n) ? "#9cc6a2" : "#f1cb7f");
  const boss = r.enemies.find((e) => e.boss)!;
  rect(c, boss.i * sx - 1, boss.j * sy - 1, 3, 3, "#e7878c");
  for (const p of Object.values(r.players)) if (isPresent(p, r.time)) disc(c, p.i * sx, p.j * sy, 2, p.id === me ? "#fff5cb" : "#9ed2fa");
}
