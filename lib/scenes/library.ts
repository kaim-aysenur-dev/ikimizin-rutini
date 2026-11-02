// 6 · Kütüphane molası (akşam, yağmurlu): bakım ile şömine arasında sakin bir ara.
// Ayşenur raftan kitap seçer, Cengiz yanına gelir; yan yana oturup birlikte okurlar, sayfa çevirir,
// birbirlerine bakarlar; sonra kitabı yerine bırakıp şömine salonuna yürürler.
import { type Ctx, type Free, P, drawCharacter, lerpFree, rect } from "../pixel";
import { archWindow, books, candle, floor, px, rug, warmWall } from "../env";
import { STAND_F, blinkAt, ease, lerp, seg, walkFrame, walkTo } from "../anim";
import { type CatMode, perch, petsInRoom, pt } from "../companions";
import { autoStart, since } from "../adventures";
import { type Actor, type Scene, follow, stage } from "./types";
import { letters, wallAge } from "../decor";
import { wizard } from "../guests";

const W = 300, H = 220, FL = 180;
const SHELF = { x: 176, w: 72 };
const PICK = 206; // Ayşenur'un kitap aldığı raf önü
const CHAIR = { aysenur: 108, cengiz: 150 }; // karşılıklı iki koltuk, aralarında kitap masası
const TABLE_X = 129;

const f = (o: Partial<Free>): Free => ({ ...STAND_F, ...o });
const REACH = f({ eF: [3, -21], hF: [5, -27] });
const HOLD = f({ eF: [3, -12], hF: [5, -15] });
const SIT = f({ hip: [-1, -14], neck: [0, -21], eF: [3, -17], hF: [6, -18], eB: [2, -17], hB: [5, -18], kB: [4, -14], fB: [6, 0], kF: [5, -13], fF: [6, 0] });
const SIT_REST = f({ ...SIT, eF: [2, -16], hF: [4, -15], eB: [1, -16], hB: [3, -15] });

function shelf(c: Ctx) {
  const { x, w } = SHELF;
  rect(c, x - 2, 56, w + 4, FL - 56, P.woodDk);
  rect(c, x, 58, w, FL - 58, "#3a2a22");
  for (const y of [84, 108, 130, 152, 176]) { rect(c, x, y, w, 3, P.woodLt); books(c, x + 2, y, 12, y); }
  rect(c, x - 4, 52, w + 8, 4, P.woodLt);
}

function tapestry(c: Ctx, t: number) {
  // eski takvimin yerinde işlemeli duvar halısı: ay, yıldız ve ağaç motifi
  const x = 100, y = 58, w = 54, h = 56;
  rect(c, x - 3, y - 4, w + 6, 3, P.woodDk);
  rect(c, x, y, w, h, P.roseDk);
  rect(c, x + 2, y + 2, w - 4, h - 4, "#7a3b4a");
  for (let i = 0; i < w; i += 3) px(c, x + i, y + h - 1 + (i % 2), P.gold);
  // ağaç
  rect(c, x + 26, y + 26, 2, 22, "#4a3224");
  for (let k = 0; k < 14; k++) { const ww = 14 - k; rect(c, x + 27 - ww, y + 36 - k, ww * 2, 1, k % 3 ? "#3f6a44" : "#4f7a4f"); }
  // ay ve yıldızlar
  rect(c, x + 8, y + 8, 6, 6, P.goldLt); rect(c, x + 10, y + 7, 5, 6, "#7a3b4a");
  for (const [sx, sy] of [[40, 10], [46, 18], [34, 6], [6, 22]]) px(c, x + sx, y + sy, (Math.floor(t + sx) % 3) ? P.goldLt : P.gold);
}

// yün yumağı ve açılan ipi
const YARN0 = 160, YARN1 = 184;
function yarn(c: Ctx, x: number, hop: number, unrolled: boolean) {
  const bx = Math.round(x), by = FL - 3 - hop;
  if (unrolled) for (let i = YARN0; i < bx - 2; i++) px(c, i, FL - 1 - (Math.floor(i / 3) % 2), "#c86a7a");
  rect(c, bx - 3, by - 2, 6, 5, P.ink); rect(c, bx - 2, by - 2, 4, 4, "#d8708a");
  px(c, bx - 1, by - 1, "#f0a0b8"); px(c, bx + 1, by + 1, "#a8506a"); px(c, bx, by, "#f0a0b8");
}

