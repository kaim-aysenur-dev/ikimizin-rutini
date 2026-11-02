// 7 · Şömine başında kahve ve 8 · final: battaniye, "I love you" ve sarı kedi (gece). İkisi aynı salonda geçer.
import { type Ctx, type Free, P, drawCat, drawCharacter, drawProp, lerpFree, rect, rnd } from "../pixel";
import { archWindow, books, candle, floor, heart, lights, px, rug, warmWall } from "../env";
import { STAND_F, blinkAt, ease, lerp, seg, walkTo } from "../anim";
import { type Actor, type Bubble, type Scene, follow, stage } from "./types";
import { armorRack, cushion, duldul, parrot, petsInRoom, weaponRack } from "../companions";
import { couchCushions, logBasket, poker, wallAge } from "../decor";

const W = 300, H = 220, FL = 180;
const FIRE = { x: 224, w: 34 };
const SEAT = { aysenur: 132, cengiz: 152 }; // kanepede birbirine dönük
const RUG = { aysenur: 194, cengiz: 205 };
const TABLE = 178;
const CUSHION = 104; // Düldül'ün minderi
const COUCH_BACK: [number, number] = [121, 150]; // papağanın konduğu koltuk sırtı

const f = (o: Partial<Free>): Free => ({ ...STAND_F, ...o });
const COUCH = f({ hip: [-1, -14], neck: [0, -21], eF: [3, -17], hF: [5, -18], eB: [2, -17], hB: [4, -17], kB: [4, -14], fB: [6, 0], kF: [5, -13], fF: [6, 0] });
const SIP = f({ ...COUCH, eF: [3, -18], hF: [4, -24] });
const PUT = f({ ...COUCH, neck: [3, -20], eF: [6, -16], hF: [10, -14] });
const FLOOR_SIT = f({ hip: [-2, -3], neck: [-1, -10], eF: [2, -7], hF: [5, -5], eB: [1, -7], hB: [4, -5], kB: [3, -7], fB: [7, 0], kF: [3, -7], fF: [7, 0] });
const LEAN = f({ ...FLOOR_SIT, neck: [1, -10] });
const HUG = f({ ...FLOOR_SIT, eB: [-4, -8], hB: [-10, -7] });

function fire(c: Ctx, t: number, still: boolean) {
  const { x, w } = FIRE;
  // taş ocak ve raf
  rect(c, x - 12, 120, w + 24, FL - 120, P.stone);
  for (let y = 120; y < FL; y += 7) rect(c, x - 12, y, w + 24, 1, P.stoneDk);
  rect(c, x - 16, 116, w + 32, 5, P.woodLt);
  rect(c, x - 16, 121, w + 32, 1, P.woodDk);
  c.fillStyle = "#120c10";
  c.beginPath(); c.arc(x + w / 2, 146, w / 2, Math.PI, 0); c.rect(x, 146, w, FL - 146); c.fill();
  // odunlar
  // odunlar ara sıra hafifçe çöker, birkaç kıvılcım yükselir
  const cyc = still ? 5 : t % 9;
  const sag = cyc < 0.4 ? 0 : 1;
  rect(c, x + 6, FL - 4, 22, 3, P.woodDk); rect(c, x + 9, FL - 7 + sag, 16, 2, P.wood); px(c, x + 12, FL - 6 + sag, "#c8463a");
  if (cyc < 1.2) for (let i = 0; i < 6; i++) { const k = cyc / 1.2; px(c, x + 10 + i * 3 + Math.round(Math.sin(i + k * 6) * 2), FL - 10 - Math.round(k * (18 + i * 4)), `rgba(255,${180 + i * 10},100,${(1 - k).toFixed(2)})`); }
  // alevler
  for (let i = 0; i < w - 6; i++) {
    const n = still ? 0.5 : (Math.sin(t * 7 + i * 0.9) + Math.sin(t * 11 + i * 1.7) + 2) / 4;
    const h = Math.round(6 + n * 14 - Math.abs(i - (w - 6) / 2) * 0.5);
    for (let k = 0; k < h; k++) {
      const col = k < h * 0.35 ? "#ffe08a" : k < h * 0.7 ? "#f0a24a" : "#c8463a";
      px(c, x + 3 + i, FL - 6 - k, k > h - 2 && (i + Math.floor(t * 10)) % 3 === 0 ? "#7a2a2a" : col);
    }
  }
  const fl = still ? 0 : Math.sin(t * 9) * 3 + Math.sin(t * 5.3) * 2;
  lights.push({ x: x + w / 2, y: FL - 14, r: 70 + fl, color: "255,150,70" });
  lights.push({ x: x + w / 2, y: FL - 10, r: 26 + fl, color: "255,210,120" });
  // kıvılcımlar
  if (!still) for (let i = 0; i < 4; i++) { const k = (t * 0.7 + i * 0.25) % 1; px(c, x + 8 + Math.round(rnd(i + Math.floor(t)) * 18), FL - 20 - Math.round(k * 22), `rgba(255,200,120,${(1 - k).toFixed(2)})`); }
}

