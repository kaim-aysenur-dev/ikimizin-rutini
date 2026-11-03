// Bölüm kataloğu veri odaklıdır: yeni bir bölüm motor veya arayüz değiştirmeden eklenir.
export type RegionId = string;
export type Point = { i: number; j: number };
export type EnemyKind = "ork" | "kurt" | "okcu" | "muhafiz" | "saman" | "trol" | "golge";
export type Landmark = Point & { name: string; text: string; kind: "tower" | "cage" | "rune" | "bridge" | "altar" | "cart" | "camp" | "chest" };
export type Region = {
  id: RegionId; chapter: number; name: string; level: number; minLevel: number;
  biome: "forest" | "pass" | "swamp" | "castle";
  subtitle: string; story: string; ending: string; boss: string; bossKind: EnemyKind;
  colors: { ground: string; path: string; edge: string; canopy: string; accent: string; sky: string };
  path: Point[]; branches: Point[][]; objectives: Landmark[]; landmarks: Landmark[];
  enemies: EnemyKind[]; trophy: string;
};
export const MAP = { w: 68, h: 50 };
export const DIFFICULTIES = [
  { id: 0, name: "Yolculuk", offset: 0, desc: "Bölümün kendi seviyesinde keşif ve savaş." },
  { id: 1, name: "Kadim Yemin", offset: 30, desc: "+30 düşman seviyesi; gelişmiş ekipman için." },
  { id: 2, name: "Son Efsane", offset: 60, desc: "+60 düşman seviyesi; yüksek seviyeli kahramanlar için." },
] as const;
export const REGIONS: Region[] = [
  {
    id: "kul-ormani", chapter: 1, biome: "forest", name: "Kül Ormanı", level: 2, minLevel: 1,
    subtitle: "Üç gecedir yanmayan gözcü ateşi", boss: "Tek Gözlü Ork Reisi", bossKind: "ork", trophy: "Gözcünün Sancağı",
    story: "Jon Snow: Ormandaki gözcüden haber yok. Kül kokusunu izleyin; esirleri geride bırakmayın.",
    ending: "Gözcü ateşi yeniden yanıyor. Sancakta iki küçük yıldız var; biri sen, biri yol arkadaşın.",
    colors: { ground: "#20352e", path: "#574e39", edge: "#10241f", canopy: "#284e38", accent: "#e5b871", sky: "#101c23" },
    path: [{ i: 6, j: 40 }, { i: 16, j: 33 }, { i: 28, j: 35 }, { i: 36, j: 23 }, { i: 48, j: 24 }, { i: 58, j: 12 }],
    branches: [[{ i: 18, j: 33 }, { i: 13, j: 23 }], [{ i: 45, j: 24 }, { i: 52, j: 34 }]],
    objectives: [
      { i: 16, j: 33, kind: "tower", name: "Sönmüş gözcü ateşi", text: "Kırık kulübedeki mektubu bul ve ateşi yak." },
      { i: 36, j: 23, kind: "cage", name: "Esir kampı", text: "Nöbetçileri yen; kafesin kilidini aç." },
      { i: 48, j: 24, kind: "rune", name: "Kök mührü", text: "Tapınağı saran üç kökün mührünü çöz." },
    ],
    landmarks: [
      { i: 13, j: 23, kind: "camp", name: "Avcının ateşi", text: "Sıcak külün üzerinde henüz sönmemiş ayak izleri var." },
      { i: 52, j: 34, kind: "chest", name: "Şelale mağarası", text: "Suyun ardında unutulmuş bir gözcü sandığı." },
    ], enemies: ["kurt", "ork", "okcu", "saman"],
  },
  {
    id: "haydut-gecidi", chapter: 2, biome: "pass", name: "Haydut Geçidi", level: 10, minLevel: 7,
    subtitle: "Kayıp kervanın son izi", boss: "Sürgün Şövalye", bossKind: "muhafiz", trophy: "Kırık Yemin Arması",
    story: "Gimli: Kervan geçide girdi, çıkmadı. Taş köprüyü tutanlar sıradan haydutlar değil.",
    ending: "Şövalye kılıcını bırakıyor. Yeminini hatırladı; artık geçitten yolcular sağ salim geçecek.",
    colors: { ground: "#494347", path: "#776454", edge: "#282733", canopy: "#625660", accent: "#e3a26e", sky: "#211c2c" },
    path: [{ i: 7, j: 42 }, { i: 19, j: 36 }, { i: 22, j: 23 }, { i: 36, j: 18 }, { i: 48, j: 24 }, { i: 59, j: 12 }],
    branches: [[{ i: 22, j: 26 }, { i: 12, j: 19 }], [{ i: 48, j: 24 }, { i: 53, j: 35 }]],
    objectives: [
      { i: 19, j: 36, kind: "cart", name: "Yağmalanmış kervan", text: "Kervanın pusulasını barikattan kurtar." },
      { i: 36, j: 18, kind: "bridge", name: "Zincirli köprü", text: "Muhafızları yen ve köprünün zincirini indir." },
      { i: 48, j: 24, kind: "tower", name: "İşaret kulesi", text: "Haydutların işaret ateşini söndür." },
    ],
    landmarks: [
      { i: 12, j: 19, kind: "camp", name: "Kervancı sığınağı", text: "Çaydanlık hâlâ sıcak. Birileri buradan aceleyle ayrılmış." },
      { i: 53, j: 35, kind: "chest", name: "Kaçakçı mahzeni", text: "Kayaya kazınmış küçük bir ok, gizli geçidi gösteriyor." },
    ], enemies: ["okcu", "muhafiz", "ork", "saman"],
  },
  {
    id: "trol-batakligi", chapter: 3, biome: "swamp", name: "Trol Bataklığı", level: 20, minLevel: 15,
    subtitle: "Suyun altından gelen çan", boss: "Yosun Sırtlı Dev Trol", bossKind: "trol", trophy: "Bataklık İncisi",
    story: "Legolas: Bataklıkta çan çalıyor. Sesin peşinden gidenler aynı patikaya geri dönüyor.",
    ending: "Su çekiliyor, batık çan sessizleşiyor. Nilüferlerin arasında iki kişilik kuru bir iskele beliriyor.",
    colors: { ground: "#233c3d", path: "#63766a", edge: "#162d35", canopy: "#365c50", accent: "#8edac0", sky: "#101f2c" },
    path: [{ i: 8, j: 40 }, { i: 20, j: 34 }, { i: 32, j: 38 }, { i: 40, j: 27 }, { i: 43, j: 15 }, { i: 59, j: 11 }],
    branches: [[{ i: 24, j: 35 }, { i: 18, j: 22 }], [{ i: 43, j: 18 }, { i: 55, j: 25 }]],
    objectives: [
      { i: 20, j: 34, kind: "rune", name: "Çürük su mührü", text: "Suyu zehirleyen rünü temizle." },
      { i: 40, j: 27, kind: "bridge", name: "Batık iskele", text: "Trol nöbetçilerinden iskeleyi geri al." },
      { i: 43, j: 15, kind: "altar", name: "Çanın yankısı", text: "Sunağın üstündeki yankı taşını sustur." },
    ],
    landmarks: [
      { i: 18, j: 22, kind: "camp", name: "Balıkçının kulübesi", text: "Kapının iç yüzüne yazılmış: Çan çalınca ışığı söndür." },
      { i: 55, j: 25, kind: "chest", name: "Batık kayık", text: "Su üstündeki fener bir hazineye işaret ediyor." },
    ], enemies: ["trol", "kurt", "saman", "golge"],
  },
  {
    id: "kara-kale", chapter: 4, biome: "castle", name: "Kara Kale", level: 30, minLevel: 24,
    subtitle: "Küllerin ardındaki son kapı", boss: "Küllerin Efendisi", bossKind: "golge", trophy: "İki Yıldız Tacı",
    story: "Gandalf: Üç mühür, tek kapı. Burada güç kadar sabır da gerekecek. Birbirinizi gözden kaybetmeyin.",
    ending: "Tahtın üstündeki karanlık dağılıyor. Uzakta, henüz haritada olmayan yüzlerce yolun ışığı görünüyor.",
    colors: { ground: "#302b40", path: "#575065", edge: "#1d192a", canopy: "#43364d", accent: "#c8a6f3", sky: "#13101e" },
    path: [{ i: 7, j: 40 }, { i: 19, j: 34 }, { i: 30, j: 25 }, { i: 42, j: 30 }, { i: 46, j: 18 }, { i: 59, j: 11 }],
    branches: [[{ i: 30, j: 25 }, { i: 24, j: 14 }], [{ i: 42, j: 30 }, { i: 52, j: 39 }]],
    objectives: [
      { i: 19, j: 34, kind: "tower", name: "Dış surların ateşi", text: "Kara muhafızları yen ve kapı mekanizmasını aç." },
      { i: 42, j: 30, kind: "rune", name: "Aynalar salonu", text: "Büyücülerden karanlık ayna parçasını al." },
      { i: 46, j: 18, kind: "altar", name: "Son yemin", text: "Taht odasının üç mühürlü sunağını çöz." },
    ],
    landmarks: [
      { i: 24, j: 14, kind: "camp", name: "Unutulmuş şapel", text: "Sıraların arasında hâlâ bir mum yanıyor." },
      { i: 52, j: 39, kind: "chest", name: "Kraliyet arşivi", text: "Tozlu kayıtlarda ikinizin adını taşıyan bir sayfa var." },
    ], enemies: ["muhafiz", "saman", "golge", "trol"],
  },
];
export const regionOf = (id: string) => REGIONS.find((r) => r.id === id);
export const ENEMY_INFO: Record<EnemyKind, { name: string; hp: number; damage: number; speed: number; range: number; windup: number; cooldown: number; armor: number }> = {
  ork: { name: "Ork Baltacı", hp: 1, damage: 1, speed: 1.65, range: 1.6, windup: 0.85, cooldown: 2.4, armor: 2 },
  kurt: { name: "Kül Kurdu", hp: 0.65, damage: 0.65, speed: 2.4, range: 1.15, windup: 0.65, cooldown: 2, armor: 0 },
  okcu: { name: "Haydut Okçu", hp: 0.8, damage: 0.85, speed: 1.5, range: 6, windup: 1.1, cooldown: 2.6, armor: 0 },
  muhafiz: { name: "Kalkanlı Muhafız", hp: 1.2, damage: 0.95, speed: 1.25, range: 1.7, windup: 1, cooldown: 2.6, armor: 12 },
  saman: { name: "Kara Şaman", hp: 0.8, damage: 0.7, speed: 1.2, range: 5, windup: 1.3, cooldown: 3.6, armor: 0 },
  trol: { name: "Taş Trolü", hp: 1.85, damage: 1.4, speed: 0.95, range: 2.3, windup: 1.5, cooldown: 3.4, armor: 16 },
  golge: { name: "Kül Muhafızı", hp: 1, damage: 1, speed: 1.9, range: 3.3, windup: 1.2, cooldown: 2.8, armor: 6 },
};