// dir: oturanın baktığı yön; sırtlık arkada kalır
function chair(c: Ctx, x: number, dir: 1 | -1) {
  const bx = dir > 0 ? x - 8 : x + 4;
  rect(c, bx, 146, 4, 26, "#5a2f4a"); rect(c, bx, 146, 4, 2, "#7a4a63");
  rect(c, x - 7, 164, 16, 8, "#6b3f63"); rect(c, x - 7, 164, 16, 2, "#8a5a80");
  rect(c, x - 6, 172, 2, 8, P.woodDk); rect(c, x + 6, 172, 2, 8, P.woodDk);
}

function book(c: Ctx, at: [number, number], open: number, flip: number) {
  const [x, y] = [Math.round(at[0]), Math.round(at[1])];
  if (open < 0.5) { rect(c, x - 1, y - 4, 5, 5, P.ink); rect(c, x, y - 3, 3, 3, "#5b4a7a"); px(c, x + 1, y - 2, P.gold); return; }
  rect(c, x - 1, y - 3, 13, 4, P.ink);
  rect(c, x, y - 2, 5, 2, P.cream); rect(c, x + 6, y - 2, 5, 2, P.cream); rect(c, x + 5, y - 3, 1, 4, P.woodDk);
  // sayfa çevirme: bir sayfa sağdan sola kalkar
  if (flip > 0 && flip < 1) { const px0 = Math.round(x + 10 - flip * 9); rect(c, px0, y - 3 - Math.round(Math.sin(flip * Math.PI) * 3), 1, 3, "#fffaf0"); }
}

