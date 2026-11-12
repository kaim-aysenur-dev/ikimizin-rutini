// Gölgeli piksel boyama: şekiller maske olarak verilir, her biri kendi tonunda dış çizgi (sel-out), sağ-altta gölge,
// sol-üstte ışıkla boyanır. Sonuç tek seferde tuvale basılır (karakter portresi ve giydirme bebeği).
export type RGB = [number, number, number];
export type Mask = (x: number, y: number) => boolean;

export function rgb(c: string): RGB {
  if (c[0] === "#") { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m = c.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0];
  return [m[0], m[1], m[2]];
}
export const mixRGB = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const INK: RGB = [20, 12, 30], WARM: RGB = [255, 244, 224];
export const darkOf = (c: RGB, k = 0.3) => mixRGB(c, INK, k);
export const lightOf = (c: RGB, k = 0.2) => mixRGB(c, WARM, k);

export type LayerOpts = {
  out?: RGB | null; // dış çizgi; null: çizgisiz (iç parçalar)
  dark?: RGB; light?: RGB;
  shade?: number; // gölgenin kalınlığı (piksel)
  flat?: boolean; // gölgesiz düz boya
};

export class Raster {
  readonly data: Uint8ClampedArray;
  readonly w: number;
  readonly h: number;
  constructor(w: number, h: number) { this.w = w; this.h = h; this.data = new Uint8ClampedArray(w * h * 4); }

  set(x: number, y: number, c: RGB, a = 1) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, d = this.data;
    if (a >= 1) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; return; }
    d[i] = d[i] + (c[0] - d[i]) * a; d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * a; d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * a; d[i + 3] = 255;
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, a = 1) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c, a); }
  disc(cx: number, cy: number, r: number, c: RGB, a = 1) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.set(cx + x, cy + y, c, a); }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) this.set(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, c, a);
  }

  /** maskeyi gölgeli boyar; box: [x0, y0, x1, y1] tarama sınırı */
  layer(m: Mask, box: [number, number, number, number], base: RGB, o: LayerOpts = {}) {
    const [x0, y0, x1, y1] = box.map(Math.round), W = x1 - x0 + 5, H = y1 - y0 + 5;
    const g = new Uint8Array(W * H);
    for (let y = y0 - 2; y <= y1 + 2; y++) for (let x = x0 - 2; x <= x1 + 2; x++) if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && m(x, y)) g[(y - y0 + 2) * W + (x - x0 + 2)] = 1;
    const at = (x: number, y: number) => { const gx = x - x0 + 2, gy = y - y0 + 2; return gx >= 0 && gy >= 0 && gx < W && gy < H && g[gy * W + gx] === 1; };
    const dk = o.dark ?? darkOf(base), lt = o.light ?? lightOf(base), sh = o.shade ?? 2;
    const out = o.out === undefined ? darkOf(base, 0.62) : o.out;
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (at(x, y)) {
        if (o.flat) { this.set(x, y, base); continue; }
        let c = base;
        if (!at(x + 1, y) || !at(x, y + 1)) c = dk;
        else if (sh > 1 && (!at(x + 2, y) || !at(x, y + 2))) c = mixRGB(base, dk, 0.55);
        else if (!at(x - 1, y) || !at(x, y - 1)) c = lt;
        this.set(x, y, c);
      } else if (out && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) this.set(x, y, out);
    }
  }

  /** tuvale basar (tuvalin dünya pikseli boyutunda) */
  blit(c: CanvasRenderingContext2D) {
    const img = c.createImageData(this.w, this.h);
    img.data.set(this.data);
    c.putImageData(img, 0, 0);
  }
}