function room(c: Ctx, tod: number, t: number, still: boolean, cupsOnTable: boolean, fog = 0) {
  warmWall(c, -240, -140, W + 240, FL, 61);
  archWindow(c, 24, 58, 36, 66, tod, t, { kind: "nightRain", horizon: 100, sunX: 44 });
  // camda şöminenin sıcak yansıması
  rect(c, 26, 104, 32, 18, "rgba(255,150,70,0.09)");
  rect(c, 50, 96, 6, 26, "rgba(255,190,110,0.07)");
  // buğulu köşe: parmakla çizilmiş küçük kalp ve "C + A"
  if (fog > 0) {
    rect(c, 26, 106, 24, 16, `rgba(225,230,240,${(0.28 * fog).toFixed(2)})`);
    const ink = `rgba(14,18,40,${(0.75 * fog).toFixed(2)})`;
    const glyphs: Record<string, string[]> = { C: ["ooo", "o..", "o..", "o..", "ooo"], "+": ["...", ".o.", "ooo", ".o.", "..."], A: [".o.", "o.o", "ooo", "o.o", "o.o"], H: [".o.o.", "ooooo", "ooooo", ".ooo.", "..o.."] };
    const draw = (g: string[], gx: number, gy: number) => g.forEach((row, r) => [...row].forEach((ch, i) => { if (ch === "o") px(c, gx + i, gy + r, ink); }));
    draw(glyphs.H, 35, 108);
    draw(glyphs.C, 28, 115); draw(glyphs["+"], 33, 115); draw(glyphs.A, 38, 115);
  }
  rect(c, 70, 80, 46, 100, P.woodDk);
  for (let s = 0; s < 4; s++) { rect(c, 72, 102 + s * 20, 42, 2, P.woodLt); books(c, 74, 102 + s * 20, 7, s * 3 + 11); }
  fire(c, t, still);
  candle(c, FIRE.x - 10, 111, t, still);
  candle(c, FIRE.x + FIRE.w + 8, 111, t + 1, still);
  floor(c, -240, W + 240, FL, H - FL);
  rug(c, 150, FL, 80, "#7a3b4a", P.goldLt);
  // koltuk
  rect(c, 118, 150, 6, 30, "#5a2f4a"); rect(c, 118, 150, 6, 2, "#7a4a63");
  rect(c, 118, 164, 48, 8, "#6b3f63"); rect(c, 118, 164, 48, 2, "#8a5a80");
  rect(c, 162, 158, 6, 14, "#5a2f4a");
  rect(c, 120, 172, 3, 8, P.woodDk); rect(c, 160, 172, 3, 8, P.woodDk);
  // sehpa
  rect(c, TABLE - 7, 166, 16, 3, P.woodLt); rect(c, TABLE - 5, 169, 2, 11, P.woodDk); rect(c, TABLE + 5, 169, 2, 11, P.woodDk);
  wallAge(c, -240, W + 240, -140, FL, 63);
  logBasket(c, 278, FL); poker(c, 270, FL);
  armorRack(c, 294, FL); weaponRack(c, 312, FL);
  couchCushions(c, 120, 164);
  cushion(c, CUSHION, FL);
  // koltukta bırakılmış kitap
  rect(c, 126, 161, 7, 3, P.ink); rect(c, 127, 161, 5, 2, "#5b4a7a"); px(c, 129, 161, P.gold);
  if (cupsOnTable) { drawProp(c, "cup", [TABLE - 3, 166], 1); drawProp(c, "cup", [TABLE + 4, 166], -1); }
}