export const library: Scene = {
  id: "kutuphane",
  vh: 680,
  render({ c, p, view, t, still }) {
    const tod = lerp(0.84, 0.88, p);
    const enter = seg(p, 0, 0.14), pick = seg(p, 0.14, 0.24), toChairs = seg(p, 0.24, 0.34), sit = ease(seg(p, 0.34, 0.4));
    const read = seg(p, 0.4, 0.7), up = ease(seg(p, 0.7, 0.76)), back = seg(p, 0.76, 0.84), put = seg(p, 0.84, 0.88), leave = seg(p, 0.88, 1);
    const cam = follow(150, FL, view, W, H, 0.74, -140);
    const actors: Actor[] = [];
    // kitabın açıklığı ve sayfa çevirme anları
    const open = read > 0.04 && read < 0.96 ? 1 : 0;
    const flipAt = [0.28, 0.55, 0.8].map((k) => seg(read, k, k + 0.08)).find((k) => k > 0 && k < 1) ?? 0;

    stage(c, cam, view, () => {
      warmWall(c, -240, -140, W + 240, FL, 71);
      archWindow(c, 22, 60, 34, 60, tod, t, { kind: "rainTrees", horizon: 98, sunX: 40 });
      tapestry(c, t);
      wallAge(c, -240, W + 240, -140, FL, 73);
      // kişisel notlar
      rect(c, 160, 70, 8, 9, P.parch); rect(c, 161, 72, 6, 1, P.woodDk); rect(c, 162, 84, 7, 8, "#e8d8b8"); px(c, 165, 85, "#8a2b2b");
      shelf(c);
      floor(c, -240, W + 240, FL, H - FL);
      rug(c, 80, FL, 100, "#5a2f4a", P.goldLt);
      chair(c, CHAIR.aysenur, 1);
      chair(c, CHAIR.cengiz, -1);
      // aradaki küçük masa: okunan kitap burada açılır; tüy kalem ve mum
      rect(c, TABLE_X - 9, 164, 18, 3, P.woodLt); rect(c, TABLE_X - 7, 167, 2, 13, P.woodDk); rect(c, TABLE_X + 5, 167, 2, 13, P.woodDk);
      px(c, TABLE_X + 6, 160, "#efe3c8"); px(c, TABLE_X + 7, 159, "#efe3c8");
      candle(c, TABLE_X + 6, 159, t, still);
      letters(c, TABLE_X - 22, 151);
      rect(c, TABLE_X - 26, 152, 14, 2, P.woodDk); // pencere önü rafı
      candle(c, 90, 142, t + 2, still);
      rect(c, 87, 147, 9, 2, P.woodDk);
      // gri cübbeli büyücü kürsüsünde kitap okur; kitabına dokununca ortak günlük ve takvim açılır
      const wz = wizard(c, 30, FL, t, still);
      actors.push({ who: "wizardBook", anchors: pt([wz.book[0], wz.book[1] - 6]) }, { who: "gandalf", anchors: pt(wz.head) });

      const aX = leave > 0 ? lerp(PICK, W + 30, leave) : back > 0 ? lerp(CHAIR.aysenur, PICK, back) : toChairs > 0 ? lerp(PICK, CHAIR.aysenur, toChairs) : lerp(-20, PICK, enter);
      const cX = leave > 0 ? lerp(PICK - 16, W + 50, leave) : back > 0 ? lerp(CHAIR.cengiz, PICK - 16, back) : toChairs > 0 ? lerp(PICK - 12, CHAIR.cengiz, toChairs) : pick > 0 ? lerp(186, PICK - 12, pick) : lerp(-40, 186, enter);
      const perchTop = perch(c, 74, FL, 24);
      // yün yumağı: okurken Düldül yaklaşır, patisiyle dokunur, yuvarlanan yumağın peşinden koşar, yakalayıp oynar
      const reading = toChairs === 1 && back === 0;
      if (reading && read > 0) autoStart("yarn", t);
      const ky = since("yarn", t);
      const ball = ky < 1.4 ? YARN0 : lerp(YARN0, YARN1, ease(Math.min(1, (ky - 1.4) / 1.6)));
      let cat: { x: number; mode: CatMode; dir: 1 | -1 } | undefined;
      if (ky >= 0 && ky < 7.5) {
        if (ky < 1) cat = { x: lerp(150, 154, ky), mode: "walk", dir: 1 };
        else if (ky < 1.4) cat = { x: 154, mode: "crouch", dir: 1 };
        else if (ky < 3) cat = { x: lerp(154, YARN1 - 7, (ky - 1.4) / 1.6), mode: "run", dir: 1 };
        else if (ky < 4.5) cat = { x: YARN1 - 7, mode: "crouch", dir: 1 };
        else if (ky < 6) cat = { x: YARN1 - 7, mode: "sit", dir: 1 };
        else cat = { x: lerp(YARN1 - 7, 150, (ky - 6) / 1.5), mode: "walk", dir: -1 };
      }
      yarn(c, ball, ky > 3 && ky < 4.5 && !still ? Math.round(Math.abs(Math.sin(t * 8))) : 0, ky > 1.4);
      actors.push({ who: "yarn", anchors: { head: [Math.round(ball), FL - 10], hand: [0, 0], handB: [0, 0], hip: [0, 0], mouth: [0, 0], shoulder: [0, 0] } });
      actors.push(...petsInRoom(c, { t, still, floor: FL, enter, leave, cengizX: cX, aysenurX: aX, cushionX: 150, perchAt: perchTop, exitX: W + 60, cat }));

      const walking = (k: number) => k > 0 && k < 1;
      for (const who of ["aysenur", "cengiz"] as const) {
        const x = who === "aysenur" ? aX : cX;
        let pose: Free | ReturnType<typeof walkTo>["pose"] = STAND_F;
        let dir: 1 | -1 = 1, headDir: 1 | -1 | undefined;
        if (walking(enter) || walking(leave)) pose = walkFrame(x);
        else if (walking(toChairs)) { pose = walkFrame(x); dir = -1; }
        else if (walking(back)) pose = walkFrame(x);
        else if (sit > 0 && up < 1 && toChairs === 1 && back === 0) {
          // ikisi de masadaki kitaba uzanır; sayfayı çeviren el sırayla değişir
          pose = lerpFree(STAND_F, read > 0 && read < 1 ? SIT : SIT_REST, sit * (1 - up));
        } else if (who === "aysenur" && pick > 0 && toChairs === 0) {
          pose = lerpFree(STAND_F, pick < 0.6 ? REACH : HOLD, pick < 0.6 ? Math.sin((pick / 0.6) * Math.PI / 2) : 1);
        } else if (who === "aysenur" && put > 0 && leave === 0) {
          pose = lerpFree(HOLD, REACH, Math.sin(put * Math.PI));
        }
        if (who === "cengiz" && toChairs === 1 && back === 0) dir = -1; // Cengiz karşıdaki koltukta Ayşenur'a bakar
        const a = drawCharacter(c, { who, x, y: FL, dir, pose, outfit: "night", headDir, blink: !still && blinkAt(t, who === "aysenur" ? 1 : 3) });
        actors.push({ who, anchors: a });
        // kitap: alındığı andan rafa konana kadar Ayşenur'da
        const onTable = toChairs === 1 && back === 0 && sit > 0.6 && up < 0.4;
        const hasBook = who === "aysenur" && ((pick > 0.5) || toChairs > 0) && !(put > 0.5) && leave === 0 && !onTable;
        if (hasBook) book(c, [a.hand[0] + 1, a.hand[1] + 1], 0, 0);
      }
      // okurken kitap masada açık durur
      if (toChairs === 1 && back === 0 && sit > 0.6 && up < 0.4) book(c, [TABLE_X - 5, 163], open, flipAt);
    });
    return { cam, actors, tod };
  },
};
