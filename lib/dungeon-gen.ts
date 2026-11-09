// Bölüm haritası üretici (tohumlu, her seferinde aynı harita): elle çizilmemiş bölümler için.
//  - arena: açık bir salon, kenarlarda ve içinde temanın süsleri, birkaç tehlike gölü
//  - tunel: büyük mağara; odalar kıvrımlı geçitlerle bağlanır, giriş ilk odada, şef en büyük odada, çıkış son odada
// Çıktı dungeon-stages.ts haritalarıyla aynı karakter dilinde; dungeon-map.ts aynı biçimde okur.

export type GenSpec = {
  kind: "arena" | "tunel";
  seed: number;
  w?: number; d?: number;
  props: string; // serpiştirilecek katı süsler (ör. "RRc" kaya ağırlıklı, biraz kristal)
  hazard?: string; // tehlike karakteri: L lav, p zehir/kan, w ağ, ~ uçurum (geçilmez)
  hazardRate?: number; // 0..1
  decor?: string; // yürünür süs: r rün, i buz
};

/** Küçük tohumlu rastgele sayı (mulberry32) */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// girişten çıkışa, şefe ve bütün doğma yerlerine yürünebiliyor mu (katı süs, uçurum ve lav geçilmez)
const BLOCK = new Set(["#", "o", "R", "T", "g", "x", "f", "c", "n", "h", "u", "e", "$", "Y", "k", "~", "t", "L"]);
function walkable(map: string[]): boolean {
  const d = map.length, w = map[0].length;
  let start: [number, number] | null = null;
  const need: [number, number][] = [];
  map.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "S") start = [i, j]; if (ch === "E" || ch === "B" || ch === "m") need.push([i, j]); }));
  if (!start || need.length < 6) return false;
  const seen = new Set([`${start[0]},${start[1]}`]), q: [number, number][] = [start];
  while (q.length) {
    const [i, j] = q.shift()!;
    for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
      if (a < 0 || b < 0 || a >= w || b >= d || seen.has(`${a},${b}`) || BLOCK.has(map[b][a])) continue;
      seen.add(`${a},${b}`); q.push([a, b]);
    }
  }
  return need.every(([i, j]) => seen.has(`${i},${j}`));
}

type Room = { x: number; y: number; w: number; h: number };
const center = (r: Room): [number, number] => [Math.floor(r.x + r.w / 2), Math.floor(r.y + r.h / 2)];

export function generate(spec: GenSpec): string[] {
  for (let attempt = 0; attempt < 40; attempt++) {
    const out = spec.kind === "tunel" ? tunnel(spec, spec.seed + attempt * 7919) : arena(spec, spec.seed + attempt * 7919);
    if (out && walkable(out)) return out;
  }
  throw new Error("harita üretilemedi");
}

function arena(spec: GenSpec, seed: number): string[] | null {
  const r = rng(seed), w = spec.w ?? 24, d = spec.d ?? 16;
  const g: string[][] = Array.from({ length: d }, () => Array.from({ length: w }, () => "."));
  const midJ = Math.floor(d / 2);
  // süsler: kenar şeridinde sık, içeride seyrek; giriş-çıkış hattı (orta satır) boş kalır
  for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {
    if (Math.abs(j - midJ) <= 1 || i < 2 || i > w - 3) continue;
    const edge = j < 2 || j > d - 3, roll = r();
    if (roll < (edge ? 0.22 : 0.07)) g[j][i] = spec.props[Math.floor(r() * spec.props.length)];
    else if (spec.hazard && roll < (edge ? 0.22 : 0.07) + (spec.hazardRate ?? 0.08)) g[j][i] = spec.hazard;
    else if (spec.decor && roll > 0.96) g[j][i] = spec.decor;
  }
  // tehlikeleri küçük göller hâlinde topla
  if (spec.hazard) for (let k = 0; k < 3; k++) {
    const ci = 4 + Math.floor(r() * (w - 8)), cj = 2 + Math.floor(r() * (d - 4));
    if (Math.abs(cj - midJ) <= 1) continue;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 0; b++) if (g[cj + b]?.[ci + a] === ".") g[cj + b][ci + a] = spec.hazard;
  }
  g[midJ][0] = "S"; g[midJ][w - 2] = "E"; g[midJ][Math.floor(w / 2) + 1] = "B";
  const spots: [number, number][] = [[w - 4, 2], [w - 3, d - 3], [w - 6, midJ - 3], [w - 7, midJ + 3], [Math.floor(w / 2), 2], [Math.floor(w / 2) - 2, d - 3], [w - 10, midJ + 2]];
  for (const [i, j] of spots) { if (g[j]?.[i] !== undefined) g[j][i] = "m"; }
  return g.map((row) => row.join(""));
}