function blanket(c: Ctx, x0: number, x1: number, k: number) {
  if (k <= 0) return;
  const top = Math.round(lerp(FL - 40, FL - 9, ease(k)));
  rect(c, x0 - 1, top - 1, x1 - x0 + 2, FL - top + 1, P.ink);
  rect(c, x0, top, x1 - x0, FL - top, "#9a5a6a");
  for (let y = top + 2; y < FL; y += 4) rect(c, x0, y, x1 - x0, 1, "#b87a88");
  for (let x = x0 + 3; x < x1; x += 6) rect(c, x, top, 1, FL - top, "#7a4050");
  rect(c, x0, top, x1 - x0, 1, "#c99aa6");
}

export const coffee: Scene = {
  id: "somine",
  vh: 520,
  render({ c, p, view, t, still }) {
    const tod = lerp(0.9, 0.93, p);
    const enter = seg(p, 0, 0.22), sit = ease(seg(p, 0.22, 0.3));
    const cam = follow(170, FL, view, W, H, 0.74, -140);
    const actors: Actor[] = [];
    stage(c, cam, view, () => {
      room(c, tod, t, still, false, seg(p, 0.5, 1) * 0.5);
      const ex = (who: "cengiz" | "aysenur", from: number) => lerp(from, SEAT[who], enter);
      const pets = petsInRoom(c, { t, still, floor: FL, enter, leave: 0, cengizX: ex("cengiz", -26), aysenurX: ex("aysenur", -10), cushionX: CUSHION, perchAt: COUCH_BACK, exitX: 0 });
      for (const q of [{ who: "aysenur" as const, from: -10, seed: 1, off: 0.5 }, { who: "cengiz" as const, from: -26, seed: 3, off: 0 }]) {
        let anchors;
        if (enter < 1) {
          anchors = drawCharacter(c, { who: q.who, ...walkTo(enter, q.from, SEAT[q.who]), y: FL, outfit: "night", blink: !still && blinkAt(t, q.seed) });
        } else {
          // yudum: kaydırdıkça fincan ağıza gider; arada birbirlerine bakarlar
          const cyc = (seg(p, 0.32, 1) * 6 + q.off) % 1;
          const sip = p > 0.32 ? Math.max(0, Math.sin(cyc * Math.PI * 2)) : 0;
          const pose = lerpFree(STAND_F, lerpFree(COUCH, SIP, sip), sit);
          // karşılıklı otururlar; arada Cengiz ateşe, Ayşenur pencereye bakar
          const look = (p * 7 + q.off) % 1;
          const dir = q.who === "cengiz" ? -1 : 1;
          const headDir = look > 0.6 && look < 0.75 ? (dir === 1 ? -1 : 1) : undefined;
          anchors = drawCharacter(c, { who: q.who, x: SEAT[q.who], y: FL, dir, pose, outfit: "night", headDir, blink: !still && blinkAt(t, q.seed) });
        }
        drawProp(c, "cup", anchors.hand, enter < 1 || q.who === "aysenur" ? 1 : -1, still ? 0 : t);
        actors.push({ who: q.who, anchors });
      }
      actors.push(...pets);
    });
    return { cam, actors, tod };
  },
};

