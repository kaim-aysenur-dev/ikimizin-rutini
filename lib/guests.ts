// Konuk karakterler (kendi piksel yorumumuz): kütüphanede gri cübbeli büyücü, demirhanede cüce demirci,
// avluda elf okçu. Hepsi kendi alanında kısa, döngüsel çevre hareketleri yapar; kaydırma akışını etkilemez.
import { type Ctx, type Free, type V, P, drawCharacter, lerpFree, line, poly, quad, rect } from "./pixel";
import { lights, px, sparkle } from "./env";
import { STAND_F } from "./anim";

const f = (o: Partial<Free>): Free => ({ ...STAND_F, ...o });

/* ------------------------------ büyücü: kütüphane ------------------------------ */
const READ = f({ eF: [3, -12], hF: [6, -14], eB: [-1, -12], hB: [-3, -9] });
const TURN = f({ eF: [4, -14], hF: [8, -17], eB: [-1, -12], hB: [-3, -9] });

// x: ayak noktası; lectern: kürsünün x'i. Dönen değer: tıklanabilir kitap noktası
// dönen: kitap noktası ve isim etiketi için şapkanın tepesi
export function wizard(c: Ctx, x: number, floor: number, t: number, still: boolean): { book: V; head: V } {
  const lx = x + 12;
  // kürsü ve açık kitap
  rect(c, lx - 2, floor - 18, 3, 18, P.woodDk); rect(c, lx - 6, floor - 2, 11, 2, P.woodDk);
  quad(c, [lx - 7, lx + 6, floor - 21], [lx - 6, lx + 7, floor - 18], P.woodLt);
  rect(c, lx - 6, floor - 23, 12, 2, P.cream); rect(c, lx, floor - 23, 1, 2, P.woodDk);
  const cyc = still ? 0 : t % 6;
  const turning = cyc > 4.6 && cyc < 5.4;
  if (turning) rect(c, lx + 4 - Math.round((cyc - 4.6) * 12), floor - 25, 1, 3, "#fffaf0");
  // uzun cübbe: omuzdan ayağa
  quad(c, [x - 3, x + 3, floor - 16], [x - 6, x + 6, floor - 1], P.ink, 1);
  quad(c, [x - 3, x + 3, floor - 16], [x - 6, x + 6, floor - 1], "#7a7684");
  line(c, [x, floor - 14], [x + 2, floor - 2], 1, "#5e5a68");
  const a = drawCharacter(c, { who: "wizard", x, y: floor, dir: 1, pose: turning ? lerpFree(READ, TURN, Math.sin(((cyc - 4.6) / 0.8) * Math.PI)) : READ, outfit: "home", blink: !still && (t % 4.7) < 0.12, hideBody: true });
  // sivri şapka
  const hx = a.head[0], hy = a.head[1];
  quad(c, [hx - 1, hx + 1, hy - 14], [hx - 9, hx + 9, hy + 1], P.ink, 0);
  quad(c, [hx, hx, hy - 13], [hx - 8, hx + 8, hy + 1], "#8a8696");
  rect(c, hx - 9, hy + 1, 19, 2, "#6a6674");
  // asa: arka elde, ucu zaman zaman ışıldar
  const sx = a.handB[0], sy = a.handB[1];
  line(c, [sx, floor], [sx + 1, sy - 16], 1, P.woodDk);
  const glow = still ? 0 : Math.max(0, Math.sin((t % 7) / 7 * Math.PI * 2 - 1));
  px(c, sx + 1, sy - 17, glow > 0.3 ? "#fff6d0" : "#c8b088");
  if (glow > 0.3) lights.push({ x: sx + 1, y: sy - 17, r: 10 + glow * 8, color: "200,220,255" });
  return { book: [lx, floor - 22], head: [hx, hy - 14] };
}

/* ------------------------------ cüce: demirhane ------------------------------ */
const DW = f({ hip: [0, -6], neck: [0, -12], eB: [-1, -9], hB: [-1, -6], eF: [1, -9], hF: [2, -6], kB: [-1, -3], fB: [-2, 0], kF: [1, -3], fF: [2, 0] });
const RAISE = f({ ...DW, eF: [2, -14], hF: [3, -18] });
const STRIKE = f({ ...DW, neck: [1, -12], eF: [4, -10], hF: [7, -8] });
const INSPECT = f({ ...DW, eF: [3, -11], hF: [5, -14] });

