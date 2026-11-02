// 5 · Banyo (akşam): diş fırçalama, çalkalama, yüz temizliği, serum, nemlendirici. Aynalar hareketi yansıtır.
// Fırçalama ve sürme salınımları da kaydırmaya bağlı: kaydırma durunca el de durur.
import { type Ctx, type Free, type Prop, P, drawCharacter, drawProp, rect } from "../pixel";
import { coolWall, floor, lights, px, sconce } from "../env";
import { STAND_F, blinkAt, ease, lerp, seg, walkTo } from "../anim";
import { lerpFree } from "../pixel";
import { type Actor, type Scene, follow, stage } from "./types";
import { type CatMode, cushion, perch, pets, petsInRoom } from "../companions";
import { adv, autoStart, since } from "../adventures";
import { comb, serumShelf, soapDish, towels, wallAge } from "../decor";

const W = 300, H = 220, FL = 180, TOP = 168;
const ST = [{ who: "cengiz" as const, x: 104, from: -10, seed: 3 }, { who: "aysenur" as const, x: 184, from: -30, seed: 1 }];

const f = (o: Partial<Free>): Free => ({ ...STAND_F, ...o });
const REACH = f({ eF: [5, -13], hF: [8, -12] });
const MOUTH = f({ eF: [4, -12], hF: [4, -19] });
const FACE = f({ eB: [3, -12], hB: [3, -20], eF: [4, -12], hF: [5, -19] });
const LEAN = f({ neck: [4, -14], eF: [6, -12], hF: [8, -12], eB: [5, -12], hB: [7, -12] });
const HOLD = f({ eF: [4, -12], hF: [6, -16], eB: [3, -12], hB: [6, -12] });

function station(c: Ctx, x: number, t: number, still: boolean) {
  const m0 = x + 12;
  // ayna
  rect(c, m0 - 2, 124, 22, 42, P.woodDk);
  rect(c, m0 - 1, 125, 20, 40, P.gold);
  rect(c, m0, 126, 18, 38, "#3a4a5e");
  // tezgah ve lavabo
  rect(c, x + 8, TOP, 32, 3, P.stoneLt);
  rect(c, x + 9, TOP + 3, 30, FL - TOP - 3, P.woodDk);
  rect(c, x + 12, TOP + 5, 10, 8, P.wood); rect(c, x + 26, TOP + 5, 10, 8, P.wood);
  rect(c, x + 16, TOP - 1, 14, 2, "#c8d8e0");
  rect(c, x + 22, TOP - 6, 2, 5, "#a8a8b0"); rect(c, x + 22, TOP - 6, 4, 1, "#a8a8b0");
  // havlu
  rect(c, x + 41, TOP - 14, 2, 2, P.woodDk); rect(c, x + 40, TOP - 12, 5, 12, P.cream); rect(c, x + 40, TOP - 6, 5, 1, P.rose);
  sconce(c, x + 4, 120, t + x, still);
}

// el ile tutulan eşya + aşamaya göre efekt
type Act = { pose: Free; prop?: Prop; propAt?: "hand" | "handB"; foam?: number; bubbles?: number; drops?: number; splash?: boolean };

