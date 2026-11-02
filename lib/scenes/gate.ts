// Giriş ve profil sayfalarının arka planı: yağmurlu gecede şato kapısı, meşaleler, bekleyen Cengiz, Ayşenur ve yoldaşlar.
import { type Ctx, P, STAND, drawCharacter, rect } from "../pixel";
import { coolWall, door, sky } from "../env";
import { duldul, parrot } from "../companions";
import { rain, splashes, puddle } from "../weather";

function torch(c: Ctx, x: number, y: number, t: number, still: boolean) {
  const f = still ? 0 : Math.sin(t * 11 + x) + Math.sin(t * 7 + x * 3);
  const g = c.createRadialGradient(x + 1, y - 3, 0, x + 1, y - 3, 30 + f * 2);
  g.addColorStop(0, "rgba(255,170,80,0.35)"); g.addColorStop(1, "rgba(255,170,80,0)");
  c.fillStyle = g; c.fillRect(x - 32, y - 35, 66, 66);
  rect(c, x, y, 2, 9, P.woodDk);
  rect(c, x - 1, y - 4 - Math.round(f), 4, 4 + Math.round(f), "#f0a24a");
  rect(c, x, y - 3 - Math.round(f), 2, 2, "#ffe08a");
}

// w, h: canvas dünya boyutu. people: kapıda bekleyen karakterler çizilsin mi
export function gateScene(c: Ctx, w: number, h: number, t: number, still: boolean, people = true) {
  const G = h - 22; // zemin
  const cx = Math.round(w / 2);
  sky(c, 0, 0, w, h, 0.93, t);
  // sur ve kapı
  coolWall(c, 0, G - 120, w, G, 81);
  for (let x = 0; x < w; x += 10) rect(c, x, G - 128, 6, 8, "#5e5a66");
  door(c, cx - 22, G - 64, 44, 64, 0.15);
  torch(c, cx - 34, G - 46, t, still);
  torch(c, cx + 32, G - 46, t, still);
  rect(c, 0, G, w, h - G, P.stoneDk);
  rect(c, 0, G, w, 2, P.stoneLt);
  puddle(c, cx - 50, G + 4, 16, t, "rgba(255,180,90,0.45)");
  puddle(c, cx + 36, G + 6, 12, t, "rgba(255,180,90,0.35)");
  if (people) {
    drawCharacter(c, { who: "cengiz", x: cx - 52, y: G, dir: 1, pose: STAND, outfit: "armor", blink: !still && (t % 4.1) < 0.13 });
    duldul(c, cx - 70, G, 1, "sit", 0, t, still);
    const aa = drawCharacter(c, { who: "aysenur", x: cx + 52, y: G, dir: -1, pose: STAND, outfit: "armor", blink: !still && ((t + 2) % 4.1) < 0.13 });
    parrot(c, aa.shoulder, -1, "perch", t, still);
  }
  rain(c, 0, w, 0, G + 4, t, 0.8);
  splashes(c, 0, w, G, t, 0.8);
  // kenarlar koyulaşsın
  const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, "rgba(14,18,40,0)"); v.addColorStop(1, "rgba(14,18,40,0.6)");
  c.fillStyle = v; c.fillRect(0, 0, w, h);
}

// profil kartlarındaki küçük portre: oda içinde mum ışığı, karakter ve yoldaşı
export function portraitScene(c: Ctx, who: "cengiz" | "aysenur", w: number, h: number, t: number, still: boolean) {
  const G = h - 8;
  coolWall(c, 0, 0, w, G, who === "cengiz" ? 91 : 93);
  const g = c.createRadialGradient(w / 2, G - 20, 0, w / 2, G - 20, w * 0.7);
  g.addColorStop(0, "rgba(255,180,100,0.28)"); g.addColorStop(1, "rgba(20,26,51,0.45)");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  rect(c, 0, G, w, h - G, P.woodDk); rect(c, 0, G, w, 1, P.woodLt);
  const breathe = still ? 0 : Math.round((Math.sin(t * 1.6) + 1) / 2);
  const a = drawCharacter(c, { who, x: Math.round(w / 2), y: G, dir: who === "cengiz" ? 1 : -1, pose: { ...STAND, bob: -breathe }, outfit: "armor", blink: !still && ((t + (who === "cengiz" ? 0 : 1.7)) % 4.1) < 0.13 });
  if (who === "cengiz") duldul(c, Math.round(w / 2) - 16, G, 1, "sit", 0, t, still);
  else parrot(c, a.shoulder, -1, "perch", t, still);
}