export function forge(c: Ctx, x: number, floor: number, t: number, still: boolean): V {
  // taş ocak: içi kızıl
  const ox = x - 26;
  rect(c, ox - 10, floor - 26, 22, 26, P.stone); for (let y = floor - 26; y < floor; y += 5) rect(c, ox - 10, y, 22, 1, P.stoneDk);
  rect(c, ox - 6, floor - 14, 14, 10, "#2a1410");
  const fl = still ? 0 : Math.sin(t * 9) + Math.sin(t * 13);
  rect(c, ox - 5, floor - 9 - Math.round(fl), 12, 5 + Math.round(fl), "#f0a24a"); rect(c, ox - 3, floor - 7, 8, 3, "#ffe08a");
  rect(c, ox - 4, floor - 34, 8, 8, P.stoneDk); // baca
  lights.push({ x: ox + 1, y: floor - 8, r: 26 + fl * 2, color: "255,140,60" });
  // örs, maşa, zırh parçaları
  const ax = x + 10;
  rect(c, ax - 6, floor - 9, 13, 3, "#3a3a44"); rect(c, ax - 3, floor - 6, 6, 6, "#2a2a32"); rect(c, ax + 6, floor - 9, 3, 2, "#3a3a44");
  line(c, [x - 12, floor], [x - 8, floor - 10], 1, "#3a3a44"); line(c, [x - 11, floor], [x - 9, floor - 10], 1, "#3a3a44");
  rect(c, x + 22, floor - 6, 7, 6, "#5e6470"); px(c, x + 24, floor - 5, "#8e95a3"); rect(c, x + 30, floor - 4, 6, 4, "#4a4f5a");

  // döngü: 3 vuruş (her biri 0.8 sn), sonra işi inceleme ve kısa dinlenme
  const cyc = still ? 5 : t % 5.2;
  let pose: Free = DW, hit = -1, inspect = false;
  if (cyc < 2.4) {
    const k = (cyc % 0.8) / 0.8;
    pose = k < 0.55 ? lerpFree(DW, RAISE, k / 0.55) : lerpFree(RAISE, STRIKE, Math.min(1, (k - 0.55) / 0.15));
    if (k > 0.7) hit = (k - 0.7) / 0.3;
  } else if (cyc < 3.8) { pose = INSPECT; inspect = true; }
  const a = drawCharacter(c, { who: "dwarf", x, y: floor, dir: 1, pose, outfit: "home", blink: !still && (t % 3.9) < 0.12 });
  // çekiç
  const h = a.hand;
  line(c, [h[0], h[1]], [h[0] + 2, h[1] - 5], 1, P.woodDk);
  rect(c, h[0], h[1] - 7, 5, 3, "#4a4a54");
  if (inspect) { rect(c, h[0] + 2, h[1] - 3, 4, 3, "#ffb070"); lights.push({ x: h[0] + 4, y: h[1] - 2, r: 6, color: "255,160,90" }); }
  // örse temasla birkaç kıvılcım
  if (hit >= 0) sparkle(c, [ax, floor - 10], hit, "#ffd08a");
  return a.head;
}

/* ------------------------------ elf: okçuluk ------------------------------ */
const BOW_REST = f({ eF: [3, -12], hF: [5, -11], eB: [-1, -12], hB: [-1, -9] });
const DRAW = f({ eF: [5, -15], hF: [9, -15], eB: [2, -15], hB: [0, -15] });

