// 4 · Şatonun yemek salonu (akşamüstü): masaya oturma, hizmetlilerin servisi, buhar, yemek, kalkış.
import { type Ctx, type Free, type Pose, P, drawCharacter, drawProp, rect } from "../pixel";
import { archWindow, candle, coolWall, door, floor, lightBeam, px, rug, sarmasik } from "../env";
import { STAND_F, blinkAt, ease, lerp, seg, walkTo } from "../anim";
import { lerpFree } from "../pixel";
import { type Actor, type Scene, follow, stage } from "./types";
import { armorRack, cushion, perch, petsInRoom, weaponRack } from "../companions";
import { bread, cart, jug, wallAge } from "../decor";

const W = 300, H = 220, FL = 180;
const TOP = 166; // masa üstü
const T0 = 126, T1 = 194; // masa
const CX = 114, AX = 206; // sandalyeler
const PLATE_C = 132, PLATE_A = 188;
const BACK = 160;
const GARDEN = { kind: "garden" as const, horizon: 92, sunX: 150, pathX: 84 }; // iki pencere aynı bahçeye bakar // arka kapı

const f = (o: Partial<Free>): Free => ({ ...STAND_F, ...o });
const SIT = f({ hip: [-1, -10], neck: [0, -17], eF: [3, -14], hF: [7, -15], eB: [2, -14], hB: [6, -15], kB: [3, -10], fB: [4, 0], kF: [4, -10], fF: [5, 0] });
const EAT = f({ ...SIT, eF: [3, -14], hF: [4, -20] });
const TRAY: Pick<Pose, "eB" | "hB" | "eF" | "hF"> = { eB: [2, 4], hB: [5, 3], eF: [3, 4], hF: [6, 3] };
const PLACE = f({ hip: [0, -9], neck: [2, -15], eF: [5, -13], hF: [8, -12], eB: [4, -13], hB: [7, -12] });

function hall(c: Ctx, tod: number, t: number, still: boolean, doorOpen: number) {
  coolWall(c, -240, -140, W + 240, FL, 33);
  for (const x of [34, 258]) { rect(c, x, 20, 10, FL - 20, P.stoneLt); rect(c, x + 8, 20, 2, FL - 20, P.stoneDk); rect(c, x - 2, 20, 14, 5, P.stoneLt); }
  archWindow(c, 64, 46, 30, 70, tod, t, GARDEN);
  archWindow(c, 206, 46, 30, 70, tod, t, GARDEN);
  lightBeam(c, 66, 90, 24, 96, FL, tod);
  sarmasik(c, 62, 42, 30, 2);
  door(c, BACK - 13, FL - 40, 26, 40, doorOpen);
  // duvar halısı (sancak)
  rect(c, 146, 30, 28, 34, P.roseDk); rect(c, 148, 32, 24, 28, P.rose);
  for (let i = 0; i < 4; i++) px(c, 152 + i * 5, 64, P.gold);
  rect(c, 156, 40, 8, 8, P.gold); rect(c, 158, 42, 4, 4, P.roseDk);
  floor(c, -240, W + 240, FL, H - FL, true);
  rug(c, 90, FL, 140, "#5a2f4a", P.gold);
}

function chairBack(c: Ctx, x: number, dir: 1 | -1) {
  const bx = x - 6 * dir;
  rect(c, bx - 1, FL - 24, 3, 24, P.woodDk);
  rect(c, bx - 1, FL - 24, 3, 2, P.woodLt);
  rect(c, Math.min(bx, x + 4 * dir) - 1, FL - 10, 10, 2, P.woodLt);
  rect(c, x + 3 * dir, FL - 8, 2, 8, P.woodDk);
}

function table(c: Ctx) {
  rect(c, T0, TOP, T1 - T0, 3, "#efe3c8");
  rect(c, T0 - 1, TOP + 3, T1 - T0 + 2, 6, "#d8c6a0");
  for (let x = T0; x < T1; x += 6) px(c, x + 2, TOP + 8, P.rose);
  rect(c, T0 + 4, TOP + 9, 3, FL - TOP - 9, P.woodDk);
  rect(c, T1 - 7, TOP + 9, 3, FL - TOP - 9, P.woodDk);
}

function plate(c: Ctx, x: number, food: number, t: number, steam: boolean, still: boolean) {
  rect(c, x - 5, TOP - 1, 11, 2, P.ink); rect(c, x - 4, TOP - 1, 9, 1, "#f4f4f0");
  if (food > 0) {
    const w = Math.max(1, Math.round(7 * food));
    rect(c, x - Math.floor(w / 2), TOP - 3, w, 2, "#c86a3a");
    if (food > 0.4) { px(c, x - 2, TOP - 4, "#5f9e6e"); px(c, x + 1, TOP - 4, "#e0a03a"); }
  }
  if (steam && food > 0.2 && !still) for (let i = 0; i < 3; i++) {
    const k = (t * 0.8 + i / 3) % 1;
    px(c, x - 1 + Math.round(Math.sin(t * 3 + i * 2) * 1.2), TOP - 5 - Math.round(k * 9), `rgba(255,255,255,${(0.6 * (1 - k)).toFixed(2)})`);
  }
}

