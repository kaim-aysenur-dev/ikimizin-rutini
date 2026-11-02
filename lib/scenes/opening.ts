// 1 · Açılış odası, iki kollu merdiven ve alt kattaki ortak yaşam alanı (sabah).
// Karakter konumu tamamen kaydırmadan türetilir; yukarı kaydırınca aynı yoldan geri gelinir.
import { P, STAND, drawCharacter, line, rect, type Pose } from "../pixel";
import { archWindow, candle, coolWall, floor, lightBeam, plant, px, rug, sarmasik, sconce, shelf, warmWall } from "../env";
import { blinkAt, lerp, seg, walkFrame } from "../anim";
import { type Actor, type Scene, follow, stage } from "./types";
import { duldul, parrot } from "../companions";
import { adv, autoStart, since } from "../adventures";
import { armorRack, cushion, perch, weaponRack } from "../companions";
import { armchair, bag, banner, blankets, chest, column, desk, dust, painting, shadow, statuette, tapOpen, wallAge, worldMap } from "../decor";

const W = 336, H = 400;
const FL1 = 150, FL2 = 270;
const RUN = 8, RISE = 6, STEPS = 10;
const S1X = 212, S2X = 300;
const LANDING = FL1 + STEPS * RISE;

const upper = (x: number) => (x <= S1X ? FL1 : Math.min(LANDING, FL1 + Math.ceil((x - S1X) / RUN) * RISE));
const lower = (x: number) => (x >= S2X ? LANDING : Math.min(FL2, LANDING + Math.ceil((S2X - x) / RUN) * RISE));

type Seg = { len: number; x0: number; dir: 1 | -1; surface: (x: number) => number };
const PATH: Seg[] = [
  { len: S1X - 100, x0: 100, dir: 1, surface: upper },
  { len: STEPS * RUN + 4, x0: S1X, dir: 1, surface: upper },
  { len: 8, x0: S1X + STEPS * RUN + 4, dir: 1, surface: () => LANDING },
  { len: 84, x0: S2X + 4, dir: -1, surface: lower },
  { len: 80, x0: 220, dir: -1, surface: lower },
];
const PATH_LEN = PATH.reduce((a, s) => a + s.len, 0);
const GAP = 22;

function along(dist: number) {
  let d = Math.max(0, Math.min(PATH_LEN, dist));
  for (const s of PATH) {
    if (d <= s.len) return { x: s.x0 + d * s.dir, dir: s.dir, surface: s.surface };
    d -= s.len;
  }
  const last = PATH[PATH.length - 1];
  return { x: last.x0 + last.len * last.dir, dir: last.dir, surface: last.surface };
}

function stairs() {
  return (c: CanvasRenderingContext2D) => {
    for (let i = 0; i < STEPS; i++) {
      const sx = S1X + i * RUN, top = FL1 + (i + 1) * RISE;
      rect(c, sx, top, RUN, LANDING - top + 6, P.stoneDk);
      rect(c, sx, top, RUN, 2, P.woodLt);
      rect(c, sx, top + 2, RUN, 1, P.woodDk);
      rect(c, sx, top, 1, RISE, P.stoneDeep);
    }
    line(c, [S1X, FL1 - 13], [S1X + STEPS * RUN, LANDING - 13], 2, P.woodDk);
    for (let i = 0; i <= STEPS; i += 2) rect(c, S1X + i * RUN + 2, FL1 + i * RISE - 12, 1, 12, P.woodDk);
    rect(c, S2X - 8, LANDING, W - S2X + 8, 6, P.woodDk);
    rect(c, S2X - 8, LANDING, W - S2X + 8, 2, P.woodLt);
    rect(c, S2X - 8, LANDING + 6, W - S2X + 8, FL2 - LANDING - 6, P.stoneDeep);
    for (let i = 0; i < STEPS; i++) {
      const sx = S2X - (i + 1) * RUN, top = LANDING + (i + 1) * RISE;
      rect(c, sx, top, RUN, FL2 - top, P.stone);
      rect(c, sx, top, RUN, 2, P.woodLt);
      rect(c, sx, top + 2, RUN, 1, P.woodDk);
      rect(c, sx + RUN - 1, top, 1, RISE, P.stoneDk);
    }
  };
}
const drawStairs = stairs();