function act(p: number): Act {
  const osc = Math.sin(p * 900); // kaydırmayla eşleşen salınım
  if (p < 0.14) return { pose: STAND_F };
  if (p < 0.2) { const k = seg(p, 0.14, 0.2); return { pose: lerpFree(REACH, MOUTH, ease(k)), prop: k > 0.3 ? "brush" : undefined }; }
  if (p < 0.4) { const k = seg(p, 0.2, 0.4); return { pose: { ...MOUTH, hF: [4 + Math.round(osc), -19] }, prop: k > 0.2 ? "brushFoam" : "brush", foam: Math.min(1, k * 3) }; }
  if (p < 0.43) return { pose: lerpFree(MOUTH, REACH, seg(p, 0.4, 0.43)) };
  if (p < 0.46) return { pose: MOUTH, prop: "glass" };
  if (p < 0.5) return { pose: lerpFree(LEAN, STAND_F, seg(p, 0.48, 0.5)), splash: p < 0.48 };
  if (p < 0.62) { const k = seg(p, 0.5, 0.62); return { pose: { ...FACE, hF: [5 + Math.round(osc), -19 + Math.round(Math.cos(p * 900))], hB: [3 - Math.round(osc), -20] }, bubbles: Math.min(1, k * 2) }; }
  if (p < 0.66) return { pose: LEAN, splash: true };
  if (p < 0.7) return { pose: lerpFree(REACH, HOLD, ease(seg(p, 0.66, 0.7))), prop: p > 0.675 ? "bottle" : undefined };
  if (p < 0.74) return { pose: HOLD, prop: "bottle", drops: seg(p, 0.7, 0.74) };
  if (p < 0.84) { const pat = (Math.sin(p * 500) + 1) / 2; return { pose: lerpFree(FACE, f({ ...FACE, hF: [6, -17], hB: [5, -18] }), pat) }; }
  if (p < 0.87) return { pose: lerpFree(REACH, HOLD, ease(seg(p, 0.84, 0.87))), prop: "jar", propAt: "hand" };
  if (p < 0.9) { const pat = (Math.sin(p * 500) + 1) / 2; return { pose: lerpFree(HOLD, f({ ...HOLD, hB: [4, -19], eB: [3, -12] }), pat), prop: "jar" }; }
  return { pose: STAND_F };
}

