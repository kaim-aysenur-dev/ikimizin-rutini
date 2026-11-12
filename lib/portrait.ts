// Yakın plan portre: karakterin büyük çiziminin (lib/figure) baştan göğse kadar olan kısmı.
// Cilt aynası ve çalışma panelindeki zihin aynası kullanır.
import type { CareState } from "./care";
import { FIG_W, type FigureFx, drawFigure } from "./figure";
import type { Outfit, Who } from "./outfit";
import { Raster } from "./raster";

export const PORTRAIT_SIZE: [number, number] = [FIG_W, 86];
export type PortraitFx = FigureFx;
export type PortraitOpts = { who: Who; state: CareState | null; outfit: Outfit; fx: PortraitFx[]; focus?: boolean };

export function drawPortrait(c: CanvasRenderingContext2D, w: number, h: number, t: number, o: PortraitOpts) {
  const R = new Raster(w, h);
  drawFigure(R, t, { ...o, full: false });
  R.blit(c);
}
