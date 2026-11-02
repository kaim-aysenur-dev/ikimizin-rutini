// 3 · Şatoya yolculuk (öğleden akşama): bahçe yolu, taş köprü, büyüyen şato, açılan kapı.
// Katmanlar farklı hızda kayar: gökyüzü sabit, dağlar yavaş, orman orta, ön plan bitkileri hızlı.
import { type Ctx, P, drawCharacter, line, rect, rnd } from "../pixel";
import { door, lights, px, sky, sunMoon } from "../env";
import { blinkAt, lerp, seg, walkFrame } from "../anim";
import { STAND } from "../pixel";
import { type Actor, type Scene, follow, stage } from "./types";
import { duldul, parrot, pt } from "../companions";
import { puddle, rain, splashes, stormLevel } from "../weather";
import { archer, dragon, forge, guard } from "../guests";

const W = 760, H = 240, G = 190;
const B0 = 330, B1 = 430; // köprü
const GATE = 668;
const ground = (x: number) => (x > B0 && x < B1 ? G - Math.round(Math.sin((Math.PI * (x - B0)) / (B1 - B0)) * 10) : G);

function layer(c: Ctx, camX: number, f: number, draw: () => void) {
  c.save();
  c.translate(camX * (1 - f), 0);
  draw();
  c.restore();
}

// Katmanlı şato: farklı yükseklikte kuleler, sivri çatılar, taş sıraları, burç dişleri, kemerli ve ışıklı pencereler,
// bayraklar, sarmaşıklar ve kulelerin sura düşen gölgeleri. s büyüklük (yaklaştıkça artar).
function castle(c: Ctx, x: number, base: number, s: number, tod: number, t: number) {
  const dusk = tod > 0.7;
  const wall = dusk ? "#55506a" : "#7a7488", dark = dusk ? "#3c3850" : "#5a5468", light = dusk ? "#6a6480" : "#958fa3";
  const roof = dusk ? "#2e2846" : "#4a3f66", lit = "#ffd27a";
  const R = (v: number) => Math.round(v * s);
  const detail = s > 1.1;
  // sur
  rect(c, x - R(34), base - R(24), R(68), R(24), wall);
  for (let k = 0; k < 68; k += 6) rect(c, x - R(34) + R(k), base - R(28), Math.max(1, R(3)), R(4), wall);
  if (detail) for (let y = R(5); y < R(24); y += R(5)) rect(c, x - R(34), base - y, R(68), 1, dark);
  const towers: [number, number, number][] = [[-38, 50, 10], [-16, 70, 14], [6, 60, 11], [26, 44, 10]];
  for (const [dx, h, w] of towers) {
    const tx = x + R(dx), top = base - R(h);
    rect(c, tx, top, R(w), R(h), wall);
    rect(c, tx + R(w) - Math.max(1, R(3)), top, Math.max(1, R(3)), R(h), dark); // gölge yüzü
    rect(c, tx, top, Math.max(1, R(1)), R(h), light);
    if (detail) for (let y = R(6); y < R(h); y += R(6)) rect(c, tx, top + y, R(w), 1, dark);
    // sivri çatı (satır satır, yumuşatmasız)
    const peak = top - R(16);
    for (let y = peak; y < top; y++) {
      const k = (y - peak) / Math.max(1, top - peak);
      const half = (R(w) / 2 + R(2)) * k;
      rect(c, Math.round(tx + R(w) / 2 - half), y, Math.max(1, Math.round(half * 2)), 1, roof);
    }
    // bayrak: rüzgârda dalgalanır
    rect(c, Math.round(tx + R(w) / 2), peak - R(6), 1, R(6), P.ink);
    const wave = Math.round(Math.sin(t * 4 + dx) * Math.max(1, R(1)));
    rect(c, Math.round(tx + R(w) / 2) + 1, peak - R(6) + wave, Math.max(2, R(4)), Math.max(1, R(2)), P.rose);
    // kemerli pencereler
    for (let wy = R(14); wy < R(h) - R(8); wy += R(14)) {
      const ww = Math.max(1, R(2)), wh = Math.max(2, R(4));
      const wx = Math.round(tx + R(w) / 2 - ww / 2);
      rect(c, wx, top + wy, ww, wh, tod > 0.62 ? lit : "#2b2833");
      if (detail) px(c, wx, top + wy - 1, dark);
    }
  }
  // sarmaşık ve dip bitkileri
  if (detail) for (let k = 0; k < 4; k++) {
    const vx = x - R(30) + R(k * 18);
    for (let y = 0; y < R(16); y++) px(c, vx + Math.round(Math.sin(y * 0.6 + k) * 1), base - R(22) + y, P.forest2);
  }
  rect(c, x - R(6), base - R(12), R(12), R(12), dark);
}