export const dining: Scene = {
  id: "yemek",
  vh: 820,
  render({ c, p, view, t, still }) {
    const tod = lerp(0.72, 0.77, p);
    const enter = seg(p, 0, 0.18), sit = ease(seg(p, 0.18, 0.26)), up = ease(seg(p, 0.84, 0.9)), leave = seg(p, 0.9, 1);
    const sIn = seg(p, 0.28, 0.36), sPlace = seg(p, 0.36, 0.42), sOut = seg(p, 0.42, 0.5);
    const served = p >= 0.4;
    const eatK = seg(p, 0.52, 0.84);
    const food = served ? 1 - eatK * 0.9 : 0;

    const cam = follow((CX + AX) / 2, FL, view, W, H, 0.74, -140);
    const actors: Actor[] = [];
    stage(c, cam, view, () => {
      const servantsHere = p > 0.27 && p < 0.51;
      hall(c, tod, t, still, servantsHere ? 1 : 0);
      armorRack(c, 14, FL); weaponRack(c, 290, FL);
      wallAge(c, -240, W + 240, -140, FL, 37);
      cart(c, 80, FL);
      cushion(c, 62, FL);
      const perchTop = perch(c, 238, FL, 24);
      const posX = (from: number, seat: number, out: number) => (leave > 0 ? walkTo(leave, seat, out).x : walkTo(enter, from, seat).x);
      const pets = petsInRoom(c, { t, still, floor: FL, enter, leave, cengizX: posX(0, CX, 310), aysenurX: posX(-16, AX, 330), cushionX: 62, perchAt: perchTop, exitX: 324 });

      // hizmetliler: arka kapıdan girip tabakları bırakır, geri döner
      if (servantsHere) {
        for (const s of [{ who: "servant" as const, to: PLATE_C + 8, dir: -1 as const, seed: 5 }, { who: "maid" as const, to: PLATE_A - 8, dir: 1 as const, seed: 7 }]) {
          let x = BACK, pose: Free | ReturnType<typeof walkTo>["pose"] = STAND_F, dir = s.dir;
          if (sOut > 0) { const w = walkTo(sOut, s.to, BACK); x = w.x; pose = w.pose; dir = w.dir; }
          else if (sPlace > 0) { x = s.to; pose = lerpFree(f({ eB: [2, -12], hB: [5, -13], eF: [3, -12], hF: [6, -13] }), PLACE, Math.sin(sPlace * Math.PI)); }
          else { const w = walkTo(sIn, BACK, s.to); x = w.x; dir = w.dir; pose = { ...w.pose, ...TRAY }; }
          const a = drawCharacter(c, { who: s.who, x, y: FL, dir, pose, outfit: "home", blink: !still && blinkAt(t, s.seed) });
          if (!served) drawProp(c, "tray", [a.hand[0] + dir, a.hand[1] - 1], dir);
        }
      }

      chairBack(c, CX, 1);
      chairBack(c, AX, -1);

      // Cengiz ve Ayşenur
      for (const q of [{ who: "cengiz" as const, seat: CX, dir: 1 as const, from: 0, out: 310, seed: 3, phase: 0 }, { who: "aysenur" as const, seat: AX, dir: -1 as const, from: -16, out: 330, seed: 1, phase: 0.5 }]) {
        let a;
        if (leave > 0) {
          const w = walkTo(leave, q.seat, q.out);
          a = drawCharacter(c, { who: q.who, ...w, y: FL, outfit: "home", blink: !still && blinkAt(t, q.seed) });
        } else if (enter < 1) {
          const w = walkTo(enter, q.from, q.seat);
          a = drawCharacter(c, { who: q.who, ...w, y: FL, outfit: "home", blink: !still && blinkAt(t, q.seed) });
        } else {
          // yemek: çatal tabakla ağız arasında gider gelir
          const cyc = eatK > 0 && eatK < 1 ? (eatK * 6 + q.phase) % 1 : 0;
          const bite = cyc < 0.5 ? Math.sin(cyc * 2 * Math.PI) : 0;
          let pose = lerpFree(SIT, EAT, bite);
          pose = lerpFree(STAND_F, pose, sit * (1 - up));
          a = drawCharacter(c, { who: q.who, x: q.seat, y: FL, dir: q.dir, pose, outfit: "home", blink: !still && blinkAt(t, q.seed) });
          if (served && sit === 1 && up === 0) drawProp(c, "fork", a.hand, q.dir);
        }
        actors.push({ who: q.who, anchors: a });
      }

      table(c);
      if (served) {
        plate(c, PLATE_C, food, t, true, still);
        plate(c, PLATE_A, food, t + 1, true, still);
        drawProp(c, "glass", [PLATE_C + 9, TOP], 1);
        drawProp(c, "glass", [PLATE_A - 9, TOP], -1);
      }
      jug(c, 146, TOP); bread(c, 176, TOP);
      // şamdan
      rect(c, 157, TOP - 4, 7, 4, P.gold);
      candle(c, 155, TOP - 10, t, still);
      candle(c, 163, TOP - 10, t + 1, still);
      rect(c, 154, TOP - 5, 13, 1, P.gold);
      actors.push(...pets);
    });
    return { cam, actors, tod };
  },
};
