// Gelişim'de yürüyen küçük karakterin üstüne giydirme ekranındaki kombinin ayrıntıları: şapka, gözlük, kulaklık,
// küpe, kolye, atkı, çanta, kemer, açık ceketin içi, kapüşon, crop, kolsuz, şort ve etekte bacak, bot, topuklu, desen.
// Renkler (üst, alt, ayakkabı, etek, saç) karakterin kendi paletinden gelir (lib/outfit worldTint).
import type { SpriteWear } from "./outfit";
import { type Anchors, type Ctx, type V, P, line, px, rect } from "./pixel";

const SKIN = { cengiz: "#efc4a2", aysenur: "#f5d2bd" } as const;
const lerp = (a: V, b: V, k: number): V => [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k)];
const darken = (c: string) => { const n = parseInt(c.slice(1), 16); return `rgb(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * 0.7)).join(",")})`; };

/** drawCharacter'dan dönen eklemlerle; dir: baktığı yön; lying: uzanırken baştaki ayrıntılar çizilmez */
export function drawWear(c: Ctx, a: Anchors, dir: 1 | -1, w: SpriteWear, who: "cengiz" | "aysenur", t: number, o: { lying?: boolean; shoe: string; top: string } ) {
  const J = a.j; if (!J) return;
  const skin = SKIN[who], d = dir, [hx, top] = a.head;
  const { neck, hip } = J;

  /* ---------- gövde ---------- */
  if (w.sleeveless) for (const [e, h] of [[J.eF, J.hF]] as [V, V][]) { line(c, [neck[0], neck[1] + 1], e, 2, skin); line(c, e, h, 2, skin); }
  if (w.pattern) {
    for (let k = 0; k < 6; k++) {
      const [x, y] = lerp([neck[0], neck[1] + 1], hip, 0.15 + k * 0.14);
      if (w.pattern.kind === "cizgili" && k % 2 === 0) rect(c, x - 2, y, 5, 1, w.pattern.color);
      else if (w.pattern.kind === "kareli") { px(c, x - 2 + (k % 2) * 2, y, w.pattern.color); px(c, x + 1 - (k % 2) * 2, y, w.pattern.color); }
      else if (w.pattern.kind === "puantiyeli" && k % 2) px(c, x + (k % 4 === 1 ? -1 : 1), y, w.pattern.color);
    }
  }
  if (w.inner) line(c, [neck[0] + d, neck[1] + 2], [hip[0] + d, hip[1] - 1], 1, w.inner); // önü açık ceketin içi
  if (w.hood) rect(c, neck[0] - d * 3 - 1, neck[1] - 1, 3, 3, w.hood);
  if (w.crop) rect(c, hip[0] - 2, hip[1] - 3, 5, 2, skin);
  if (w.belt) rect(c, hip[0] - 2, hip[1] - 1, 5, 1, w.belt);
  if (w.backpack) { rect(c, neck[0] - d * 4 - 1, neck[1] + 1, 3, 6, P.ink); rect(c, neck[0] - d * 4, neck[1] + 2, 1 + 0, 4, w.backpack); line(c, [neck[0] - d, neck[1] + 1], [neck[0] - d, neck[1] + 5], 1, darken(w.backpack)); }
  if (w.bag) { line(c, [neck[0] - d * 2, neck[1] + 1], [hip[0] + d * 3, hip[1]], 1, darken(w.bag)); rect(c, hip[0] + d * 3 - 1, hip[1] - 1, 3, 3, P.ink); px(c, hip[0] + d * 3, hip[1], w.bag); }
  if (w.scarf) { rect(c, neck[0] - 2, neck[1], 5, 2, w.scarf); rect(c, neck[0] - d, neck[1] + 2, 1, 4, w.scarf); }
  if (w.necklace && !w.scarf) { px(c, neck[0] + d, neck[1] + 2, w.necklace); px(c, neck[0], neck[1] + 3, w.necklace); }

  /* ---------- bacaklar ve ayakkabı ---------- */
  for (const [k, f] of [[J.kB, J.fB], [J.kF, J.fF]] as [V, V][]) {
    if (w.legs === "sort") line(c, lerp(k, f, 0.15), f, 2, skin);
    else if (w.legs === "mini") { line(c, lerp(hip, k, 0.55), k, 2, skin); line(c, k, f, 2, skin); }
    else if (w.legs === "midi") line(c, lerp(k, f, 0.45), f, 2, skin);
    if (w.boots) { const hgt = w.boots === "cizme" ? 6 : w.boots === "bot" ? 4 : 3; rect(c, f[0] - 1, f[1] - hgt, 3, hgt, o.shoe); if (w.boots === "converse") px(c, f[0] + d, f[1] - 1, "#f2ede4"); }
    if (w.heels) { px(c, f[0] - d, f[1] + 1, darken(o.shoe)); px(c, f[0] + d, f[1], o.shoe); }
  }

  /* ---------- baş (uzanırken yok) ---------- */
  if (o.lying) return;
  const eyeX = d > 0 ? hx + 2 : hx - 4, eyeY = top + 6, earX = d > 0 ? hx - 3 : hx + 2;
  if (w.earrings) px(c, earX + (d > 0 ? 0 : 1), top + 9, w.earrings);
  if (w.glasses) {
    const fr = w.glasses === "gunes" ? P.ink : "#3a2a20";
    rect(c, eyeX - 1, eyeY - 1, 4, 1, fr); rect(c, d > 0 ? eyeX - 4 : eyeX + 3, eyeY - 1, 3, 1, fr);
    if (w.glasses === "gunes") rect(c, eyeX, eyeY, 2, 2, "#1a1426"); else { px(c, eyeX - 1, eyeY, fr); px(c, eyeX + 2, eyeY, fr); }
  }
  if (w.headphones) { rect(c, hx - 5, top - 1, 10, 1, P.ink); px(c, hx - 4, top - 1, w.headphones); rect(c, earX - 1, top + 5, 3, 4, P.ink); rect(c, earX, top + 6, 1, 2, w.headphones); }
  if (w.hat) {
    const col = w.hat.color, dk = darken(col);
    if (w.hat.kind === "bere") { rect(c, hx - 6, top - 1, 12, 5, P.ink); rect(c, hx - 5, top - 1, 10, 3, col); rect(c, hx - 5, top + 2, 10, 1, dk); px(c, hx, top - 2, col); px(c, hx, top - 3, P.ink); }
    else if (w.hat.kind === "sapka") { rect(c, hx - 8, top + 3, 16, 1, P.ink); rect(c, hx - 7, top + 3, 14, 1, col); rect(c, hx - 5, top - 2, 10, 5, P.ink); rect(c, hx - 4, top - 1, 8, 4, col); rect(c, hx - 4, top + 2, 8, 1, dk); }
    else { rect(c, hx - 6, top - 1, 12, 4, P.ink); rect(c, hx - 5, top, 10, 3, col); rect(c, d > 0 ? hx + 5 : hx - 9, top + 2, 4, 1, dk); }
  }
  if (w.bow) { px(c, hx + d * 4, top, w.bow); px(c, hx + d * 6, top, w.bow); px(c, hx + d * 5, top + 1, darken(w.bow)); }
  if (w.scent) for (let k = 0; k < 3; k++) { const q = (t * 0.4 + k / 3) % 1; px(c, Math.round(hx + 8 * -d + Math.sin(q * 6 + k) * 2), Math.round(top + 14 - q * 16), `rgba(240,180,210,${(1 - q).toFixed(2)})`); }
  void o.top;
}