function pine(c: Ctx, x: number, base: number, h: number, a: string, b: string) {
  for (let k = 0; k < h; k++) {
    const w = Math.max(1, Math.round(((h - k) / h) * h * 0.45 + (k % 5 === 0 ? 1 : 0)));
    rect(c, x - Math.floor(w / 2), base - k, w, 1, k % 5 === 0 ? b : a);
  }
  rect(c, x - 1, base, 2, 3, P.woodDk);
}

// demir direkte alevli fener: kafesin içinde titreyen ateş, üstte başlık
function lantern(c: Ctx, x: number, tod: number, t: number, still: boolean) {
  rect(c, x, G - 30, 2, 30, P.ink);
  rect(c, x - 2, G - 2, 6, 2, P.ink);
  rect(c, x - 3, G - 38, 8, 9, P.ink);
  rect(c, x - 2, G - 37, 6, 7, "#2a1c16");
  const f = still ? 0 : Math.sin(t * 12 + x) + Math.sin(t * 7.3 + x * 2);
  const h = 4 + Math.round(f);
  rect(c, x - 1, G - 31 - h, 4, h, "#f0a24a");
  rect(c, x, G - 31 - h + 1, 2, Math.max(1, h - 2), "#ffe08a");
  px(c, x + (f > 0 ? 1 : 0), G - 32 - h, "#c8463a");
  rect(c, x - 4, G - 40, 10, 2, P.ink); px(c, x + 1, G - 42, P.ink);
  lights.push({ x: x + 1, y: G - 33, r: 18 + Math.round(f * 1.5), color: "255,170,80" });
}

