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
export const REWARDS = [
  { level: 3, id: "rug", label: "Ateş başına kırmızı halı" },
  { level: 5, id: "banners", label: "Duvarlara sancaklar" },
  { level: 8, id: "crown", label: "Düldül'e küçük taç" },
  { level: 10, id: "hat", label: "Papağana korsan şapkası" },
  { level: 12, id: "shield", label: "Duvarda kılıç ve kalkan" },
  { level: 15, id: "egg", label: "Ateşin yanında ejderha yumurtası" },
  { level: 20, id: "gandalf", label: "Gandalf ziyarete gelir" },
  { level: 25, id: "chest", label: "Hazine sandığı" },
  { level: 30, id: "stars", label: "Altın avize ışıltısı" },
] as const;
export type RewardId = (typeof REWARDS)[number]["id"];
export const unlockedRewards = (level: number) => new Set<RewardId>(REWARDS.filter((r) => r.level <= level).map((r) => r.id));
export const nextReward = (level: number) => REWARDS.find((r) => r.level > level) ?? null;
export const rewardAt = (level: number) => REWARDS.find((r) => r.level === level) ?? null;

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
  console.assert(unlockedRewards(8).has("crown") && !unlockedRewards(8).has("hat") && nextReward(8)?.id === "hat", "ödüller");
}
