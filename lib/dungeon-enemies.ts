// Zindan yaratıkları: VERİ. Yeni yaratık için buraya bir satır ve monster-draw.ts'te bir çizim eklemek yeter.
// Değerler birinci seviye ölçeğinde; bölümün seviyesiyle büyür (dungeon.ts hpMul / dmgMul).
export type EnemyKind =
  | "goblin" | "kurt" | "orumcek" | "iskelet" | "ork" | "buyucu" | "trol" | "kara-sovalye" | "seytan" | "hayalet"
  | "yarasa" | "golem" | "buz" | "mantar"
  | "lich" | "ejderha" | "kan-lordu";

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
  lich: { name: "Lich", hp: 300, dmg: 20, speed: 1.2, range: 6, cd: 1.5, ranged: true, boss: true, size: 1.3, flying: true, shot: { color: "#7ae8c8" } },
  ejderha: { name: "Ejderha", hp: 400, dmg: 26, speed: 1.0, range: 4, cd: 2.2, ranged: true, boss: true, size: 2.2, flying: true, shot: { color: "#ff8a2a", speed: 7 } },
  "kan-lordu": { name: "Kan Lordu", hp: 450, dmg: 30, speed: 1.7, range: 5, cd: 1.4, ranged: true, boss: true, size: 1.4, shot: { color: "#e8304a", speed: 6.5 } },
};
