// Macera Günlüğü: XP ve seviye. Yeni tablo yok; XP mevcut kayıtlardan hesaplanır.
// Bakım tiki 10, öğün 15, yüz yogası 20, spor seansı 30 XP.
export const XP = { check: 10, meal: 15, faceYoga: 20, sport: 30 } as const;

// Seviye L'den L+1'e geçmek için 100 + (L-1)*50 XP gerekir: 100, 150, 200, ...
export function levelOf(xp: number) {
  let level = 1, need = 100, rest = Math.max(0, Math.floor(xp));
  while (rest >= need) { rest -= need; level++; need = 100 + (level - 1) * 50; }
  return { level, into: rest, need, title: titleOf(level) };
}

export function titleOf(level: number) {
  if (level >= 30) return "Efsane";
  if (level >= 20) return "Kahraman";
  if (level >= 12) return "Şövalye";
  if (level >= 6) return "Yolcu";
  return "Çırak";
}

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  console.assert(levelOf(0).level === 1 && levelOf(99).level === 1, "başlangıç seviyesi");
  console.assert(levelOf(100).level === 2 && levelOf(100).into === 0, "ilk geçiş");
  console.assert(levelOf(250).level === 3 && levelOf(250).need === 200, "eğri");
}
