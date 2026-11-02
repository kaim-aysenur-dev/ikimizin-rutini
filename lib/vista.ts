// Pencere manzaraları: her oda kendi yönüne bakan tek, geniş bir dış manzaraya sahip.
// Manzara dünya koordinatında çizilir; pencereler yalnızca maskedir. Böylece aynı duvardaki pencereler
// ağaçları, tepeleri, bulutları ve güneşi/ayı kesintisiz paylaşır.
import { type Ctx, P, disc, rect, rnd } from "./pixel";
import { px, skyAt } from "./env";
import { lightning, rain, stormLevel, weather } from "./weather";

export type VistaKind = "castle" | "courtyard" | "garden" | "rainTrees" | "nightRain";
export type Vista = { kind: VistaKind; horizon: number; sunX: number; pathX?: number }; // dünya y'si ve x'i

// kesintisiz yumuşak sis bandı (kesik çizgi değil)
function mist(c: Ctx, x0: number, x1: number, y: number, t: number) {
  for (let x = x0; x < x1; x++) {
    const a = 0.18 + 0.12 * Math.sin(x * 0.07 + t * 0.3);
    rect(c, x, y + Math.round(Math.sin(x * 0.05) * 1.5), 1, 3, `rgba(239,227,200,${a.toFixed(2)})`);
  }
}

function hills(c: Ctx, x0: number, x1: number, base: number, amp: number, freq: number, seed: number, color: string, bottom: number) {
  for (let x = x0; x < x1; x++) {
    const y = Math.round(base + Math.sin(x * freq + seed) * amp + Math.sin(x * freq * 2.7 + seed * 2) * amp * 0.35);
    rect(c, x, y, 1, bottom - y, color);
  }
}

function treeline(c: Ctx, x0: number, x1: number, base: number, bottom: number, a: string, b: string, step = 5, tall = 14) {
  rect(c, x0, base, x1 - x0, bottom - base, a);
  const s0 = Math.floor(x0 / step) * step;
  for (let i = s0; i < x1 + step; i += step) {
    const th = Math.round(tall * 0.6 + rnd(i * 1.7) * tall * 0.6);
    for (let k = 0; k < th; k++) {
      const tw = Math.max(1, Math.round((th - k) / 2));
      rect(c, i + 2 - Math.floor(tw / 2), base - k, tw, 1, k % 4 === 0 ? b : a);
    }
  }
}

function sky(c: Ctx, x0: number, x1: number, top: number, horizon: number, tod: number, t: number) {
  const [hi, mid, low] = skyAt(tod);
  const h = horizon - top, h3 = Math.ceil(h / 3);
  rect(c, x0, top, x1 - x0, h3, hi);
  rect(c, x0, top + h3, x1 - x0, h3, mid);
  rect(c, x0, top + h3 * 2, x1 - x0, h - h3 * 2, low);
  for (let x = x0; x < x1; x += 2) { px(c, x, top + h3, hi); px(c, x + 1, top + h3 * 2, mid); }
  if (tod > 0.78) {
    const a = Math.min(1, (tod - 0.78) / 0.1);
    for (let x = x0; x < x1; x++) if (rnd(x * 3.3) > 0.93) px(c, x, top + Math.floor(rnd(x * 7.1) * h * 0.6), `rgba(255,248,220,${(a * (0.6 + 0.4 * Math.sin(t * 2 + x))).toFixed(2)})`);
  }
  // ağır bulutlar akşamdan itibaren toplanır
  if (tod > 0.7) {
    const k = Math.min(1, (tod - 0.7) / 0.15);
    for (let x = x0; x < x1; x++) {
      const n = Math.sin(x * 0.045 + t * 0.05) + Math.sin(x * 0.11 + 1) * 0.5;
      if (n > 1 - k * 1.2) rect(c, x, top + 4 + Math.round(Math.sin(x * 0.08) * 3), 1, Math.round(6 + n * 4), tod > 0.85 ? "rgba(30,30,52,0.85)" : "rgba(70,60,90,0.7)");
    }
  }
}

function sunMoon(c: Ctx, x: number, horizon: number, tod: number) {
  if (tod < 0.82) {
    const k = Math.max(0, Math.min(1, (tod - 0.15) / 0.67));
    const y = horizon - 10 - Math.sin(Math.PI * k) * 26 + (k > 0.85 ? (k - 0.85) * 60 : 0);
    disc(c, x + (k - 0.5) * 40, y, 5, tod > 0.65 ? "#ffd08a" : "#fff1c4");
  } else {
    disc(c, x, horizon - 40, 4, "#f4efd8");
    disc(c, x + 2, horizon - 41, 3, skyAt(tod)[0]);
  }
}

function distantCastle(c: Ctx, x: number, base: number, tod: number) {
  const col = tod > 0.84 ? "#1f1d3a" : "#6a5a88", lit = tod > 0.72 ? "#ffd27a" : "#f3d48a";
  rect(c, x - 10, base - 12, 22, 12, col);
  rect(c, x - 14, base - 22, 5, 22, col); rect(c, x + 10, base - 26, 5, 26, col); rect(c, x - 2, base - 18, 4, 6, col);
  for (const [tx, ty] of [[-14, -22], [10, -26]]) { px(c, x + tx + 2, base + ty - 1, col); px(c, x + tx + 2, base + ty - 2, col); }
  px(c, x + 12, base - 18, lit); px(c, x - 12, base - 14, lit); px(c, x + 2, base - 8, lit);
}

