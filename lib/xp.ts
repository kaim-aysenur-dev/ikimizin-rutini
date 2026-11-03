// Macera Günlüğü: XP ve seviye. Yeni tablo yok; XP mevcut kayıtlardan hesaplanır.
// Bakım tiki 10, öğün 15, yüz yogası 20, spor seansı 30 XP.
export const XP = { check: 10, meal: 15, faceYoga: 20, sport: 30 } as const;

// Seviye L'den L+1'e geçmek için 100 + (L-1)*15 XP gerekir: 100, 115, 130, ... En yüksek seviye 100.
export const MAX_LEVEL = 100;
const needAt = (level: number) => 100 + (level - 1) * 15;

export function levelOf(xp: number) {
  let level = 1, rest = Math.max(0, Math.floor(xp));
  while (level < MAX_LEVEL && rest >= needAt(level)) { rest -= needAt(level); level++; }
  const need = needAt(level);
  return { level, into: level === MAX_LEVEL ? need : rest, need, title: titleOf(level) };
}

// Seviye L'ye ulaşmak için gereken toplam XP
export function xpToLevel(level: number) {
  let total = 0;
  for (let l = 1; l < Math.min(level, MAX_LEVEL); l++) total += needAt(l);
  return total;
}

export function titleOf(level: number) {
  if (level >= 90) return "Ölümsüz";
  if (level >= 75) return "Yıldız Bekçisi";
  if (level >= 60) return "Ejderha Lordu";
  if (level >= 45) return "Destan";
  if (level >= 30) return "Efsane";
  if (level >= 20) return "Kahraman";
  if (level >= 12) return "Şövalye";
  if (level >= 6) return "Yolcu";
  return "Çırak";
}

// Seviye ödülleri: panelin arkasındaki şato salonuna eklenen şeyler (lib/scenes/hall.ts çizer)
export type Reward = { level: number; id: string; label: string; slot?: string; v?: number };
const BASE_REWARDS: Reward[] = [
  { level: 3, id: "rug", label: "Ateş başına kırmızı halı" },
  { level: 5, id: "banners", label: "Duvarlara sancaklar" },
  { level: 8, id: "crown", label: "Düldül'e küçük taç" },
  { level: 10, id: "hat", label: "Papağana korsan şapkası" },
  { level: 12, id: "shield", label: "Duvarda kılıç ve kalkan" },
  { level: 15, id: "egg", label: "Ateşin yanında ejderha yumurtası" },
  { level: 20, id: "gandalf", label: "Gandalf ziyarete gelir" },
  { level: 25, id: "chest", label: "Hazine sandığı" },
  { level: 30, id: "stars", label: "Altın avize ışıltısı" },
];

// Salon dekor yuvaları: her çeşit bir ödül. Bir yuvanın açılan çeşitleri salonun bölmelerine sırayla dağılır
// (lib/scenes/hall-decor.ts çizer). label: çeşit adı + yuva adı.
export const SALON_SLOTS: Record<string, { noun: string; names: string[] }> = {
  sancak: { noun: "sancak", names: ["Kızıl", "Lacivert", "Zümrüt", "Altın", "Mor", "Gece", "Pembe", "Gümüş"] },
  tablo: { noun: "tablosu", names: ["Dağ manzarası", "Şato", "Ejderha", "Kalp", "Dolunay", "Gün batımı", "Deniz", "Orman", "Yıldızlı gece", "İkimizin portresi"] },
  vitray: { noun: "vitray", names: ["Gül", "Gök mavisi", "Zümrüt", "Altın", "Mor", "Gökkuşağı"] },
  arma: { noun: "arması", names: ["Aslan", "Kartal", "Ejder", "Kalp", "Ay", "Yıldız", "Gül", "Taç"] },
  mesale: { noun: "meşale", names: ["Alevli", "Mavi alevli", "Yeşil alevli", "Altın alevli"] },
  samdan: { noun: "şamdan", names: ["Pirinç", "Gümüş", "Altın", "Kristal", "Obsidyen", "Göksel"] },
  bitki: { noun: "", names: ["Eğrelti otu", "Gül fidanı", "Lavanta", "Bonsai", "Palmiye", "Kristal çiçek"] },
  zirh: { noun: "zırh standı", names: ["Demir", "Çelik", "Altın", "Mithril", "Obsidyen", "Ejder"] },
  kitaplik: { noun: "kitaplık", names: ["Meşe", "Ceviz", "Abanoz", "Büyülü"] },
  avize: { noun: "avize", names: ["Pirinç", "Gümüş", "Kristal", "Yakut", "Göksel"] },
  ates: { noun: "ateş", names: ["Mavi", "Pembe", "Yeşil", "Mor"] },
  hali: { noun: "halı", names: ["Lacivert", "Zümrüt", "Mor", "Altın"] },
  evcil: { noun: "", names: ["Düldül'e pembe fiyonk", "Papağana minik taç", "Düldül'e çıngırak", "Papağana gözlük"] },
  susleme: { noun: "tavan süsü", names: ["Kırmızı-altın", "Mavi-beyaz", "Pastel", "Gökkuşağı", "Kalpli", "Yıldızlı"] },
  sarmasik: { noun: "sarmaşık", names: ["Yeşil", "Çiçekli", "Altın", "Işıklı"] },
};