export const bath: Scene = {
  id: "banyo",
  vh: 820,
  render({ c, p, view, t, still }) {
    const tod = lerp(0.78, 0.83, p);
    const enter = seg(p, 0, 0.14), leave = seg(p, 0.9, 1);
    const a = act(p);
    const cam = follow(170, FL, view, W, H, 0.74, -140);
    const actors: Actor[] = [];
    stage(c, cam, view, () => {
      coolWall(c, -240, -140, W + 240, FL, 41);
      rect(c, -240, 108, W + 2 * 240, 3, P.stoneLt);
      // taş kemerler
      for (const x of [20, 260]) { c.fillStyle = P.stoneDeep; c.beginPath(); c.arc(x + 12, 90, 12, Math.PI, 0); c.rect(x, 90, 24, 90); c.fill(); }
      // kemer içinde iksir rafı
      rect(c, 24, 140, 16, 2, P.woodLt); px(c, 27, 136, "#7fd1b9"); rect(c, 26, 136, 3, 4, "#7fd1b9"); rect(c, 32, 135, 3, 5, "#e88aa8");
      floor(c, -240, W + 240, FL, H - FL, true);
      wallAge(c, -240, W + 240, -140, FL, 43);
      serumShelf(c, 146, 132);
      towels(c, 160, FL);
      for (const s of ST) station(c, s.x, t, still);
      // aynalarda hafif buğu, tezgahta sabunluk ve tarak
      for (const s of ST) { rect(c, s.x + 12, 126, 18, 8, "rgba(230,236,245,0.18)"); soapDish(c, s.x + 30, TOP); comb(c, s.x + 16, TOP); }
      // banyo girişinde beklerler
      cushion(c, 34, FL);
      const perchTop = perch(c, 54, FL, 18);
      const posX = (s: (typeof ST)[number]) => (leave > 0 ? lerp(s.x, W + 30, leave) : lerp(s.from, s.x, enter));
      // papağanla karşılaşma: Düldül alçak tüneğin önüne oturup başını eğer, papağan da eğer ve kanadını düzeltir,
      // Düldül şaşırıp bir adım geri çekilir ve yeniden oturur
      if (enter === 1 && leave === 0 && p > 0.16) autoStart("meet", t);
      const km = since("meet", t);
      if (km > 2 && pets.parrot < adv.meet + 2) pets.parrot = adv.meet + 2;
      let cat: { x: number; mode: CatMode; dir: 1 | -1; y?: number } | undefined;
      if (km >= 0 && km < 7) {
        if (km < 1) cat = { x: lerp(34, 46, km), mode: "walk", dir: 1 };
        else if (km < 2) cat = { x: 46 + (Math.floor(km * 3) % 2), mode: "sit", dir: 1, y: FL - (km > 1.4 ? 1 : 0) };
        else if (km < 3.2) cat = { x: 46, mode: "sit", dir: 1 };
        else if (km < 3.5) cat = { x: lerp(46, 41, (km - 3.2) / 0.3), mode: "walk", dir: 1 };
        else if (km < 6) cat = { x: 41, mode: "sit", dir: 1 };
        else cat = { x: lerp(41, 34, km - 6), mode: "walk", dir: -1 };
      }
      const pets2 = petsInRoom(c, { t, still, floor: FL, enter, leave, cengizX: posX(ST[0]), aysenurX: posX(ST[1]), cushionX: 34, perchAt: perchTop, exitX: W + 44, cat });

      for (const s of ST) {
        let anchors;
        if (enter < 1) {
          anchors = drawCharacter(c, { who: s.who, ...walkTo(enter, s.from, s.x), y: FL, outfit: "night", blink: !still && blinkAt(t, s.seed) });
        } else if (leave > 0) {
          anchors = drawCharacter(c, { who: s.who, ...walkTo(leave, s.x, W + 30 + (s.who === "cengiz" ? 20 : 0)), y: FL, outfit: "night", blink: !still && blinkAt(t, s.seed) });
        } else {
          // yansıma: aynanın içinde ters yöne bakan kopya
          const m0 = s.x + 12;
          c.save();
          c.beginPath(); c.rect(m0, 126, 18, 38); c.clip();
          const rx = m0 + (m0 - s.x) + 2;
          const r = drawCharacter(c, { who: s.who, x: rx, y: FL, dir: -1, pose: a.pose, outfit: "night", blink: false });
          if (a.prop) drawProp(c, a.prop, a.propAt === "handB" ? r.handB : r.hand, -1);
          c.fillStyle = "rgba(160,200,230,0.18)"; c.fillRect(m0, 126, 18, 38);
          for (let i = 0; i < 4; i++) px(c, m0 + 2 + i, 128 + i, "rgba(255,255,255,0.35)");
          c.restore();
          anchors = drawCharacter(c, { who: s.who, x: s.x, y: FL, dir: 1, pose: a.pose, outfit: "night", blink: !still && blinkAt(t, s.seed) });
          if (a.prop) drawProp(c, a.prop, a.propAt === "handB" ? anchors.handB : anchors.hand, 1);
          const m = anchors.mouth;
          if (a.foam) for (let i = 0; i < Math.round(a.foam * 4); i++) px(c, m[0] + (i % 2), m[1] + Math.floor(i / 2), "#ffffff");
          if (a.bubbles) for (let i = 0; i < 6; i++) {
            const bx = anchors.head[0] - 4 + ((i * 5 + Math.floor(p * 300)) % 11), by = anchors.head[1] + 4 + ((i * 3) % 7);
            if (i / 6 < a.bubbles) px(c, bx, by, "rgba(255,255,255,0.85)");
          }
          if (a.drops !== undefined) {
            const k = (a.drops * 3) % 1;
            const top = anchors.hand, bot = anchors.handB;
            px(c, top[0], Math.round(top[1] + 2 + (bot[1] - top[1] - 2) * k), "#e8a050");
            lights.push({ x: top[0], y: top[1], r: 4, color: "255,200,120" });
          }
          if (a.splash) for (let i = 0; i < 5; i++) px(c, s.x + 20 + (i * 3) % 8, TOP - 2 - ((i * 7 + Math.floor(p * 200)) % 5), "#9fd0e8");
        }
        actors.push({ who: s.who, anchors });
      }
      // tezgah üstü: fırça bardağı, şişe, kavanoz (elde değilken)
      for (const s of ST) {
        const busy = enter === 1 && leave === 0;
        drawProp(c, "cup", [s.x + 34, TOP], 1);
        if (!(busy && p > 0.14 && p < 0.43)) { rect(c, s.x + 34, TOP - 8, 1, 4, "#7fd1b9"); }
        if (!(busy && p > 0.675 && p < 0.84)) drawProp(c, "bottle", [s.x + 12, TOP], 1);
        if (!(busy && p > 0.84 && p < 0.9)) drawProp(c, "jar", [s.x + 38, TOP + 0], 1);
      }
      actors.push(...pets2);
    });
    return { cam, actors, tod };
  },
};
