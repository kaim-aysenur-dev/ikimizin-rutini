// Giydirme bebeği: karakterin büyük çiziminin (lib/figure) tamamı, baştan ayağa.
import type { CareState } from "./care";
import { FIG_W, type FigureFx, drawFigure } from "./figure";
import type { Outfit, Who } from "./outfit";
import { Raster } from "./raster";

export const DOLL_SIZE: [number, number] = [FIG_W, 178];

export function drawDoll(c: CanvasRenderingContext2D, w: number, h: number, t: number, o: { who: Who; outfit: Outfit; state: CareState | null; fx: FigureFx[] }) {
  const R = new Raster(w, h);
  drawFigure(R, t, { ...o, full: true });
  R.blit(c);
}