function planBoard(c: CanvasRenderingContext2D, x: number, y: number) {
  rect(c, x - 3, y - 3, 64, 48, P.woodDk);
  rect(c, x - 2, y - 2, 62, 46, P.woodLt);
  rect(c, x, y, 58, 42, P.parch);
  rect(c, x, y + 40, 58, 2, P.parchDk);
  rect(c, x + 6, y + 4, 46, 2, P.roseDk);
  for (let r = 0; r < 4; r++) {
    rect(c, x + 4, y + 12 + r * 7, 3, 3, r < 3 ? P.moss : P.parchDk);
    rect(c, x + 9, y + 13 + r * 7, 16, 1, P.woodDk);
    rect(c, x + 32, y + 12 + r * 7, 3, 3, r < 2 ? P.rose : P.parchDk);
    rect(c, x + 37, y + 13 + r * 7, 16, 1, P.woodDk);
  }
  rect(c, x + 28, y - 6, 2, 4, P.ink);
}

// alt kattaki açık ahşap sandık: arkası kediden önce, önü sonra çizilir (içine girince gövde gizlenir)
const CHEST = 44;
function chestBack(c: CanvasRenderingContext2D) {
  rect(c, CHEST - 12, FL2 - 17, 22, 8, P.woodDk); // açık kapak arkada
  rect(c, CHEST - 11, FL2 - 16, 20, 6, P.wood);
  rect(c, CHEST - 10, FL2 - 10, 20, 2, "#2a1c16"); // iç karanlık
}
function chestFront(c: CanvasRenderingContext2D) {
  rect(c, CHEST - 11, FL2 - 9, 22, 9, P.ink);
  rect(c, CHEST - 10, FL2 - 8, 20, 8, P.wood);
  rect(c, CHEST - 10, FL2 - 8, 20, 1, P.woodLt);
  rect(c, CHEST - 10, FL2 - 4, 20, 1, P.woodDk);
  rect(c, CHEST - 1, FL2 - 6, 2, 3, P.gold);
}

function shelfBooks(c: CanvasRenderingContext2D, x: number, y: number) {
  const cols = [P.roseDk, P.navy, P.forest2, P.violet, "#7a3b3b", P.woodDk];
  for (let i = 0, bx = x; i < 9; i++) { const h = 8 + ((i * 7) % 5); rect(c, bx, y - h, 4, h, P.ink); rect(c, bx, y - h + 1, 3, h - 1, cols[i % cols.length]); bx += 4; }
}

function teaTable(c: CanvasRenderingContext2D, x: number, y: number, t: number, still: boolean) {
  rect(c, x, y - 12, 44, 3, P.woodLt);
  rect(c, x, y - 9, 44, 1, P.woodDk);
  rect(c, x + 3, y - 9, 2, 9, P.woodDk);
  rect(c, x + 39, y - 9, 2, 9, P.woodDk);
  rect(c, x + 8, y - 19, 8, 7, P.ink); rect(c, x + 9, y - 18, 6, 5, P.cream); rect(c, x + 16, y - 17, 2, 1, P.ink);
  rect(c, x + 24, y - 15, 4, 3, P.ink); rect(c, x + 25, y - 14, 2, 1, P.rose);
  rect(c, x + 31, y - 15, 4, 3, P.ink); rect(c, x + 32, y - 14, 2, 1, P.lilac);
  if (!still) {
    const k = Math.floor(t * 3) % 3;
    px(c, x + 12, y - 21 - k, "rgba(255,255,255,0.6)");
    px(c, x + 13, y - 24 - ((k + 1) % 3), "rgba(255,255,255,0.4)");
  }
}