export const journey: Scene = {
  id: "yolculuk",
  vh: 860,
  render({ c, p, view, t, still }) {
    const tod = lerp(0.55, 0.72, p);
    // bahçenin ortasında ejderha geçerken kısa süre durup gökyüzüne bakarlar
    const PAUSE: [number, number] = [0.42, 0.53];
    const walk = p < PAUSE[0] ? seg(p, 0.03, PAUSE[0]) * 0.42 : p < PAUSE[1] ? 0.42 : 0.42 + seg(p, PAUSE[1], 0.84) * 0.58;
    const watching = p >= PAUSE[0] && p < PAUSE[1];
    const fly = seg(p, 0.38, 0.58);
    const open = seg(p, 0.84, 0.93);
    const inside = seg(p, 0.93, 1);
    const ax = walk < 1 ? lerp(30, GATE - 4, walk) : lerp(GATE - 4, GATE + 14, inside);
    const cx = ax - 16;
    const moving = ((walk > 0 && walk < 1) && !watching) || (inside > 0 && inside < 1);

    const cam = follow((ax + cx) / 2 + 30, G, view, W, H, 0.72, -80);
    const actors: Actor[] = [];
    stage(c, cam, view, () => {
      // gökyüzü sabit
      layer(c, cam[0], 0, () => {
        sky(c, 0, -80, view[0], H + 80, tod, t); sunMoon(c, 0, -40, view[0], 190, tod);
        // akşam ilerledikçe koyu bulutlar toplanır
        // bahçe yolunun ortasından itibaren bulutlar toplanır, gökyüzü griye döner
        const gather = Math.max(Math.min(1, Math.max(0, (tod - 0.62) / 0.1)), seg(p, 0.15, 0.45));
        if (gather > 0) rect(c, 0, -80, view[0], H + 80, `rgba(70,72,92,${(gather * 0.35).toFixed(2)})`);
        if (gather > 0) for (let x = 0; x < view[0]; x++) {
          const n = Math.sin(x * 0.04 + t * 0.06) + Math.sin(x * 0.11 + 2) * 0.5;
          if (n > 1.3 - gather * 1.4) rect(c, x, -60 + Math.round(Math.sin(x * 0.07) * 4), 1, Math.round(14 + n * 10), `rgba(58,48,78,${(0.5 + gather * 0.35).toFixed(2)})`);
        }
      });
      // uzak dağlar
      layer(c, cam[0], 0.15, () => {
        for (let i = 0; i < W; i++) {
          const m = Math.round(110 + Math.sin(i * 0.031) * 12 + Math.sin(i * 0.087) * 5);
          rect(c, i, m, 1, H - m, tod > 0.68 ? "#5b4a7a" : "#8c7aa8");
        }
        // uzaktaki şato: yaklaştıkça büyür
        // uzaktaki şato yaklaştıkça büyür; kapıya varınca yakın sur ön plana geçer
        c.globalAlpha = 1 - seg(walk, 0.72, 0.9);
        castle(c, 330 + walk * 60, 116, 0.8 + walk * 1.3, tod, t);
        c.globalAlpha = 1;
        // sis
        for (let i = 0; i < W; i++) rect(c, i, 128 + Math.round(Math.sin(i * 0.05) * 2), 1, 3, `rgba(239,227,200,${(0.16 + 0.1 * Math.sin(i * 0.07 + t * 0.3)).toFixed(2)})`);
      });
      // orman
      layer(c, cam[0], 0.55, () => {
        for (let i = 0; i < W; i += 11) pine(c, i + Math.round(rnd(i) * 6), 168, 22 + Math.round(rnd(i * 2) * 14), tod > 0.68 ? "#1f3b2d" : P.forest2, P.forest);
        rect(c, 0, 168, W, H, P.forest);
      });
      // yolun gerisindeki çimen set: okçuluk avlusu ve demirhane, yürüyüş güzergâhından ayrı
      for (const [x0, x1] of [[140, 280], [500, 600]]) {
        rect(c, x0, G - 8, x1 - x0, 8, "#4a7a4f"); rect(c, x0, G - 8, x1 - x0, 1, "#6a9a5f");
        rect(c, x0, G - 1, x1 - x0, 1, "#2e5240");
      }
      actors.push({ who: "legolas", anchors: pt(archer(c, 168, G - 8, 256, t, still)) });
      actors.push({ who: "gimli", anchors: pt(forge(c, 556, G - 8, t, still)) });
      // yol, nehir, köprü
      rect(c, 0, G, W, H - G, "#3f6a44");
      for (let x = 0; x < W; x += 3) if (rnd(x) > 0.6) px(c, x, G + 1 + Math.floor(rnd(x * 3) * 3), P.moss);
      rect(c, B0 - 6, G + 2, B1 - B0 + 12, 16, "#2f5a78");
      for (let x = B0; x < B1; x += 4) px(c, x + (Math.floor(t * 4) % 4), G + 6 + (x % 3) * 3, "#9fd0e8");
      for (let x = 0; x < W; x++) {
        if (x > B0 - 6 && x < B1 + 6) continue;
        rect(c, x, G, 1, 3, "#a08a6a");
        if (rnd(x * 7) > 0.85) px(c, x, G + 1, "#c8b088");
      }
      for (let x = B0; x < B1; x++) {
        const y = ground(x);
        rect(c, x, y, 1, 3, P.stoneLt);
        rect(c, x, y + 3, 1, G + 6 - y, P.stone);
      }
      c.fillStyle = "#2f5a78";
      c.beginPath(); c.arc((B0 + B1) / 2, G + 14, 24, Math.PI, 0); c.fill();
      for (let x = B0; x < B1; x += 8) rect(c, x, ground(x) - 6, 2, 6, P.stoneDk);
      line(c, [B0, G - 6], [B1, G - 6], 1, P.stoneDk);
      for (const lx of [130, 270, 480, 600]) lantern(c, lx, tod, t, still);
      // yakın sur ve kapı kuleleri: taş dokusu, burç dişleri, mazgallar, meşaleler, sarmaşık, bayrak
      const wallC = tod > 0.7 ? "#56516a" : "#6e687c", wallD = tod > 0.7 ? "#3c3850" : "#4e4960";
      rect(c, 606, 52, W - 606, G - 52, wallC);
      for (let y = 52, r = 0; y < G; y += 6, r++) {
        rect(c, 606, y, W - 606, 1, wallD);
        for (let x = 606 + (r % 2) * 6; x < W; x += 12) rect(c, x, y, 1, 6, wallD);
      }
      for (let x = 606; x < W; x += 10) rect(c, x, 44, 6, 8, wallC);
      for (const tx of [628, 692]) {
        rect(c, tx, 14, 24, G - 14, wallC);
        rect(c, tx + 19, 14, 5, G - 14, wallD); // kuleden sura düşen gölge
        rect(c, tx + 24, 52, 6, G - 52, "rgba(20,18,32,0.25)");
        for (let x = tx; x < tx + 24; x += 6) rect(c, x, 8, 4, 6, wallC);
        for (let y = 0; y < 18; y++) { const half = Math.round((y / 18) * 15); rect(c, tx + 12 - half, -10 + y, half * 2, 1, tod > 0.7 ? "#2e2846" : "#4a3f66"); }
        rect(c, tx + 10, 40, 4, 8, "#2b2833"); px(c, tx + 11, 39, wallD); px(c, tx + 12, 39, wallD); // mazgal
        rect(c, tx + 10, 84, 4, 7, tod > 0.62 ? "#ffd27a" : "#2b2833");
        if (tod > 0.62) lights.push({ x: tx + 12, y: 88, r: 10, color: "255,200,110" });
        rect(c, tx + 12, -22, 1, 12, P.ink);
        const wave = Math.round(Math.sin(t * 4 + tx) * 1.2);
        rect(c, tx + 13, -22 + wave, 6, 3, P.rose); px(c, tx + 18, -21 + wave, P.gold);
      }
      // sarmaşık ve dip bitkileri
      for (const vx of [612, 618, 724, 744]) for (let y = 0; y < 50; y++) px(c, vx + Math.round(Math.sin(y * 0.5 + vx) * 1.5), 60 + y, y % 5 === 0 ? P.moss : P.forest2);
      for (let x = 606; x < W; x += 9) { rect(c, x, G - 4, 6, 4, "#2e5240"); px(c, x + 2, G - 5, P.moss); }
      // giriş meşaleleri
      for (const mx of [646, 688]) {
        rect(c, mx, G - 42, 2, 8, P.woodDk);
        const fl = still ? 0 : Math.round(Math.sin(t * 11 + mx) * 1);
        rect(c, mx - 1, G - 46 - fl, 4, 4, "#f0a24a"); px(c, mx, G - 48 - fl, "#ffe08a");
        lights.push({ x: mx + 1, y: G - 46, r: 20 + fl * 2, color: "255,170,80" });
      }
      // kapıya uzanan taş yol
      for (let x = 600; x < GATE + 20; x += 5) rect(c, x, G, 4, 2, x % 10 ? "#b8aa90" : "#9a8e7a");
      door(c, GATE - 16, G - 54, 32, 54, open);
      if (open > 0) lights.push({ x: GATE, y: G - 24, r: 30 * open, color: "255,190,110" });

      // kapının yanında nöbetçi; yanından geçerken başıyla selam verir
      actors.push({ who: "jon", anchors: pt(guard(c, GATE + 34, G, ax, t, still)) });

      // karakterler (Cengiz arkada)
      for (const q of [{ who: "cengiz" as const, x: cx, s: 3 }, { who: "aysenur" as const, x: ax, s: 1 }]) {
        // izlerken Ayşenur eliyle ejderhayı gösterir
        const pose = moving ? walkFrame(q.x) : watching && q.who === "aysenur" ? { ...STAND, eF: [2, -3] as [number, number], hF: [4, -8] as [number, number] } : STAND;
        const a = drawCharacter(c, { who: q.who, x: q.x, dir: 1, pose, surface: ground, outfit: "armor", blink: !still && blinkAt(t, q.s) });
        actors.push({ who: q.who, anchors: a });
        if (q.who === "cengiz") { const kx = q.x - 12; actors.push({ who: "duldul", anchors: duldul(c, kx, ground(kx), 1, "walk", kx, t, still) }); }
        else actors.push({ who: "parrot", anchors: inside > 0 ? parrot(c, [q.x - 6, ground(q.x) - 36], 1, "fly", t, still) : parrot(c, a.shoulder, 1, "perch", t, still) });
      }
      // ıslanan yol: fener ışığını yansıtan birikintiler ve ilk damlalar
      // bahçede yağmur: yolun ortasında başlar, şatoya varırken sürer
      const storm = Math.max(stormLevel(tod), seg(p, 0.25, 0.5) * 0.75);
      if (storm > 0.15) for (const lx of [130, 270, 480, 600]) puddle(c, lx - 7, G + 1, 14, t, tod > 0.64 ? "rgba(255,200,110,0.45)" : undefined);
      splashes(c, cam[0], cam[0] + view[0], G, t, storm);
      // ateş böcekleri
      if (tod > 0.64 && !still) for (let i = 0; i < 14; i++) {
        const fx = (i * 57 + t * 6 * (i % 3 + 1)) % W, fy = 150 + Math.sin(t + i) * 14 + (i % 4) * 6;
        px(c, fx, fy, "rgba(240,255,150,0.9)");
        lights.push({ x: fx, y: fy, r: 4, color: "220,255,140" });
      }
      rain(c, cam[0] - 10, cam[0] + view[0] + 10, cam[1], G + 30, t, storm);
      // Daenerys ejderhasıyla bulutların arasından çıkar, bahçenin üstünde geniş bir yay çizer, kulelere doğru uzaklaşır
      if (fly > 0 && fly < 1) {
        const dx = cam[0] + lerp(-50, view[0] + 60, fly);
        const dy = cam[1] + lerp(30, 14, fly) + Math.sin(fly * Math.PI) * (G - cam[1] - 110);
        const ds = fly < 0.5 ? lerp(0.7, 1.8, fly * 2) : lerp(1.8, 0.55, (fly - 0.5) * 2);
        // yere düşen yumuşak gölge
        const sh = Math.sin(fly * Math.PI);
        c.fillStyle = `rgba(10,8,20,${(0.22 * sh).toFixed(2)})`;
        c.fillRect(Math.round(dx - 18 * ds), G + 2, Math.round(36 * ds), 2);
        actors.push({ who: "daenerys", anchors: pt(dragon(c, dx, dy, ds, t, still)) });
      }
      // ön plan bitkileri: daha hızlı kayar
      layer(c, cam[0], 1.35, () => {
        for (let i = -40; i < W * 1.4; i += 37) {
          const bx = i + Math.round(rnd(i) * 10);
          for (let k = 0; k < 6; k++) line(c, [bx, H], [bx - 6 + k * 2 + Math.round(Math.sin(t + k) * 0.5), H - 14 - (k % 3) * 4], 1, k % 2 ? "#1f3b2d" : "#2e5240");
        }
      });
    });
    return { cam, actors, tod };
  },
};
