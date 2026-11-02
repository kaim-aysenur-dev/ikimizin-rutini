// Hikâyenin sırası ve tek karelik çizim: sahne + gün saatine göre karartma + ışıklar + vinyet.
// Sahneler arasında kararma yok: iki oda yan yana çizilir ve kamera kapıdan kesintisiz kayar.
import type { Ctx, V } from "./pixel";
import { ambient, lights } from "./env";
import { lightning, stormLevel, weather } from "./weather";
import { opening } from "./scenes/opening";
import { sport } from "./scenes/sport";
import { journey } from "./scenes/journey";
import { dining } from "./scenes/dining";
import { bath } from "./scenes/bath";
import { library } from "./scenes/library";
import { coffee, finale } from "./scenes/hearth";
import type { SceneOut } from "./scenes/types";

export const SCENES = [opening, sport, journey, dining, bath, library, coffee, finale];
// sahnelerin dünya genişliği: geçişte bir sonraki oda bu kenara bitişik çizilir
export const WIDTHS: Record<string, number> = { acilis: 336, spor: 300, yolculuk: 760, yemek: 300, banyo: 300, kutuphane: 300, somine: 300, final: 300 };
// aynı odada devam eden sahneler kaymadan birbirine bağlanır
export const SAME_ROOM = new Set(["somine>final"]);

export type Tag = { who: string; x: number; y: number }; // ekran (dünya pikseli) koordinatı

export function renderScene(c: Ctx, index: number, p: number, view: V, t: number, still: boolean): SceneOut {
  lights.length = 0;
  weather.t = t; weather.still = still;
  const out = SCENES[index].render({ c, p, view, t, still });
  weather.storm = stormLevel(out.tod);
  // azaltılmış harekette şimşek yok: ışık sabit kalır
  weather.flash = still ? 0 : lightning(t, weather.storm);

  const amb = ambient(out.tod);
  if (amb) { c.fillStyle = amb; c.fillRect(0, 0, view[0], view[1]); }

  // mum, fener ve ateş ışıkları karartmanın üstüne eklenir
  const night = out.tod > 0.6 ? 1 : 0.55;
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const l of lights) {
    const x = l.x - out.cam[0], y = l.y - out.cam[1];
    const g = c.createRadialGradient(x, y, 0, x, y, l.r);
    g.addColorStop(0, `rgba(${l.color},${(0.22 * night).toFixed(3)})`);
    g.addColorStop(1, `rgba(${l.color},0)`);
    c.fillStyle = g;
    c.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
  }
  c.restore();
  // şimşek: pencerelerden giren soğuk ışık içeriyi de kısa süre aydınlatır
  if (weather.flash > 0) { c.fillStyle = `rgba(200,215,255,${(0.14 * weather.flash).toFixed(3)})`; c.fillRect(0, 0, view[0], view[1]); }
  return out;
}

export function vignette(c: Ctx, view: V) {
  const v = c.createRadialGradient(view[0] / 2, view[1] / 2, Math.min(view[0], view[1]) * 0.35, view[0] / 2, view[1] / 2, Math.max(view[0], view[1]) * 0.75);
  v.addColorStop(0, "rgba(20,26,51,0)");
  v.addColorStop(1, "rgba(20,26,51,0.5)");
  c.fillStyle = v;
  c.fillRect(0, 0, view[0], view[1]);
}

export const tagsOf = (out: SceneOut, dx = 0): Tag[] =>
  out.actors.map((a) => ({ who: a.who, x: a.anchors.head[0] - out.cam[0] + dx, y: a.anchors.head[1] - out.cam[1] - 3 }));