export const opening: Scene = {
  id: "acilis",
  vh: 900,
  render({ c, p, view, t, still }) {
    const tod = lerp(0.2, 0.3, p);
    const walk = seg(p, 0.07, 0.72);
    const lead = GAP + walk * (PATH_LEN - GAP);
    const people = [
      { who: "aysenur" as const, dist: lead },
      { who: "cengiz" as const, dist: lead - GAP },
    ].map((q) => ({ ...q, ...along(q.dist) }));
    const moving = walk > 0 && walk < 1;
    // sonunda sağdaki kapıdan antrenman salonuna çıkarlar
    const exit = seg(p, 0.88, 1);
    if (exit > 0) people.forEach((q, i) => { q.x = lerp(q.x, W + 30 + i * 18, exit); q.dir = 1; q.surface = () => FL2; });

    const midX = (people[0].x + people[1].x) / 2;
    const midY = (people[0].surface(people[0].x) + people[1].surface(people[1].x)) / 2;
    const cam = follow(midX, midY, view, W, H, 0.62, -120);

    const actors: Actor[] = [];
    stage(c, cam, view, () => {
      // üst kat
      warmWall(c, -240, -120, W + 240, FL1, 1);
      rect(c, -240, 4, W + 2 * 240, 6, P.woodDk);
      for (let x = -234; x < W + 240; x += 48) rect(c, x, 4, 6, 10, P.wood);
      archWindow(c, 26, 34, 60, 80, tod, t, { kind: "castle", horizon: 84, sunX: 72 });
      lightBeam(c, 30, 70, 50, 70, FL1, tod);
      dust(c, 40, 80, 60, 64, t);
      sarmasik(c, 24, 30, 40, 1);
      sarmasik(c, 88, 36, 30, 7);
      wallAge(c, -240, W + 240, -120, FL1, 5);
      // yaşam köşesi: harita, sancak, kitap rafı, masa, koltuk
      worldMap(c, 128, 18, tapOpen("map", t));
      banner(c, 102, 16, 46, t);
      shelf(c, 124, 96, 64, t + 1.3, still);
      plant(c, 186, 92);
      // yüksek kitaplık (geniş ekranda solda)
      rect(c, -60, 40, 44, FL1 - 40, P.woodDk);
      for (let y = 62; y < FL1; y += 22) { rect(c, -58, y, 40, 2, P.woodLt); shelfBooks(c, -56, y); }
      plant(c, 8, FL1, true);
      // sandık, deri çanta, katlanmış battaniyeler; dokununca sandığın kapağı aralanır
      chest(c, 40, FL1, tapOpen("chest2", t));
      blankets(c, 33, FL1 - 12 - Math.round(tapOpen("chest2", t) * 5));
      bag(c, 56, FL1);
      cushion(c, 74, FL1);
      desk(c, 150, FL1, t, still, tapOpen("book", t, 1.2));
      armchair(c, 194, FL1, -1);
      perch(c, 120, FL1, 22); // papağanın tüneği (şimdi Ayşenur'un omzunda)
      candle(c, 100, FL1 - 5, t + 2, still);
      rug(c, 30, FL1, 170);
      floor(c, -240, S1X, FL1, 10);
      // merdiven başı taş sütunu ve aplik
      column(c, 210, FL1 - 46, FL1);
      sconce(c, 244, 112, t + 4, still);
      // alt kat
      coolWall(c, -240, FL1 + 10, W + 240, FL2, 9);
      archWindow(c, 16, 184, 34, 54, tod + 0.05, t, { kind: "courtyard", horizon: 220, sunX: 40 });
      sarmasik(c, 14, 180, 26, 3);
      planBoard(c, 66, 188);
      sconce(c, 136, 214, t + 0.7, still);
      teaTable(c, 150, FL2, t, still);
      plant(c, 200, FL2);
      drawStairs(c);
      // sahanlık: küçük tablo, heykelcik, saksı
      painting(c, 304, 176);
      statuette(c, 318, LANDING);
      plant(c, 326, LANDING);
      // sahanlığın altında ekipman köşesi: yedek zırh ve silahlar
      armorRack(c, 308, FL2); weaponRack(c, 326, FL2);
      shadow(c, 300, 34, FL2);
      wallAge(c, -240, W + 240, FL1 + 10, FL2, 11);
      floor(c, -240, W + 240, FL2, 12);
      coolWall(c, -240, FL2 + 12, W + 240, H, 17);

      // Düldül'ün maceraları: açılışta pelerin oyunu, alt katta sandığa saklanma
      const idle = walk === 0 && exit === 0, atEnd = walk === 1 && exit === 0;
      if (idle) autoStart("cape", t);
      if (atEnd) autoStart("chest", t);
      const kc = since("cape", t);
      const capeTug = kc > 2.2 && kc < 3.8 ? Math.round(3 * Math.max(0, 1 - (kc - 2.2) / 1.6)) : 0;
      const looksBack = kc > 2.6 && kc < 3.8;
      chestBack(c);

      people.forEach((q, i) => {
        let pose: Pose = STAND;
        let dir = q.dir;
        let headDir: 1 | -1 | undefined;
        if (exit > 0 && exit < 1) pose = walkFrame(q.x);
        else if (moving) pose = walkFrame(q.dist);
        else if (walk === 0) {
          // açılışta birbirlerine dönük beklerler, arada pencereye bakarlar
          dir = q.who === "cengiz" ? 1 : -1;
          if (!still && Math.floor((t + i * 1.7) / 3.2) % 3 === 2) headDir = dir === 1 ? -1 : 1;
        } else if (exit === 0) dir = q.who === "cengiz" ? -1 : 1;
        if (q.who === "cengiz" && idle && looksBack) headDir = -1;
        const a = drawCharacter(c, { who: q.who, x: q.x, dir, pose, surface: q.surface, outfit: "armor", blink: !still && blinkAt(t, i * 2.3), headDir, capeTug: q.who === "cengiz" && idle ? capeTug : 0 });
        actors.push({ who: q.who, anchors: a });
        if (q.who === "aysenur") actors.push({ who: "parrot", anchors: parrot(c, a.shoulder, dir, "perch", t, still) });
        else {
          // Düldül Cengiz'in 12 piksel gerisinden aynı yolu izler (merdivende küçük adımlarla)
          const cd = q.dist - 12;
          let cat = cd >= 0 ? along(cd) : { x: 100 + cd, dir: 1 as const, surface: upper };
          let cx = cat.x, cy = cat.surface(cat.x), cdir: 1 | -1 = cat.dir, mode: "walk" | "sit" | "rub" | "rest" = "walk", hidden = false;
          if (idle) {
            // pelerin oyunu: yaklaşır, çömelir, sıçrayıp ucuna patisini uzatır, sonra oturur
            cdir = 1; cy = FL1;
            const base = q.x - 13, tip = q.x - 8;
            if (kc >= 0 && kc < 1) { cx = lerp(base, tip - 2, kc); mode = "walk"; }
            else if (kc >= 1 && kc < 2.2) { cx = tip - 2; mode = "rest"; }
            else if (kc >= 2.2 && kc < 2.6) { const k = (kc - 2.2) / 0.4; cx = lerp(tip - 2, tip, k); cy = FL1 - Math.round(Math.sin(k * Math.PI) * 4); mode = "walk"; }
            else if (kc >= 2.6 && kc < 5) { cx = tip; mode = "sit"; }
            else {
              const rub = !still && ((t - adv.cape) % 9) < 1.6;
              cx = rub ? q.x - 6 : base; mode = rub ? "rub" : "sit";
            }
          } else if (atEnd || exit > 0) {
            // sandık: koklar, içine atlar, yalnız kulakları görünür, sonra başını çıkarır; dokununca ya da yürüyüş başlayınca çıkar
            const k = since("chest", t), out = adv.chestOut > adv.chest + 2.6 ? since("chestOut", t) : exit > 0 ? 0 : -1;
            const home = cat.x;
            if (exit > 0) { cx = lerp(CHEST + 8, W + 12, exit); cy = FL2; cdir = 1; mode = exit < 1 ? "walk" : "sit"; }
            else if (out >= 0) {
              cdir = 1;
              if (out < 0.6) { const j = out / 0.6; cx = lerp(CHEST, CHEST + 10, j); cy = FL2 - 6 - Math.round(Math.sin(j * Math.PI) * 8) + Math.round(j * 6); }
              else { cx = lerp(CHEST + 10, home, Math.min(1, (out - 0.6) / 1)); cy = FL2; mode = out < 1.6 ? "walk" : "sit"; }
            } else if (k < 1.2) { cx = lerp(home, CHEST + 8, k / 1.2); cy = FL2; cdir = -1; }
            else if (k < 2) { cx = CHEST + 8; cy = FL2 - (Math.floor(k * 6) % 2); cdir = -1; mode = "sit"; }
            else if (k < 2.6) { const j = (k - 2) / 0.6; cx = lerp(CHEST + 8, CHEST, j); cy = FL2 - Math.round(Math.sin(j * Math.PI) * 10); cdir = -1; }
            else { cx = CHEST; cdir = 1; mode = "sit"; cy = k < 6 ? FL2 + 1 : FL2 - 4; hidden = true; }
          }
          const anchors = duldul(c, cx, cy, cdir, mode, cx, t, still);
          actors.push({ who: "duldul", anchors: hidden ? { ...anchors, head: [Math.round(cx), FL2 - 22] } : anchors });
        }
      });
      chestFront(c);
      for (const [who, x, y] of [["map", 156, 30], ["book", 163, FL1 - 20], ["chest2", 40, FL1 - 14]] as const)
        actors.push({ who, anchors: { head: [x, y], hand: [0, 0], handB: [0, 0], hip: [0, 0], mouth: [0, 0], shoulder: [0, 0] } });
      actors.push({ who: "chest", anchors: { head: [CHEST, FL2 - 14], hand: [0, 0], handB: [0, 0], hip: [0, 0], mouth: [0, 0], shoulder: [0, 0] } });
    });
    return { cam, actors, tod };
  },
};
