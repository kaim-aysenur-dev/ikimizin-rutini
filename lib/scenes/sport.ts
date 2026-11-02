// 2 · Antrenman salonu (gündüz): Cengiz kum torbasında kickboks, Ayşenur matta pilates.
// Hareketler kaydırmayla değişir; vuruş efektleri temas karesine bağlıdır.
import { type Ctx, type Free, type V, P, drawCharacter, limb, line, rect, lerpFree } from "../pixel";
import { archWindow, coolWall, floor, lightBeam, plant, px, sarmasik, sparkle } from "../env";
import { STAND_F, blinkAt, ease, lerp, seg, sequence, walkTo } from "../anim";
import { type Actor, type Scene, follow, stage } from "./types";
import { armorRack, cushion, perch, petsInRoom, weaponRack } from "../companions";
import { bench, flask, towels, wallAge } from "../decor";

const W = 300, H = 230, FL = 180;
const YARD = { kind: "courtyard" as const, horizon: 112, sunX: 160 }; // üç pencere aynı avluya bakar
const BAG = 210; // torba ortası
const CX = BAG - 13; // Cengiz'in durduğu yer
const AX = 108; // Ayşenur'un matı

const f = (o: Partial<Free> & Pick<Free, "hip" | "neck">): Free => ({ ...STAND_F, ...o });

// kickboks pozları (sağa, torbaya bakarak)
const GUARD = f({ hip: [0, -9], neck: [1, -16], eB: [0, -12], hB: [2, -16], eF: [3, -12], hF: [4, -16], kB: [-2, -5], fB: [-3, 0], kF: [3, -5], fF: [3, 0] });
const K: Record<string, { pose: Free; hit: (p: Free) => V }> = {
  jab: { pose: f({ hip: [1, -9], neck: [2, -16], eB: [1, -12], hB: [3, -16], eF: [6, -15], hF: [10, -16], kB: [-1, -5], fB: [-3, 0], kF: [4, -5], fF: [4, 0] }), hit: (p) => p.hF },
  cross: { pose: f({ hip: [1, -9], neck: [3, -16], eB: [6, -15], hB: [11, -16], eF: [3, -12], hF: [4, -16], kB: [0, -5], fB: [-2, -1], kF: [4, -5], fF: [4, 0] }), hit: (p) => p.hB },
  hook: { pose: f({ hip: [1, -9], neck: [3, -16], eB: [1, -12], hB: [3, -16], eF: [7, -15], hF: [9, -17], kB: [-1, -5], fB: [-3, 0], kF: [4, -5], fF: [4, 0] }), hit: (p) => p.hF },
  front: { pose: f({ hip: [-1, -10], neck: [-2, -17], eB: [-2, -12], hB: [0, -16], eF: [1, -13], hF: [3, -16], kB: [-2, -5], fB: [-2, 0], kF: [5, -11], fF: [11, -10] }), hit: (p) => p.fF },
  round: { pose: f({ hip: [-1, -10], neck: [-4, -16], eB: [-4, -12], hB: [-2, -15], eF: [0, -13], hF: [2, -16], kB: [-2, -5], fB: [-2, 0], kF: [5, -13], fF: [12, -15] }), hit: (p) => p.fF },
};
const COMBO = ["jab", "cross", "guard", "hook", "cross", "guard", "front", "guard", "jab", "jab", "cross", "round", "guard", "hook", "round", "guard"];

