// Rozetler: veri olarak tanımlı kademeler. Her ölçüt (bakım tiki, seri, birliktelik...) birkaç eşikle,
// her eşik kendi adıyla bir rozet olur. Sayaçlar mevcut kayıtlardan gelir (lib/xp-server.ts).
import type { Stats } from "./xp";

export type Metric = keyof Stats | "level";
type Track = { metric: Metric; icon: string; group: string; unit: string; tiers: [number, string][] };

const TRACKS: Track[] = [
  { metric: "checks", icon: "🧴", group: "Bakım", unit: "bakım tiki", tiers: [[1, "İlk Adım"], [10, "Bakım Çırağı"], [25, "Düzenli"], [50, "Özenli"], [100, "Bakım Ustası"], [250, "Parıltı"], [500, "Işıltı"], [1000, "Cilt Büyücüsü"], [2500, "Bakım Efsanesi"]] },
  { metric: "meals", icon: "🍲", group: "Beslenme", unit: "öğün", tiers: [[1, "İlk Lokma"], [10, "Sofra Kuran"], [30, "Dengeli"], [75, "Lezzet Avcısı"], [150, "Usta Aşçı"], [300, "Ziyafet"], [600, "Sofra Lordu"], [1000, "Mutfak Efsanesi"]] },
  { metric: "waterDays", icon: "💧", group: "Beslenme", unit: "gün 8+ bardak su", tiers: [[1, "İlk Bardaklar"], [7, "Bir Hafta Taze"], [30, "Bir Ay Taze"], [100, "Su Perisi"]] },
  { metric: "sport", icon: "⚔️", group: "Spor", unit: "spor seansı", tiers: [[1, "İlk Ter"], [5, "Isınma Turu"], [10, "Savaşçı"], [25, "Gladyatör"], [50, "Şampiyon"], [100, "Titan"], [200, "Demir İrade"], [365, "Spor Efsanesi"]] },
  { metric: "sportMin", icon: "⏱️", group: "Spor", unit: "dakika spor", tiers: [[60, "Bir Saat"], [300, "Beş Saat"], [600, "On Saat"], [1500, "Maratoncu"], [3000, "Yorulmaz"], [6000, "Zaman Bükücü"]] },
  { metric: "yoga", icon: "🧘", group: "Yüz yogası", unit: "yüz yogası seansı", tiers: [[1, "İlk Gülümseme"], [5, "Yüz Yogacısı"], [10, "Esnek Yüz"], [25, "Huzur"], [50, "Zen"], [100, "Işıldayan Yüz"], [200, "Yoga Ustası"]] },
  { metric: "journal", icon: "📖", group: "Cilt günlüğü", unit: "günlük kaydı", tiers: [[1, "İlk Not"], [5, "Günlük Tutan"], [15, "Dikkatli Göz"], [30, "Cilt Kâşifi"], [60, "Arşivci"]] },
  { metric: "best", icon: "🔥", group: "Seri", unit: "günlük en iyi seri", tiers: [[3, "Kıvılcım"], [7, "Bir Hafta"], [14, "İki Hafta"], [21, "Alışkanlık"], [30, "Bir Ay"], [60, "İki Ay"], [100, "Yüz Gün"], [180, "Yarım Yıl"], [365, "Bir Yıl"]] },
  { metric: "activeDays", icon: "📅", group: "Seri", unit: "aktif gün", tiers: [[1, "İlk Gün"], [7, "Bir Haftalık Yolcu"], [30, "Bir Aylık Yolcu"], [90, "Mevsim"], [180, "Yarım Yıl Yolcusu"], [365, "Yıl Boyu"]] },
  { metric: "together", icon: "❤️", group: "Birlikte", unit: "gün birlikte tamamlanan", tiers: [[1, "Birlikte"], [3, "Üç Gün Beraber"], [7, "Kalp Kalbe"], [14, "El Ele"], [30, "Bir Ay Birlikte"], [60, "Ayrılmaz İkili"], [100, "Yüz Gün Aşk"], [180, "Yarım Yıl Beraber"], [365, "Sonsuza Dek"]] },
  { metric: "decor", icon: "🏠", group: "Ev", unit: "eşya evde", tiers: [[1, "İlk Eşya"], [5, "Yuva Kuran"], [10, "Ev Gibi Ev"], [25, "İç Mimar"], [50, "Saray"], [100, "Masal Evi"]] },
  { metric: "garden", icon: "🌷", group: "Ev", unit: "eşya bahçede", tiers: [[1, "İlk Fide"], [5, "Bahçıvan"], [15, "Çiçek Bahçesi"], [30, "Cennet Bahçesi"]] },
  { metric: "level", icon: "✨", group: "Seviye", unit: "seviye", tiers: [[3, "Yola Çıkış"], [6, "Yolcu"], [10, "Çift Hane"], [12, "Şövalye"], [20, "Kahraman"], [30, "Efsane"], [45, "Destan"], [60, "Ejderha Lordu"], [75, "Yıldız Bekçisi"], [90, "Ölümsüz"], [100, "Zirve"]] },
];

export type Badge = { id: string; icon: string; name: string; hint: string; group: string; metric: Metric; need: number; ok: (s: Stats, level: number) => boolean };

const valueOf = (m: Metric, s: Stats, level: number) => (m === "level" ? level : s[m] ?? 0);

export const BADGES: Badge[] = TRACKS.flatMap((tr) => tr.tiers.map(([need, name]) => ({
  id: `${tr.metric}-${need}`, icon: tr.icon, name, group: tr.group, metric: tr.metric, need,
  hint: tr.metric === "level" ? `Seviye ${need}'e ulaş` : `${need} ${tr.unit}`,
  ok: (s: Stats, level: number) => valueOf(tr.metric, s, level) >= need,
})));

export const BADGE_GROUPS = [...new Set(TRACKS.map((t) => t.group))];

/** Bir ölçütte sıradaki rozet ve ilerleme */
export function progressOf(metric: Metric, s: Stats, level: number) {
  const tr = TRACKS.find((t) => t.metric === metric)!;
  const v = valueOf(metric, s, level);
  const next = tr.tiers.find(([need]) => v < need);
  return { value: v, next: next ? { need: next[0], name: next[1] } : null, icon: tr.icon, unit: tr.unit };
}
export const METRICS = TRACKS.map((t) => t.metric);

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  console.assert(BADGES.length >= 90 && new Set(BADGES.map((b) => b.id)).size === BADGES.length, "90+ rozet, kimlikler benzersiz");
  const zero = { checks: 0, meals: 0, yoga: 0, sport: 0, streak: 0, best: 0, together: 0, sportMin: 0, journal: 0, waterDays: 0, activeDays: 0, decor: 0, garden: 0 };
  console.assert(BADGES.filter((b) => b.ok({ ...zero, checks: 10 }, 1)).length === 2, "eşik sayımı");
  console.assert(progressOf("checks", { ...zero, checks: 12 }, 1).next?.need === 25, "sıradaki rozet");
}