const segmentDistance = (p: Point, a: Point, b: Point) => {
  const di = b.i - a.i, dj = b.j - a.j;
  const t = Math.max(0, Math.min(1, ((p.i - a.i) * di + (p.j - a.j) * dj) / (di * di + dj * dj || 1)));
  return Math.hypot(p.i - a.i - t * di, p.j - a.j - t * dj);
};
export function pathDistance(r: Region, p: Point): number {
  let d = Infinity;
  for (const path of [r.path, ...r.branches]) for (let n = 1; n < path.length; n++) d = Math.min(d, segmentDistance(p, path[n - 1], path[n]));
  return d;
}
export function walkable(r: Region, i: number, j: number): boolean {
  if (i < 1 || j < 1 || i >= MAP.w - 1 || j >= MAP.h - 1) return false;
  const p = { i, j };
  return pathDistance(r, p) < 3.5 || [...r.objectives, ...r.landmarks, r.path[r.path.length - 1]].some((q) => Math.hypot(q.i - i, q.j - j) < 5.5);
}
export const expectedLevel = (r: Region, difficulty: number) => r.level + (DIFFICULTIES[difficulty]?.offset ?? 0);
export function enemyNumbers(r: Region, difficulty: number, kind: EnemyKind, party: number, boss = false) {
  const lv = expectedLevel(r, difficulty), e = ENEMY_INFO[kind], group = 1 + 0.65 * (party - 1);
  // Normal hedef: güncel bir yakın silahla ~3–5 vuruş; boss ~35–55 sn etkin dövüş.
  const referenceDamage = 10 * (1 + lv * 0.06);
  return {
    hp: Math.round(referenceDamage * (boss ? 95 : 3.8 * e.hp) * group),
    damage: Math.round((11 + lv * 1.3) * (boss ? 1.45 : e.damage)),
    armor: Math.round((e.armor + lv * 0.25) * (boss ? 1.15 : 1)),
  };
}