// pilates pozları (sağa bakarak; uzanırken kafa geride)
const PL: Free[] = [
  f({ hip: [0, -9], neck: [0, -16], eF: [1, -20], hF: [1, -24], eB: [-1, -20], hB: [-1, -24] }), // uzanma
  f({ hip: [0, -9], neck: [-2, -16], eF: [-2, -21], hF: [-5, -24], eB: [-3, -20], hB: [-6, -23] }), // yana esneme
  f({ hip: [0, -9], neck: [0, -16], eF: [1, -20], hF: [1, -24], eB: [-1, -20], hB: [-1, -24] }),
  f({ hip: [-4, -2], neck: [-3, -9], eF: [0, -7], hF: [4, -6], eB: [-1, -7], hB: [3, -6], kB: [1, -2], fB: [6, -1], kF: [1, -2], fF: [7, -1] }), // oturuş
  f({ hip: [-4, -2], neck: [1, -8], eF: [4, -5], hF: [8, -3], eB: [3, -6], hB: [7, -4], kB: [1, -2], fB: [6, -1], kF: [1, -2], fF: [7, -1] }), // öne uzanma
  f({ hip: [-4, -2], neck: [-3, -9], eF: [0, -7], hF: [4, -6], eB: [-1, -7], hB: [3, -6], kB: [1, -2], fB: [6, -1], kF: [1, -2], fF: [7, -1] }),
  f({ hip: [0, -2], neck: [-7, -2], eF: [-3, -1], hF: [1, -1], eB: [-3, -1], hB: [1, -1], kB: [3, -6], fB: [6, 0], kF: [3, -6], fF: [6, 0], rot: -1 }), // sırt üstü
  f({ hip: [1, -7], neck: [-7, -2], eF: [-3, -1], hF: [1, -1], eB: [-3, -1], hB: [1, -1], kB: [4, -8], fB: [6, 0], kF: [4, -8], fF: [6, 0], rot: -1 }), // köprü
  f({ hip: [0, -2], neck: [-7, -2], eF: [-3, -1], hF: [1, -1], eB: [-3, -1], hB: [1, -1], kB: [3, -6], fB: [6, 0], kF: [3, -6], fF: [6, 0], rot: -1 }),
  f({ hip: [1, -7], neck: [-7, -2], eF: [-3, -1], hF: [1, -1], eB: [-3, -1], hB: [1, -1], kB: [4, -8], fB: [6, 0], kF: [4, -8], fF: [6, 0], rot: -1 }),
  f({ hip: [0, -2], neck: [-7, -4], eB: [-8, -1], hB: [-8, -5], eF: [-3, -3], hF: [0, -2], kB: [4, -1], fB: [9, -1], kF: [4, -2], fF: [9, -2], rot: -1 }), // yan yatış
  f({ hip: [0, -2], neck: [-7, -4], eB: [-8, -1], hB: [-8, -5], eF: [-3, -3], hF: [0, -2], kB: [4, -1], fB: [9, -1], kF: [5, -6], fF: [10, -9], rot: -1 }), // bacak kaldırma
  f({ hip: [0, -2], neck: [-7, -4], eB: [-8, -1], hB: [-8, -5], eF: [-3, -3], hF: [0, -2], kB: [4, -1], fB: [9, -1], kF: [4, -2], fF: [9, -2], rot: -1 }),
  f({ hip: [0, -2], neck: [-7, -4], eB: [-8, -1], hB: [-8, -5], eF: [-3, -3], hF: [0, -2], kB: [4, -1], fB: [9, -1], kF: [5, -6], fF: [10, -9], rot: -1 }),
  f({ hip: [0, -2], neck: [-6, -4], eF: [-2, -3], hF: [2, -3], eB: [-2, -3], hB: [2, -3], kB: [4, -6], fB: [8, -9], kF: [4, -6], fF: [8, -9], rot: -1 }), // yüzlük
  f({ hip: [-4, -2], neck: [-3, -9], eF: [0, -7], hF: [4, -6], eB: [-1, -7], hB: [3, -6], kB: [1, -2], fB: [6, -1], kF: [1, -2], fF: [7, -1] }),
];

function bag(c: Ctx, swing: number) {
  const top: V = [BAG, 58], hang: V = [BAG + swing * 0.4, 134], bottom: V = [BAG + swing, 176];
  line(c, top, hang, 1, "#8a8494");
  rect(c, BAG - 10, 54, 20, 4, P.woodDk);
  limb(c, hang, bottom, 12, "#7a2a33");
  line(c, [hang[0] - 4, hang[1] + 3], [bottom[0] - 4, bottom[1] - 3], 1, "#a8404b");
  rect(c, Math.round(hang[0]) - 6, 140, 13, 2, P.ink);
  rect(c, Math.round(hang[0] + (bottom[0] - hang[0]) * 0.8) - 6, 168, 13, 2, P.ink);
}

