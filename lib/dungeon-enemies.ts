// Zindan yaratıkları: VERİ. Yeni yaratık için buraya bir satır ve monster-draw.ts'te bir çizim eklemek yeter.
// Değerler birinci seviye ölçeğinde; bölümün seviyesiyle büyür (dungeon.ts hpMul / dmgMul).
export type EnemyKind =
  | "goblin" | "kurt" | "orumcek" | "iskelet" | "ork" | "buyucu" | "trol" | "kara-sovalye" | "seytan" | "hayalet"
  | "yarasa" | "golem" | "buz" | "mantar"
  | "kurtadam" | "vampir" | "mumya" | "akrep" | "harpi" | "minotor" | "agac-adam" | "kara-elf" | "cehennem-kopegi" | "karakoncolos" | "alkarisi" | "buz-devi" | "golge" | "medusa"
  | "lich" | "ejderha" | "kan-lordu" | "tepegoz" | "sahmeran" | "hidra" | "kraken" | "kum-solucani" | "anka";

export type EnemyBase = {
  name: string; hp: number; dmg: number; speed: number; range: number; cd: number; size: number;
  ranged?: boolean; boss?: boolean; flying?: boolean; // uçanlar engel ve uçurum üstünden geçer
  shot?: { color: string; speed?: number }; // menzilli saldırının mermisi
};