export function archer(c: Ctx, x: number, floor: number, targetX: number, t: number, still: boolean): V {
  // hedef: saman tabla ve iç halkalar
  rect(c, targetX - 1, floor - 22, 2, 22, P.woodDk);
  for (const [r, col] of [[7, P.parch], [5, "#c8463a"], [3, P.parch], [1, "#c8463a"]] as const) {
    for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y) * 0.6); rect(c, targetX - w, floor - 20 + y, w * 2 + 1, 1, col); }
  }
  const cyc = still ? 0.5 : t % 4.2;
  const pull = cyc < 1 ? 0 : cyc < 2 ? (cyc - 1) : cyc < 2.1 ? 1 : 0;
  const pose = lerpFree(BOW_REST, DRAW, cyc < 2.1 ? Math.min(1, cyc) : Math.max(0, 1 - (cyc - 2.1) * 2));
  const a = drawCharacter(c, { who: "elf", x, y: floor, dir: 1, pose, outfit: "home", blink: !still && (t % 5.3) < 0.12 });
  // sivri kulak
  px(c, a.head[0] - 2, a.head[1] + 5, "#f2d8c0"); px(c, a.head[0] - 3, a.head[1] + 4, "#f2d8c0");
  // yay: öndeki elde, kiriş çekilen ele doğru gerilir
  const bh = a.hand;
  for (let i = -7; i <= 7; i++) px(c, bh[0] + 1 - Math.round((1 - (i * i) / 49) * 3), bh[1] + i, P.woodLt);
  const sxp = bh[0] - Math.round(pull * 6) - 1;
  line(c, [bh[0] + 1, bh[1] - 7], [sxp, bh[1]], 1, "#e8e0f0");
  line(c, [sxp, bh[1]], [bh[0] + 1, bh[1] + 7], 1, "#e8e0f0");
  if (pull > 0 && cyc < 2.1) line(c, [sxp, bh[1]], [bh[0] + 4, bh[1]], 1, P.woodDk); // nişan alınmış ok
  // uçan ok ve hedefte biriken oklar
  if (cyc >= 2.1 && cyc < 2.5) {
    const k = (cyc - 2.1) / 0.4;
    const ax = Math.round(bh[0] + (targetX - 2 - bh[0]) * k), ay = Math.round(bh[1] + (floor - 20 - bh[1]) * k - Math.sin(k * Math.PI) * 3);
    line(c, [ax - 4, ay], [ax, ay], 1, P.woodDk); px(c, ax + 1, ay, "#c8ccd8"); px(c, ax - 4, ay - 1, "#c8463a");
  }
  const stuck = still ? 2 : Math.min(3, Math.floor(t / 4.2) % 4 + (cyc >= 2.5 ? 1 : 0));
  for (let i = 0; i < stuck; i++) { line(c, [targetX - 5, floor - 21 + i * 2 - 1], [targetX - 1, floor - 20 + i * 2 - 1], 1, P.woodDk); px(c, targetX - 6, floor - 22 + i * 2, "#c8463a"); }
  return a.head;
}

/* ------------------------------ nöbetçi: şato kapısı ------------------------------ */
// Siyah deri, kürk yakalı pelerin, belde kılıç. Nefes alır, etrafı kolaçan eder; yanından geçilirken başıyla selam verir.
export function guard(c: Ctx, x: number, floor: number, passX: number, t: number, still: boolean): V {
  const breathe = still ? 0 : Math.round((Math.sin(t * 1.5) + 1) / 2);
  const near = Math.abs(passX - x) < 50;
  const nod = near && !still ? Math.max(0, Math.sin(t * 3)) : 0;
  const look = !near && !still && Math.floor(t / 4.5) % 3 === 1 ? 1 : -1;
  const pose = f({ hip: [0, -9 - breathe], neck: [nod > 0.5 ? -1 : 0, -16 - breathe + (nod > 0.5 ? 1 : 0)], eF: [1, -12], hF: [2, -9], eB: [-1, -12], hB: [-1, -9] });
  // pelerin: rüzgârda ucu savrulur
  const sway = still ? 0 : Math.round(Math.sin(t * 1.3) * 1.5 + Math.sin(t * 2.7));
  const neckY = floor - 16 - breathe;
  quad(c, [x - 1, x + 3, neckY + 1], [x + 3 + sway, x + 8 + sway, floor - 2], P.ink, 1);
  quad(c, [x - 1, x + 3, neckY + 1], [x + 3 + sway, x + 8 + sway, floor - 2], "#141016");
  const a = drawCharacter(c, { who: "jon", x, y: floor, dir: -1, pose, outfit: "home", headDir: look as 1 | -1, blink: !still && (t % 4.4) < 0.12 });
  // kürk yaka
  for (let i = -3; i <= 3; i++) px(c, x + i, neckY + (Math.abs(i) > 2 ? 1 : 0), i % 2 ? "#6a5a4a" : "#8a7a68");
  // kınında kılıç
  line(c, [x + 1, floor - 9], [x + 6, floor - 2], 1, "#2a2026");
  line(c, [x - 1, floor - 11], [x + 2, floor - 8], 1, "#a8acb8");
  return a.head;
}