function hall(c: Ctx, tod: number, t: number) {
  coolWall(c, -240, -140, W + 240, FL, 21);
  rect(c, -240, 50, W + 2 * 240, 4, P.woodDk);
  archWindow(c, 22, 66, 34, 64, tod, t, YARD);
  archWindow(c, 140, 66, 34, 64, tod, t, YARD);
  archWindow(c, 252, 66, 34, 64, tod, t, YARD);
  lightBeam(c, 24, 110, 28, 50, FL, tod);
  lightBeam(c, 142, 110, 28, 168, FL, tod);
  sarmasik(c, 20, 62, 24, 4);
  sarmasik(c, 288, 60, 30, 9);
  // eldiven askısı ve ip
  rect(c, 236, 130, 22, 2, P.woodDk);
  rect(c, 240, 132, 5, 7, P.ink); rect(c, 241, 133, 3, 5, "#c0343f");
  rect(c, 249, 132, 5, 7, P.ink); rect(c, 250, 133, 3, 5, "#2f3b6b");
  for (let i = 0; i < 10; i++) px(c, 262 + Math.round(Math.sin(i * 0.8) * 2), 128 + i * 3, P.parchDk);
  plant(c, 6, FL, true);
  plant(c, 128, FL);
  floor(c, -240, W + 240, FL, H - FL);
  // antrenman zemini ve pilates matı
  rect(c, BAG - 34, FL - 1, 60, 2, "#5a2a33");
  rect(c, AX - 18, FL - 1, 40, 2, "#7a68a6");
  rect(c, AX - 18, FL - 1, 40, 1, "#9a86c4");
  // pilates çemberi ve top
  for (let a = 0; a < Math.PI * 2; a += 0.35) px(c, AX - 30 + Math.round(Math.cos(a) * 5), FL - 6 + Math.round(Math.sin(a) * 5), "#c9a6c8");
  rect(c, AX + 26, FL - 7, 7, 7, P.ink); rect(c, AX + 27, FL - 6, 5, 5, "#e88aa8"); px(c, AX + 28, FL - 5, "#fff");
}