export const finale: Scene = {
  id: "final",
  vh: 760,
  render({ c, p, view, t, still }) {
    const tod = 0.95;
    const put = seg(p, 0, 0.1), up = ease(seg(p, 0.1, 0.16)), walk = seg(p, 0.16, 0.3), down = ease(seg(p, 0.3, 0.38));
    const lean = ease(seg(p, 0.38, 0.44)), cover = seg(p, 0.42, 0.52), hug = ease(seg(p, 0.52, 0.58));
    const cam = follow(196, FL, view, W, H, 0.74, -140);
    const actors: Actor[] = [];
    const bubbles: Bubble[] = [];
    stage(c, cam, view, () => {
      room(c, tod, t, still, put >= 0.8, 0.5 + seg(p, 0.3, 0.8) * 0.5);
      for (const q of [{ who: "aysenur" as const, seed: 1 }, { who: "cengiz" as const, seed: 3 }]) {
        let pose: Free | ReturnType<typeof walkTo>["pose"];
        // fincanı sehpaya bırakırken Cengiz de sehpaya döner
        let x: number = SEAT[q.who], dir: 1 | -1 = q.who === "cengiz" && put === 0 ? -1 : 1;
        if (walk === 0) {
          pose = put < 1 ? lerpFree(COUCH, PUT, Math.sin(put * Math.PI)) : lerpFree(COUCH, STAND_F, up);
        } else if (walk < 1) {
          const w = walkTo(walk, SEAT[q.who], RUG[q.who]);
          x = w.x; pose = w.pose; dir = w.dir;
        } else {
          x = RUG[q.who];
          let s = lerpFree(STAND_F, FLOOR_SIT, down);
          if (q.who === "aysenur") s = lerpFree(s, LEAN, lean);
          else { x -= Math.round(2 * lean); s = lerpFree(s, HUG, hug); }
          pose = s;
        }
        const anchors = drawCharacter(c, { who: q.who, x, y: FL, dir, pose, outfit: "night", blink: !still && blinkAt(t, q.seed), hideBody: cover >= 1 });
        if (put < 0.8 && walk === 0 && up === 0) drawProp(c, "cup", anchors.hand, dir, still ? 0 : t);
        actors.push({ who: q.who, anchors });
      }
      blanket(c, RUG.aysenur - 7, RUG.cengiz + 10, cover);

      // konuşma balonları yazılarak açılır
      const typed = (s: string, k: number) => s.slice(0, Math.ceil(s.length * Math.max(0, Math.min(1, k))));
      // balonlar sırayla yazılır, sonra çekilir; ardından kalp yazıların altında kalmadan parlar
      const k1 = seg(p, 0.56, 0.63), k2 = seg(p, 0.65, 0.72);
      if (k1 > 0 && p < 0.8) bubbles.push({ who: "cengiz", text: typed("Seni seviyorum.", k1) });
      if (k2 > 0 && p < 0.8) bubbles.push({ who: "aysenur", text: typed("Ben de seni seviyorum.", k2) });
      if (p > 0.8) heart(c, RUG.aysenur + 1, FL - 44 - Math.round(Math.sin(t * 3) * (still ? 0 : 1.5)), 1);

      // Düldül minderinden kalkar, dizlerinin dibine gelir, döner, kıvrılır ve gözlerini yavaşça kapar
      const catWalk = seg(p, 0.6, 0.84);
      const knees = RUG.cengiz + 18;
      const kx = lerp(CUSHION, knees, catWalk);
      if (p < 0.6) actors.push({ who: "duldul", anchors: duldul(c, CUSHION, FL, -1, "rest", 0, t, still) });
      else if (p < 0.88) actors.push({ who: "duldul", anchors: duldul(c, kx, FL, p < 0.84 || seg(p, 0.84, 0.88) < 0.5 ? 1 : -1, "walk", kx, t, still) });
      else {
        drawCat(c, knees, FL, -1, "curl", still ? 0 : t, 0, 1 - seg(p, 0.92, 1));
        actors.push({ who: "duldul", anchors: { head: [knees, FL - 9], hand: [knees, FL], handB: [knees, FL], hip: [knees, FL], mouth: [knees, FL], shoulder: [knees, FL] } });
      }
      actors.push({ who: "parrot", anchors: parrot(c, COUCH_BACK, 1, p > 0.6 ? "sleep" : "perch", t, still) });
    });
    // finalde küçük kapanış cümlesi
    const caption = p > 0.84 ? "Bugün de birlikteydik.".slice(0, Math.ceil(22 * seg(p, 0.84, 0.92))) : undefined;
    return { cam, actors, tod, bubbles, caption };
  },
};
