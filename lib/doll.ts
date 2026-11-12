// Giydirme bebeği: tam boy, ön cephe, 64x124 dünya pikseli. Baş portreden gelir (cilt durumu, ruj, küpe, gözlük...),
// gövde, kollar, alt giyim ve ayakkabı burada çizilir. Kıyafet türleri lib/outfit'te.
import type { CareState } from "./care";
import { type Outfit, dark, portraitLook } from "./outfit";
import { type Ctx, P, line, px, rect } from "./pixel";
import { type PortraitFx, drawPortrait, mix } from "./portrait";

export const DOLL_SIZE: [number, number] = [64, 124];
const CX = 32;
const SKIN = { cengiz: ["#efc4a2", "#d49b7a"], aysenur: ["#f5d2bd", "#dcab92"] } as const;

/** gövdenin o satırdaki yarım genişliği: omuz, göğüs, bel, kalça */
const torsoHalf = (y: number) => (y < 60 ? 12 : y < 70 ? 11 : y < 79 ? 10 - Math.round((y - 70) / 9) : 10);

export function drawDoll(c: Ctx, w: number, h: number, t: number, o: { who: "cengiz" | "aysenur"; outfit: Outfit; state: CareState | null; fx: PortraitFx[] }) {
  const look = portraitLook(o.outfit);
  drawPortrait(c, w, h, t, { who: o.who, state: o.state, look, fx: o.fx, body: (cc) => drawBody(cc, o.who, o.outfit, t) });
}