export const sport: Scene = {
  id: "spor",
  vh: 760,
  render({ c, p, view, t, still }) {
    const tod = lerp(0.4, 0.5, p);
    const enter = seg(p, 0, 0.14);
    const work = seg(p, 0.16, 0.9);
    const leave = seg(p, 0.92, 1);

    // Cengiz
    const ci = Math.min(COMBO.length - 1, Math.floor(work * COMBO.length));
    const cph = work * COMBO.length - ci;
    const move = COMBO[ci];
    let cPose: Free = GUARD;
    let impact: V | null = null, impactK = 0, trail: [V, V] | null = null, swing = 0;
    if (work > 0 && move !== "guard") {
      const k = K[move];
      const a = cph < 0.35 ? ease(cph / 0.35) : cph < 0.6 ? 1 : 1 - ease((cph - 0.6) / 0.4);
      cPose = lerpFree(GUARD, k.pose, a);
      if (cph >= 0.3 && cph < 0.62) { impact = k.hit(k.pose); impactK = (cph - 0.3) / 0.32; }
      if (cph < 0.36) trail = [k.hit(GUARD), k.hit(cPose)];
      if (cph > 0.33) swing = Math.sin((cph - 0.33) * Math.PI * 2.4) * 3 * Math.exp(-(cph - 0.33) * 2.5);
    } else if (work > 0) {
      // gard: küçük ayak hareketi
      const b = Math.round(Math.sin(cph * Math.PI * 2));
      cPose = { ...GUARD, hip: [GUARD.hip[0], GUARD.hip[1] + (b > 0 ? -1 : 0)], neck: [GUARD.neck[0], GUARD.neck[1] + (b > 0 ? -1 : 0)] };
      const prev = COMBO[Math.max(0, ci - 1)];
      if (prev !== "guard" && cph < 0.4) swing = Math.sin((cph + 0.67) * Math.PI * 2.4) * 3 * Math.exp(-(cph + 0.67) * 2.5);
    }
    const cw = walkTo(enter, 4, CX);
    const ae = walkTo(enter, 20, AX);
    const pil = sequence(work, PL, 0.45);
    const aPose = work > 0 ? lerpFree(STAND_F, pil.pose, seg(work, 0, 0.02)) : null;

    const cam = follow((CX + AX) / 2 + 4, FL, view, W, H, 0.7, -140);
    const actors: Actor[] = [];
    stage(c, cam, view, () => {
      hall(c, tod, t);
      armorRack(c, 32, FL); weaponRack(c, 54, FL);
      wallAge(c, -240, W + 240, -140, FL, 23);
      // dinlenme bankı, havlular, su mataraları
      bench(c, 268, FL, 28); towels(c, 276, FL - 9); flask(c, 288, FL - 9); flask(c, 274, FL, "#5f9e6e"); flask(c, 292, FL, "#e2674f");
      cushion(c, 166, FL);
      const perchTop = perch(c, 142, FL, 22);
      bag(c, swing);
      const lv = (from: number, to: number) => lerp(from, to, leave);
      const pets = petsInRoom(c, { t, still, floor: FL, enter, leave, cengizX: leave > 0 ? lv(CX, W + 50) : enter < 1 ? cw.x : CX, aysenurX: leave > 0 ? lv(AX, W + 30) : enter < 1 ? ae.x : AX, cushionX: 166, perchAt: perchTop, exitX: W + 64 });
      if (leave > 0) {
        // antrenman bitti: sağdaki kapıdan dışarı
        for (const q of [{ who: "aysenur" as const, from: AX, to: W + 30, seed: 1 }, { who: "cengiz" as const, from: CX, to: W + 50, seed: 3 }]) {
          actors.push({ who: q.who, anchors: drawCharacter(c, { who: q.who, ...walkTo(leave, q.from, q.to), y: FL, outfit: "sport", blink: !still && blinkAt(t, q.seed) }) });
        }
        actors.push(...pets);
        return;
      }
      // Ayşenur
      if (aPose) {
        actors.push({ who: "aysenur", anchors: drawCharacter(c, { who: "aysenur", x: AX, y: FL, dir: 1, pose: aPose, outfit: "sport", blink: !still && blinkAt(t, 1) }) });
        // hareket yönünü gösteren küçük parıltılar (geçiş anlarında)
        if (pil.phase > 0.45 && !still) {
          const lead = aPose.fF[1] < -4 ? aPose.fF : aPose.hF;
          const sx = AX + lead[0] + 2, sy = FL + lead[1] - 2;
          px(c, sx, sy, "rgba(255,240,250,0.9)");
          px(c, sx - 2, sy + 1, "rgba(200,170,240,0.7)");
          px(c, sx + 1, sy - 2, "rgba(200,170,240,0.5)");
        }
      } else {
        actors.push({ who: "aysenur", anchors: drawCharacter(c, { who: "aysenur", ...ae, y: FL, outfit: "sport", blink: !still && blinkAt(t, 1) }) });
      }
      // Cengiz
      if (work > 0) {
        actors.push({ who: "cengiz", anchors: drawCharacter(c, { who: "cengiz", x: CX, y: FL, dir: 1, pose: cPose, outfit: "sport", blink: !still && blinkAt(t, 3) }) });
        if (trail) {
          const [a, b] = trail;
          line(c, [CX + a[0], FL + a[1]], [CX + b[0] - 1, FL + b[1]], 1, "rgba(255,240,200,0.45)");
        }
        if (impact) {
          sparkle(c, [CX + impact[0] + 1, FL + impact[1]], impactK, "#ffe28a");
          if (impactK < 0.4) px(c, CX + impact[0] + 3, FL + impact[1] - 3, "#fff");
        }
      } else {
        actors.push({ who: "cengiz", anchors: drawCharacter(c, { who: "cengiz", ...cw, y: FL, outfit: "sport", blink: !still && blinkAt(t, 3) }) });
      }
      actors.push(...pets);
    });
    return { cam, actors, tod };
  },
};