const SALON_ORDER: { slot: string; v: number }[] = [];
for (let v = 0; v < 10; v++) for (const slot of Object.keys(SALON_SLOTS)) if (v < SALON_SLOTS[slot].names.length) SALON_ORDER.push({ slot, v });

export const REWARDS: Reward[] = [
  ...BASE_REWARDS,
  ...SALON_ORDER.map(({ slot, v }, k) => {
    const { noun, names } = SALON_SLOTS[slot];
    return { level: Math.min(100, 2 + Math.floor((k * 98) / (SALON_ORDER.length - 1))), id: `${slot}-${v}`, label: noun ? `${names[v]} ${noun}` : names[v], slot, v };
  }),
].sort((a, b) => a.level - b.level);
export type RewardId = string;
export const unlockedRewards = (level: number) => new Set<string>(REWARDS.filter((r) => r.level <= level).map((r) => r.id));
export const nextReward = (level: number) => REWARDS.find((r) => r.level > level) ?? null;
export const rewardsAt = (level: number) => REWARDS.filter((r) => r.level === level);
/** Bir dekor yuvasının açılmış çeşitleri (sırayla) */
export const slotVariants = (slot: string, level: number) => REWARDS.filter((r) => r.slot === slot && r.level <= level).map((r) => r.v!);

// Zırh kademesi ünvanla birlikte yükselir (eşikler titleOf ile aynı)
export type Tier = "cloth" | "leather" | "steel" | "gold" | "legend";
export const tierOf = (level: number): Tier =>
  level >= 30 ? "legend" : level >= 20 ? "gold" : level >= 12 ? "steel" : level >= 6 ? "leather" : "cloth";
export const TIER_NAMES: Record<Tier, string> = { cloth: "Kumaş giysi", leather: "Deri zırh", steel: "Çelik zırh", gold: "Altın zırh", legend: "Parlayan efsane zırhı" };

// Rozet sayaçları: hepsi mevcut kayıtlardan sayılır (lib/xp-server.ts); rozet tanımları lib/badges.ts
export type Stats = {
  checks: number; meals: number; yoga: number; sport: number; streak: number; best: number; together: number;
  sportMin: number; journal: number; waterDays: number; activeDays: number; decor: number; garden: number;
};

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  console.assert(levelOf(0).level === 1 && levelOf(99).level === 1, "başlangıç seviyesi");
  console.assert(levelOf(100).level === 2 && levelOf(100).into === 0, "ilk geçiş");
  console.assert(levelOf(250).level === 3 && levelOf(250).need === 130, "eğri");
  console.assert(xpToLevel(1) === 0 && xpToLevel(3) === 215 && levelOf(xpToLevel(9)).level === 9, "seviye eşiği");
  console.assert(levelOf(1e9).level === MAX_LEVEL && titleOf(100) === "Ölümsüz", "tavan");
  console.assert(tierOf(5) === "cloth" && tierOf(6) === "leather" && tierOf(12) === "steel" && tierOf(30) === "legend", "zırh kademesi");
  console.assert(unlockedRewards(8).has("crown") && !unlockedRewards(8).has("hat") && REWARDS.length >= 90 && new Set(REWARDS.map((r) => r.id)).size === REWARDS.length, "ödüller");
}