export const ENEMIES: Record<EnemyKind, EnemyBase> = {
  goblin: { name: "Goblin", hp: 30, dmg: 4, speed: 2.2, range: 0.9, cd: 1.0, size: 0.8 },
  kurt: { name: "Kurt", hp: 34, dmg: 5, speed: 3.0, range: 0.9, cd: 0.9, size: 0.9 },
  orumcek: { name: "Dev örümcek", hp: 40, dmg: 5, speed: 2.5, range: 0.9, cd: 1.1, size: 0.9 },
  iskelet: { name: "İskelet", hp: 55, dmg: 6, speed: 1.8, range: 1.0, cd: 1.2, size: 1 },
  ork: { name: "Ork", hp: 90, dmg: 10, speed: 1.7, range: 1.1, cd: 1.4, size: 1.15 },
  buyucu: { name: "Kara büyücü", hp: 45, dmg: 8, speed: 1.5, range: 5, cd: 2.0, ranged: true, size: 1, shot: { color: "#9a5ae8" } },
  trol: { name: "Trol", hp: 220, dmg: 18, speed: 1.1, range: 1.4, cd: 2.0, size: 1.6 },
  "kara-sovalye": { name: "Kara şövalye", hp: 150, dmg: 13, speed: 1.6, range: 1.1, cd: 1.3, size: 1.1 },
  seytan: { name: "Şeytan", hp: 120, dmg: 12, speed: 2.0, range: 4, cd: 1.6, ranged: true, size: 1.15, flying: true, shot: { color: "#f0703a" } },
  hayalet: { name: "Hayalet", hp: 40, dmg: 5, speed: 1.6, range: 0.9, cd: 1.3, size: 1, flying: true },
  yarasa: { name: "Yarasa", hp: 22, dmg: 3, speed: 3.6, range: 0.8, cd: 0.8, size: 0.7, flying: true },
  golem: { name: "Taş golem", hp: 320, dmg: 20, speed: 0.9, range: 1.3, cd: 2.2, size: 1.5 },
  buz: { name: "Buz elementali", hp: 70, dmg: 9, speed: 1.4, range: 4.5, cd: 1.8, ranged: true, size: 1.1, flying: true, shot: { color: "#8ad8ff", speed: 6.5 } },
  mantar: { name: "Mantar adam", hp: 50, dmg: 6, speed: 1.2, range: 3.5, cd: 2.0, ranged: true, size: 0.95, shot: { color: "#9fe85a", speed: 4.5 } },
  // efsane ve masal yaratıkları
  kurtadam: { name: "Kurt adam", hp: 120, dmg: 12, speed: 2.8, range: 1.0, cd: 1.0, size: 1.15 },
  vampir: { name: "Vampir", hp: 110, dmg: 11, speed: 2.4, range: 3.5, cd: 1.5, ranged: true, size: 1.05, shot: { color: "#c8203a" } },
  mumya: { name: "Mumya", hp: 130, dmg: 10, speed: 1.2, range: 1.0, cd: 1.4, size: 1 },
  akrep: { name: "Dev akrep", hp: 90, dmg: 11, speed: 2.2, range: 1.1, cd: 1.2, size: 1.1 },
  harpi: { name: "Harpi", hp: 60, dmg: 7, speed: 3.0, range: 0.9, cd: 1.0, size: 1, flying: true },
  minotor: { name: "Minotor", hp: 260, dmg: 22, speed: 1.9, range: 1.3, cd: 1.8, size: 1.5 },
  "agac-adam": { name: "Ağaç adam", hp: 300, dmg: 18, speed: 0.9, range: 1.5, cd: 2.2, size: 1.6 },
  "kara-elf": { name: "Kara elf okçu", hp: 75, dmg: 10, speed: 2.2, range: 5.5, cd: 1.4, ranged: true, size: 1, shot: { color: "#b8a0ff", speed: 8 } },
  "cehennem-kopegi": { name: "Cehennem köpeği", hp: 95, dmg: 12, speed: 3.2, range: 0.9, cd: 1.0, size: 1.05 },
  karakoncolos: { name: "Karakoncolos", hp: 180, dmg: 16, speed: 1.8, range: 1.2, cd: 1.6, size: 1.35 },
  alkarisi: { name: "Albastı", hp: 90, dmg: 10, speed: 2.0, range: 4, cd: 1.7, ranged: true, size: 1.05, flying: true, shot: { color: "#9ad8a0" } },
  "buz-devi": { name: "Buz devi", hp: 380, dmg: 24, speed: 1.0, range: 1.5, cd: 2.2, size: 1.8 },
  golge: { name: "Ruh çalan gölge", hp: 80, dmg: 12, speed: 2.6, range: 0.9, cd: 1.1, size: 1.1, flying: true },
  medusa: { name: "Gorgon", hp: 160, dmg: 14, speed: 1.6, range: 4.5, cd: 1.8, ranged: true, size: 1.15, shot: { color: "#6ae88a" } },
  // büyük bosslar (tünellerin sonunda)
  tepegoz: { name: "Tepegöz", hp: 520, dmg: 32, speed: 1.0, range: 1.6, cd: 2.0, boss: true, size: 2.2 },
  sahmeran: { name: "Şahmeran", hp: 480, dmg: 26, speed: 1.5, range: 5, cd: 1.5, ranged: true, boss: true, size: 1.6, shot: { color: "#e8d040" } },
  hidra: { name: "Hidra", hp: 600, dmg: 28, speed: 0.8, range: 4.5, cd: 1.2, ranged: true, boss: true, size: 2.1, shot: { color: "#5ae87a", speed: 6 } },
  kraken: { name: "Kraken", hp: 650, dmg: 30, speed: 0.6, range: 5, cd: 1.6, ranged: true, boss: true, size: 2.3, shot: { color: "#3a8ac8", speed: 5.5 } },
  "kum-solucani": { name: "Kum solucanı", hp: 700, dmg: 34, speed: 1.4, range: 1.8, cd: 2.0, boss: true, size: 2.4 },
  anka: { name: "Zümrüdüanka", hp: 560, dmg: 30, speed: 2.0, range: 5.5, cd: 1.3, ranged: true, boss: true, size: 2.0, flying: true, shot: { color: "#ffb040", speed: 7.5 } },
  lich: { name: "Lich", hp: 300, dmg: 20, speed: 1.2, range: 6, cd: 1.5, ranged: true, boss: true, size: 1.3, flying: true, shot: { color: "#7ae8c8" } },
  ejderha: { name: "Ejderha", hp: 400, dmg: 26, speed: 1.0, range: 4, cd: 2.2, ranged: true, boss: true, size: 2.2, flying: true, shot: { color: "#ff8a2a", speed: 7 } },
  "kan-lordu": { name: "Kan Lordu", hp: 450, dmg: 30, speed: 1.7, range: 5, cd: 1.4, ranged: true, boss: true, size: 1.4, shot: { color: "#e8304a", speed: 6.5 } },
};