function drawBody(c: Ctx, who: "cengiz" | "aysenur", of: Outfit, t: number) {
  const [skin, skinDk] = SKIN[who];
  const top = of.top, topDk = dark(top.color), bottom = of.bottom;
  const sleeve = top.kind === "askili" ? 0 : top.kind === "tisort" || top.kind === "crop" || top.kind === "elbise" ? 7 : 24; // kol boyu
  const topEnd = top.kind === "crop" ? 70 : 80;

  // zemin gölgesi
  rect(c, CX - 14, 113, 28, 2, "rgba(0,0,0,0.35)");

  /* ---------- bacaklar (alttan üste: önce ten) ---------- */
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? CX - 8 : CX + 2;
    rect(c, x0 - 1, 80, 8, 28, P.ink); rect(c, x0, 80, 6, 28, skin); rect(c, x0 + (side < 0 ? 4 : 0), 80, 2, 28, skinDk);
  }

  /* ---------- alt giyim ---------- */
  if (bottom && (bottom.kind === "jean" || bottom.kind === "pantolon" || bottom.kind === "esofman" || bottom.kind === "sort")) {
    const end = bottom.kind === "sort" ? 90 : 106;
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? CX - 9 : CX + 1;
      rect(c, x0 - 1, 79, 10, end - 79 + 1, P.ink); rect(c, x0, 79, 8, end - 79, bottom.color);
      rect(c, x0 + (side < 0 ? 6 : 0), 79, 2, end - 79, dark(bottom.color));
      if (bottom.kind === "jean") { line(c, [x0 + (side < 0 ? 5 : 2), 81], [x0 + (side < 0 ? 5 : 2), end - 1], 1, mix(bottom.color, "#ffffff", 0.25)); px(c, x0 + 3, 84, mix(bottom.color, "#ffffff", 0.35)); }
      if (bottom.kind === "esofman") { rect(c, side < 0 ? x0 : x0 + 7, 80, 1, end - 81, "#f2ede4"); rect(c, x0, end - 3, 8, 3, dark(bottom.color)); }
    }
    px(c, CX, 85, P.ink); rect(c, CX - 9, 79, 18, 2, dark(bottom.color)); // bel
    if (bottom.kind === "jean") px(c, CX, 80, "#c89a3e");
  }

  /* ---------- ayakkabı ---------- */
  const sh = of.shoes;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? CX - 10 : CX + 2;
    if (sh.kind === "bot") { rect(c, x0 - 1, 97, 10, 15, P.ink); rect(c, x0, 98, 8, 13, sh.color); rect(c, x0, 109, 8, 2, dark(sh.color)); }
    else if (sh.kind === "topuklu") {
      rect(c, x0, 106, 9, 5, P.ink); rect(c, x0 + 1, 107, 7, 3, sh.color); rect(c, side < 0 ? x0 + 7 : x0 + 1, 110, 1, 3, P.ink); px(c, x0 + 3, 107, mix(sh.color, "#ffffff", 0.4));
    } else if (sh.kind === "babet") { rect(c, x0 - 1, 107, 10, 5, P.ink); rect(c, x0, 108, 8, 3, sh.color); px(c, x0 + 3, 108, "#f2ede4"); }
    else if (sh.kind === "mokasen") { rect(c, x0 - 1, 106, 10, 6, P.ink); rect(c, x0, 107, 8, 4, sh.color); rect(c, x0 + 2, 107, 4, 1, dark(sh.color)); }
    else { // spor ayakkabı: renkli gövde, beyaz taban
      rect(c, x0 - 1, 105, 10, 7, P.ink); rect(c, x0, 106, 8, 4, sh.color); rect(c, x0, 110, 8, 1, "#f2ede4"); rect(c, x0 + 2, 107, 4, 1, mix(sh.color, "#000000", 0.3));
    }
  }

  /* ---------- etek / elbise eteği ---------- */
  const skirtOf = top.kind === "elbise" ? { end: 98, color: top.color } : bottom?.kind === "etek" ? { end: 93, color: bottom.color } : bottom?.kind === "uzun-etek" ? { end: 106, color: bottom.color } : null;
  if (skirtOf) {
    for (let y = 78; y <= skirtOf.end; y++) {
      const half = Math.round(10 + ((y - 78) / (skirtOf.end - 78)) * 5);
      rect(c, CX - half - 1, y, 2 * half + 2, 1, P.ink);
      rect(c, CX - half, y, 2 * half, 1, (y - 78) % 6 === 5 ? dark(skirtOf.color) : skirtOf.color);
    }
    for (let x = CX - 12; x <= CX + 12; x += 4) rect(c, x, skirtOf.end - 6, 1, 6, dark(skirtOf.color)); // kıvrımlar
  }

  /* ---------- kollar ---------- */
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? CX - 16 : CX + 13;
    rect(c, x0 - 1, 58, 5, 30, P.ink);
    rect(c, x0, 59, 3, 24, skin); rect(c, x0, 83, 3, 3, skin); px(c, x0 + (side < 0 ? 0 : 2), 85, skinDk); // el
    if (sleeve) { rect(c, x0, 59, 3, sleeve, top.kind === "ceket" ? top.color : top.color); rect(c, x0 + (side < 0 ? 0 : 2), 59, 1, sleeve, topDk); if (sleeve > 20) rect(c, x0, 59 + sleeve - 2, 3, 2, topDk); }
  }

  /* ---------- üst giyim ---------- */
  for (let y = 56; y < topEnd; y++) { const half = torsoHalf(y); rect(c, CX - half - 1, y, 2 * half + 2, 1, P.ink); rect(c, CX - half, y, 2 * half, 1, top.color); rect(c, CX + half - 2, y, 2, 1, topDk); }
  if (top.kind === "crop") { for (let y = 70; y < 80; y++) { const half = torsoHalf(y); rect(c, CX - half - 1, y, 2 * half + 2, 1, P.ink); rect(c, CX - half, y, 2 * half, 1, skin); } px(c, CX, 75, skinDk); rect(c, CX - 10, 69, 20, 1, topDk); }
  switch (top.kind) {
    case "askili": for (let y = 56; y < 62; y++) { const half = torsoHalf(y); rect(c, CX - half, y, 2 * half, 1, skin); } for (const x of [CX - 8, CX + 6]) rect(c, x, 56, 2, 6, top.color); rect(c, CX - 11, 62, 22, 1, topDk); break;
    case "gomlek": rect(c, CX - 3, 56, 6, 3, skin); for (const x of [CX - 8, CX + 3]) rect(c, x, 56, 5, 3, mix(top.color, "#ffffff", 0.45)); for (let y = 61; y < 79; y += 4) px(c, CX, y, mix(top.color, "#ffffff", 0.5)); rect(c, CX - 7, 64, 4, 3, topDk); break;
    case "kazak": rect(c, CX - 5, 56, 10, 2, skin); rect(c, CX - 6, 58, 12, 1, topDk); for (let y = 62; y < 80; y += 3) for (let x = CX - 9; x < CX + 9; x += 2) px(c, x, y, topDk); rect(c, CX - 10, 78, 20, 2, topDk); break;
    case "balikci": for (let y = 62; y < 80; y += 3) for (let x = CX - 9; x < CX + 9; x += 2) px(c, x, y, topDk); rect(c, CX - 10, 78, 20, 2, topDk); break;
    case "hoodie": rect(c, CX - 10, 56, 20, 2, topDk); rect(c, CX - 4, 56, 8, 2, skinDk); line(c, [CX - 3, 58], [CX - 3, 66], 1, "#f2ede4"); line(c, [CX + 2, 58], [CX + 2, 66], 1, "#f2ede4"); rect(c, CX - 6, 70, 12, 6, topDk); rect(c, CX - 10, 78, 20, 2, topDk); break;
    case "tisort": case "crop": rect(c, CX - 5, 56, 10, 2, skin); rect(c, CX - 6, 58, 12, 1, topDk); break;
    case "ceket": {
      const inner = top.inner ?? "#f2ede4";
      for (let y = 56; y < 80; y++) rect(c, CX - 3, y, 6, 1, inner);
      line(c, [CX - 7, 56], [CX - 3, 66], 1, topDk); line(c, [CX + 6, 56], [CX + 2, 66], 1, topDk);
      px(c, CX - 4, 70, "#c89a3e"); px(c, CX - 4, 74, "#c89a3e"); rect(c, CX - 9, 72, 4, 1, topDk); rect(c, CX + 5, 72, 4, 1, topDk);
      break;
    }
    case "elbise": for (let y = 56; y < 62; y++) { const half = Math.max(0, 6 - (y - 56)); rect(c, CX - half, y, 2 * half, 1, skin); } line(c, [CX - 7, 56], [CX, 62], 1, topDk); line(c, [CX + 6, 56], [CX, 62], 1, topDk); rect(c, CX - 10, 77, 20, 2, topDk); break;
  }

  /* ---------- gövdedeki aksesuarlar ---------- */
  for (const a of of.acc) {
    if (a.kind === "canta") { line(c, [CX - 10, 57], [CX + 12, 80], 1, dark(a.color)); rect(c, CX + 10, 79, 8, 8, P.ink); rect(c, CX + 11, 80, 6, 6, a.color); rect(c, CX + 11, 80, 6, 1, dark(a.color)); px(c, CX + 14, 82, "#c89a3e"); }
    if (a.kind === "saat") { rect(c, CX + 13, 80, 3, 2, P.ink); px(c, CX + 14, 80, a.color === "#24202a" ? "#c8ccd8" : a.color); }
    if (a.kind === "bileklik") { rect(c, CX - 16, 81, 3, 1, a.color); if (Math.floor(t * 2) % 4 === 0) px(c, CX - 15, 81, "#ffffff"); }
  }
}
