import type { Anchors, Ctx, V, Who } from "../pixel";

export type Person = "cengiz" | "aysenur";
export type Actor = { who: Who | "duldul" | "parrot" | "chest" | "yarn" | "map" | "book" | "chest2" | "wizardBook" | "gandalf" | "gimli" | "legolas" | "jon" | "daenerys"; anchors: Anchors };
export type Bubble = { who: Person; text: string };

export type SceneIn = { c: Ctx; p: number; view: V; t: number; still: boolean };
export type SceneOut = { cam: V; actors: Actor[]; bubbles?: Bubble[]; tod: number; caption?: string };
export type Scene = { id: string; vh: number; render: (i: SceneIn) => SceneOut };

// kamerayı iki karakterin ortasına odaklar; dünya sınırlarını aşmaz
// top: dünyanın çizilen en üst noktası (iç mekânlarda duvar yukarı uzatılır, uzun ekranda boşluk kalmaz)
export function follow(x: number, y: number, view: V, w: number, h: number, ratio = 0.62, top = 0): V {
  const cl = (v: number, a: number, b: number) => (b < a ? (a + b) / 2 : Math.max(a, Math.min(b, v)));
  return [Math.round(cl(x - view[0] / 2, 0, w - view[0])), Math.round(cl(y - view[1] * ratio, top, h - view[1]))];
}

// sahne çizimini kamera çevirisiyle sarar
export function stage(c: Ctx, cam: V, view: V, draw: () => void) {
  c.save();
  c.translate(-cam[0], -cam[1]);
  c.fillStyle = "#2b2833";
  c.fillRect(cam[0], cam[1], view[0], view[1]);
  draw();
  c.restore();
}