// Pencere kırpması içinde çağrılır; [x0, x1] ve [top, bottom] pencerenin dünya sınırları
export function vista(c: Ctx, v: Vista, x0: number, x1: number, top: number, bottom: number, tod: number, t: number) {
  const H = v.horizon;
  sky(c, x0, x1, top, H, tod, t);
  sunMoon(c, v.sunX, H, tod);
  const night = tod > 0.84;
  switch (v.kind) {
    case "castle":
      hills(c, x0, x1, H - 8, 5, 0.06, 1, night ? "#2b2850" : "#8c7aa8", bottom);
      distantCastle(c, v.sunX - 34, H - 6, tod);
      mist(c, x0, x1, H - 2, t);
      treeline(c, x0, x1, H + 10, bottom, night ? "#10221d" : P.forest, night ? "#18302a" : P.forest2);
      break;
    case "courtyard": {
      // avlu: karşıdaki kule ve sur, çit ve çakıl yol
      hills(c, x0, x1, H - 6, 3, 0.05, 3, night ? "#2b2850" : "#9a8ab4", bottom);
      for (let x = x0; x < x1; x++) {
        const m = Math.floor(x / 60) * 60;
        const tower = x - m < 18;
        const top2 = tower ? H - 34 : H - 14;
        rect(c, x, top2, 1, bottom - top2, tower ? "#6e6878" : "#7d7884");
        if (!tower && (x % 8) < 4) rect(c, x, top2 - 3, 1, 3, "#7d7884");
        if (tower && x - m > 6 && x - m < 11 && night === false) rect(c, x, H - 24, 1, 5, "#3e3a46");
        if (tower && x - m > 6 && x - m < 11 && night) rect(c, x, H - 24, 1, 5, "#ffd27a");
      }
      treeline(c, x0, x1, H + 6, bottom, "#3f6a44", P.moss, 4, 6);
      rect(c, x0, H + 12, x1 - x0, bottom - H - 12, "#a08a6a");
      break;
    }
    case "garden": {
      // bahçe ve taş teras: uzak orman, çit labirenti, perspektifli taş patika, korkuluk
      treeline(c, x0, x1, H - 2, bottom, night ? "#10221d" : "#2a4a38", "#355a44", 5, 10);
      rect(c, x0, H + 4, x1 - x0, bottom - H - 4, "#4f7a4f");
      for (let x = x0; x < x1; x++) if ((x % 14) < 9) rect(c, x, H + 7, 1, 3, "#3f6a44");
      // patika ufka doğru daralır (dünya x'ine bağlı, pencereler arasında süreklidir)
      const cx = v.pathX ?? v.sunX;
      for (let y = H + 6; y < bottom - 6; y++) {
        const k = (y - H) / (bottom - H);
        const hw = 2 + k * 18;
        const a = Math.max(x0, Math.round(cx - hw)), b = Math.min(x1, Math.round(cx + hw));
        if (b > a) rect(c, a, y, b - a, 1, (y % 4 === 0) ? "#9a8e7a" : "#b8aa90");
      }
      // teras korkuluğu
      rect(c, x0, bottom - 7, x1 - x0, 2, P.stoneLt);
      for (let x = Math.ceil(x0 / 5) * 5; x < x1; x += 5) rect(c, x, bottom - 5, 2, 5, P.stoneLt);
      break;
    }
    case "rainTrees":
      hills(c, x0, x1, H - 10, 4, 0.05, 5, night ? "#232442" : "#5b4a7a", bottom);
      treeline(c, x0, x1, H + 2, bottom, "#18302a", "#22402f", 6, 22);

      break;
    case "nightRain":
      hills(c, x0, x1, H - 6, 4, 0.04, 7, "#1d1f38", bottom);
      treeline(c, x0, x1, H + 6, bottom, "#0e1a17", "#152822", 6, 16);
      // ay ışığı ufukta ince bir parıltı
      for (let x = x0; x < x1; x++) if (Math.abs(x - v.sunX) < 10) px(c, x, H + 5, "rgba(244,239,216,0.35)");

      break;
  }
  // fırtına: akşam birkaç damla, gece yoğun yağmur; şimşekte bulutlar ve dış hatlar aydınlanır
  const storm = Math.max(stormLevel(tod), v.kind === "rainTrees" ? 0.55 : v.kind === "nightRain" ? 0.8 : v.kind === "garden" ? 0.5 : 0);
  rain(c, x0, x1, top, bottom, t, storm);
  const flash = weather.still ? 0 : lightning(t, stormLevel(tod));
  if (flash > 0) rect(c, x0, top, x1 - x0, bottom - top, `rgba(225,232,255,${(0.45 * flash).toFixed(2)})`);
}