/* ------------------------------ ejderha ve binicisi ------------------------------ */
// Yerel koordinatta (sağa bakan, y yukarı negatif) çizilir; x,y gövde merkezi, s büyüklük.
// Her parça önce koyu dış çizgiyle, sonra renkle doldurulur. Kanatlar kemik çubuklu yarasa zarı, çırpışla açı değiştirir.
const DR = { ink: "#140a10", body: "#6a1e28", shade: "#4a121c", light: "#8e3438", belly: "#c8784a", bellyDk: "#a05a38", wing: "#7e2632", wingFar: "#4a141e", bone: "#2a0e14", horn: "#d8c8a8", eye: "#ffc040" };

export function dragon(c: Ctx, x: number, y: number, s: number, t: number, still: boolean): V {
  const f = still ? 0.2 : Math.sin(t * 4.6); // -1 aşağı çırpış, 1 yukarı
  const sway = still ? 0 : Math.sin(t * 2.3);
  const P2 = (lx: number, ly: number): V => [Math.round(x + lx * s), Math.round(y + ly * s)];
  const shape = (pts: [number, number][], col: string, outline = true) => {
    const q = pts.map(([a, b]) => P2(a, b));
    if (outline) poly(c, q, DR.ink, 1);
    poly(c, q, col);
  };
  const wing = (rootA: [number, number], rootB: [number, number], lift: number, col: string) => {
    // dirsek ve üç parmak ucu; zar uçlar arasında dalgalı kenarla kapanır
    const wx = rootA[0] - 4, wy = rootA[1] - 10 - 9 * lift;
    const tips: [number, number][] = [
      [wx - 16, wy - 4 - 6 * lift],
      [wx - 20, wy + 6 - 2 * lift],
      [wx - 14, wy + 14 + 4 * lift],
    ];
    const edge: [number, number][] = [];
    for (let i = 0; i < tips.length; i++) {
      edge.push(tips[i]);
      const nx = i + 1 < tips.length ? tips[i + 1] : rootB;
      edge.push([(tips[i][0] + nx[0]) / 2 + 2, (tips[i][1] + nx[1]) / 2 - 1]); // zarın içe kıvrımı
    }
    shape([rootA, [wx, wy], ...edge, rootB], col);
    for (const tp of tips) line(c, P2(wx, wy), P2(tp[0], tp[1]), 1, DR.bone);
    line(c, P2(rootA[0], rootA[1]), P2(wx, wy), Math.max(1, Math.round(s)), DR.bone);
    px(c, ...P2(wx, wy), DR.horn); // dirsek pençesi
  };

  // uzak kanat (gövdenin arkasında, koyu)
  wing([4, -5], [-8, -3], f * 0.85, DR.wingFar);
  // kuyruk: incelen eğri, ucunda kürek
  const tail: [number, number][] = [];
  const back: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8, tx = -13 - k * 30, ty = 1 + Math.sin(k * 3 + t * 2.4) * 3 * k + k * 3, w = 3.5 * (1 - k) + 0.6;
    tail.push([tx, ty - w]); back.unshift([tx, ty + w]);
  }
  shape([...tail, ...back], DR.body);
  const tip = tail[tail.length - 1];
  shape([[tip[0] + 1, tip[1] - 1], [tip[0] - 5, tip[1] - 3], [tip[0] - 6, tip[1] + 2], [tip[0] + 1, tip[1] + 3]], DR.shade);
  // arka bacak, pençeler
  shape([[-7, 3], [-3, 4], [-6, 10], [-10, 11], [-11, 9]], DR.shade);
  for (const k of [-12, -10, -8]) px(c, ...P2(k, 11), DR.horn);
  // gövde
  shape([[-15, 0], [-10, -5], [0, -7], [9, -6], [14, -3], [15, 1], [10, 5], [0, 6], [-10, 4]], DR.body);
  // karın plakaları
  for (let lx = -9; lx <= 11; lx += 3) { const [bx, by] = P2(lx, 4); rect(c, bx, by, Math.max(2, Math.round(2 * s)), Math.max(1, Math.round(s)), DR.belly); rect(c, bx, by + Math.max(1, Math.round(s)), Math.max(2, Math.round(2 * s)), 1, DR.bellyDk); }
  // pullar ve sırt dikenleri
  for (let lx = -12; lx <= 10; lx += 3) { px(c, ...P2(lx, -3), DR.light); px(c, ...P2(lx + 1, 0), DR.shade); }
  for (let lx = -12; lx <= 8; lx += 4) shape([[lx, -5 + (lx > 0 ? -1 : 0)], [lx + 1.5, -9 + (lx > 0 ? -1 : 0)], [lx + 3, -5 + (lx > 0 ? -1 : 0)]], DR.shade, false);
  // ön bacak
  shape([[9, 3], [12, 4], [11, 8], [8, 8]], DR.shade);
  // kavisli boyun
  const hy = -15 + sway;
  shape([[10, -5], [13, -11], [18, hy + 1], [22, hy - 1], [24, hy + 3], [19, hy + 5], [16, -4], [14, 2]], DR.body);
  for (let k = 0; k < 4; k++) px(c, ...P2(14 + k * 2, -8 - k * 1.6 + sway * 0.5), DR.belly);
  // kafa: alın, burun, çene, boynuz, göz
  shape([[21, hy - 3], [27, hy - 3], [33, hy], [32, hy + 2], [27, hy + 2], [24, hy + 4], [21, hy + 2]], DR.body);
  line(c, P2(26, hy + 1), P2(32, hy + 1), 1, DR.ink);
  shape([[22, hy - 3], [17, hy - 7], [20, hy - 3]], DR.horn);
  shape([[24, hy - 3], [21, hy - 6], [25, hy - 3]], DR.horn);
  px(c, ...P2(27, hy - 1), DR.eye);
  // burun deliğinden kıvılcım ve duman
  if (!still) for (let i = 0; i < 3; i++) { const k = (t * 1.5 + i / 3) % 1; px(c, ...P2(34 + k * 5, hy + 0.5 - k * 2), `rgba(${k < 0.4 ? "255,180,90" : "200,190,200"},${(1 - k).toFixed(2)})`); }

  // binici: koyu kıyafet, arkaya savrulan pelerin, uzun örgülü gümüş saç
  const rx = 4, ry = -8;
  const flow = still ? 0 : Math.sin(t * 6) * 1.5;
  shape([[rx - 1, ry - 4], [rx - 12, ry - 2 + flow], [rx - 13, ry + 2 + flow], [rx - 1, ry + 1]], "#2a1830");
  shape([[rx - 2, ry - 6], [rx + 2, ry - 6], [rx + 3, ry + 1], [rx - 2, ry + 1]], "#1a1420");
  line(c, P2(rx + 2, ry - 4), P2(rx + 6, ry - 2), Math.max(1, Math.round(s)), "#1a1420"); // dizgine uzanan kol
  shape([[rx - 2, ry - 11], [rx + 2, ry - 11], [rx + 2, ry - 7], [rx - 2, ry - 7]], "#f2d8c0");
  shape([[rx - 3, ry - 12], [rx + 2, ry - 12], [rx + 2, ry - 10], [rx - 1, ry - 10], [rx - 3, ry - 7]], "#ecebf4");
  for (let i = 1; i <= 6; i++) px(c, ...P2(rx - 3 - i * 1.4, ry - 10 + i * 0.5 + Math.sin(t * 6 + i) * 0.6 * (still ? 0 : 1)), i % 2 ? "#ecebf4" : "#c8c6d8");
  px(c, ...P2(rx + 1, ry - 9), "#2a1c3a");

  // yakın kanat en üstte
  wing([6, -5], [-6, -4], f, DR.wing);
  return P2(rx, ry - 14);
}