function tunnel(spec: GenSpec, seed: number): string[] | null {
  const r = rng(seed), w = spec.w ?? 44, d = spec.d ?? 30;
  const g: string[][] = Array.from({ length: d }, () => Array.from({ length: w }, () => "#"));
  // odalar: soldan sağa ilerleyen bir zincir, aralarda yukarı-aşağı kıvrılır
  const rooms: Room[] = [];
  const count = 6 + Math.floor(r() * 3);
  for (let k = 0; k < count; k++) {
    const rw = 5 + Math.floor(r() * 5), rh = 4 + Math.floor(r() * 5);
    const x = Math.min(w - rw - 1, 1 + Math.floor((k / count) * (w - 8)) + Math.floor(r() * 3));
    const y = 1 + Math.floor(r() * (d - rh - 2));
    rooms.push({ x, y, w: rw, h: rh });
  }
  const boss = rooms.slice(2, -1).reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a), rooms[Math.floor(count / 2)]);
  boss.w = Math.min(boss.w + 3, w - boss.x - 2); boss.h = Math.min(boss.h + 3, d - boss.y - 2); // şef odası geniş
  for (const rm of rooms) for (let j = rm.y; j < rm.y + rm.h; j++) for (let i = rm.x; i < rm.x + rm.w; i++) g[j][i] = ".";
  // geçitler: ardışık odalar L biçimli, iki kare genişliğinde; arada bir yan kol (çıkmaz mağara)
  const carve = (a: [number, number], b: [number, number]) => {
    let [i, j] = a;
    const horizFirst = r() < 0.5;
    const stepTo = (ti: number, tj: number) => {
      while (i !== ti || j !== tj) {
        if (i !== ti && (horizFirst || j === tj)) i += Math.sign(ti - i); else if (j !== tj) j += Math.sign(tj - j);
        for (const [di, dj] of [[0, 0], [1, 0], [0, 1]]) if (g[j + dj]?.[i + di] === "#" && j + dj < d - 1 && i + di < w - 1) g[j + dj][i + di] = ".";
      }
    };
    if (horizFirst) { stepTo(b[0], j); stepTo(b[0], b[1]); } else { stepTo(i, b[1]); stepTo(b[0], b[1]); }
  };
  for (let k = 0; k + 1 < rooms.length; k++) carve(center(rooms[k]), center(rooms[k + 1]));
  for (let k = 0; k < 2; k++) { const a = rooms[1 + Math.floor(r() * (rooms.length - 2))]; carve(center(a), [Math.max(2, Math.min(w - 3, center(a)[0] + Math.floor((r() - 0.5) * 14))), Math.max(2, Math.min(d - 3, center(a)[1] + (r() < 0.5 ? -7 : 7)))]); }
  // oda içleri: süsler ve tehlikeler (geçitlerin ağzı boş kalsın diye oda kenarından bir kare içeride)
  for (const rm of rooms) {
    for (let j = rm.y + 1; j < rm.y + rm.h - 1; j++) for (let i = rm.x + 1; i < rm.x + rm.w - 1; i++) {
      const roll = r();
      if (roll < 0.08) g[j][i] = spec.props[Math.floor(r() * spec.props.length)];
      else if (spec.hazard && rm !== rooms[0] && roll < 0.08 + (spec.hazardRate ?? 0.07)) g[j][i] = spec.hazard;
      else if (spec.decor && roll > 0.95) g[j][i] = spec.decor;
    }
  }
  const put = (rm: Room, ch: string) => { const [i, j] = center(rm); g[j][i] = ch; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (g[j + b][i + a] !== "#") g[j + b][i + a] = "."; };
  const first = rooms[0], last = rooms[rooms.length - 1];
  g[center(first)[1]][first.x] = "S";
  for (const [a, b] of [[1, 0], [0, 1], [0, -1]]) g[center(first)[1] + b][first.x + a] = ".";
  put(last, "E"); put(boss, "B");
  // doğma yerleri: her odaya bir-iki (ilk oda hariç)
  for (const rm of rooms.slice(1)) for (let k = 0; k < (rm === boss ? 3 : 2); k++) {
    const i = rm.x + 1 + Math.floor(r() * Math.max(1, rm.w - 2)), j = rm.y + 1 + Math.floor(r() * Math.max(1, rm.h - 2));
    if (g[j][i] === "." || g[j][i] === spec.decor) g[j][i] = "m";
  }
  // meşaleler: oda köşelerinde
  for (const rm of rooms) if (g[rm.y][rm.x] === ".") g[rm.y][rm.x] = "t";
  return g.map((row) => row.join(""));
}
