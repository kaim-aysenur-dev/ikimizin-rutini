// Dilek Dolabı: gerçek hayatta almak istediğin ödüller ve onları kazandıran görevler.
// Kurallar istemci ve sunucuda ortak. Görev, başlatıldığı günden itibaren süre içinde koşullar tamamlanınca kazanılır;
// kazanılan ödül önce dolapta "kazanıldı" olarak durur, gerçekte alınınca "alındı" olur.

export type Tier = "yaygin" | "nadir" | "destansi" | "efsanevi";
export type WishStatus = "dilek" | "gorevde" | "kazanildi" | "alindi";

/**
 * Kademeler: süre uzadıkça hem toplam hem tempo artar, ve her kademede "aktif gün" oranı yükselir:
 * böylece ödül son haftada yığarak değil, düzenli çalışarak kazanılır.
 */
export const TIERS: Record<Tier, { label: string; days: number; intensity: number; active: number; xp: number; color: string; hint: string }> = {
  yaygin: { label: "Yaygın", days: 14, intensity: 0.9, active: 0.7, xp: 100, color: "#9aa0ae", hint: "küçük bir şımartma: ruj, mouse pad, kitap" },
  nadir: { label: "Nadir", days: 30, intensity: 1, active: 0.75, xp: 250, color: "#5a9ac8", hint: "bir ayın emeği: parfüm, klavye, güzel bir parça" },
  destansi: { label: "Destansı", days: 60, intensity: 1.1, active: 0.8, xp: 600, color: "#9a6ad6", hint: "iki ay: takı, monitör, çanta" },
  efsanevi: { label: "Efsanevi", days: 90, intensity: 1.2, active: 0.85, xp: 1200, color: "#e2a83e", hint: "üç ay: büyük hayal" },
};
export const TIER_ORDER: Tier[] = ["yaygin", "nadir", "destansi", "efsanevi"];
/** Fiyattan önerilen kademe (TL) */
export const tierForPrice = (tl: number): Tier => (tl <= 2000 ? "yaygin" : tl <= 6000 ? "nadir" : tl <= 15000 ? "destansi" : "efsanevi");
/** Aynı anda en fazla kaç görev (ortak dilekler ikinize de sayılır): hangi ödül için çalıştığını seçersin */
export const MAX_ACTIVE = 2;

export type Metric = "aktif_gun" | "spor_seans" | "spor_dk" | "calisma_dk" | "sayfa" | "cilt_gun" | "tam_gun" | "su_gun" | "yuz_yogasi" | "ogun" | "birlikte_dk";

// base: 30 günlük sağlam bir ayın karşılığı (Nadir kademe). perDay: günle sınırlı ölçüt (süreyi aşamaz)
export const METRICS: Record<Metric, { label: string; unit: string; emoji: string; base: number; step: number; perDay?: boolean; hint: string }> = {
  aktif_gun: { label: "Aktif gün", unit: "gün", emoji: "📅", base: 0, step: 1, perDay: true, hint: "herhangi bir şey kaydettiğin gün" },
  spor_seans: { label: "Spor", unit: "seans", emoji: "🏋️", base: 12, step: 1, hint: "haftada 3 seans" },
  spor_dk: { label: "Spor süresi", unit: "dk", emoji: "⏱️", base: 450, step: 30, hint: "haftada ~1,5 saat" },
  calisma_dk: { label: "Çalışma", unit: "dk", emoji: "💻", base: 1800, step: 60, hint: "günde ~1 saat" },
  sayfa: { label: "Okuma", unit: "sayfa", emoji: "📖", base: 300, step: 10, hint: "günde ~10 sayfa" },
  cilt_gun: { label: "Cilt rutini", unit: "gün", emoji: "🧴", base: 24, step: 1, perDay: true, hint: "rutinden en az bir adım" },
  tam_gun: { label: "Tam gün", unit: "gün", emoji: "⭐", base: 18, step: 1, perDay: true, hint: "o günün her şeyi tamam" },
  su_gun: { label: "Su hedefi", unit: "gün", emoji: "💧", base: 20, step: 1, perDay: true, hint: "günlük bardak hedefin" },
  yuz_yogasi: { label: "Yüz yogası", unit: "seans", emoji: "🧘", base: 10, step: 1, hint: "haftada 2-3" },
  ogun: { label: "Öğün", unit: "öğün", emoji: "🥗", base: 60, step: 5, hint: "plandaki öğünler" },
  birlikte_dk: { label: "Birlikte çalışma", unit: "dk", emoji: "❤️", base: 300, step: 30, hint: "aynı anda sayaç" },
};
export const METRIC_ORDER: Metric[] = ["calisma_dk", "spor_seans", "spor_dk", "sayfa", "cilt_gun", "tam_gun", "su_gun", "yuz_yogasi", "ogun", "birlikte_dk"];

export type Goal = { metric: Metric; target: number };

/** Ölçütün kademeye göre hedefi */
export function targetFor(m: Metric, tier: Tier): number {
  const t = TIERS[tier], M = METRICS[m];
  if (m === "aktif_gun") return Math.ceil(t.days * t.active);
  let v = (M.base * t.days * t.intensity) / 30;
  if (M.perDay) v = Math.min(v, Math.floor(t.days * 0.95));
  return Math.max(M.step, Math.round(v / M.step) * M.step);
}
/** Hedef en fazla %20 hafifletilebilir: ödül kolaylaşmasın */
export const minTarget = (m: Metric, tier: Tier) => Math.max(1, Math.floor(targetFor(m, tier) * 0.8));
/** Kademe ve seçilen ölçütlerden görev: her zaman aktif gün koşulu + en fazla 4 ölçüt */
export const goalsFor = (tier: Tier, metrics: Metric[]): Goal[] => [
  { metric: "aktif_gun", target: targetFor("aktif_gun", tier) },
  ...metrics.filter((m) => m !== "aktif_gun").slice(0, 4).map((metric) => ({ metric, target: targetFor(metric, tier) })),
];

export const fmtMetric = (m: Metric, v: number) =>
  m === "calisma_dk" || m === "birlikte_dk" || m === "spor_dk" ? (v >= 60 ? `${Math.floor(v / 60)} sa${v % 60 ? ` ${v % 60} dk` : ""}` : `${v} dk`) : `${v} ${METRICS[m].unit}`;

/* -------------------------------- kategoriler -------------------------------- */

export type WishCat =
  | "parfum" | "makyaj" | "cilt" | "taki" | "canta" | "kiyafet" | "ayakkabi" | "aksesuar"
  | "klavye" | "mouse" | "monitor" | "kulaklik" | "donanim" | "kitap" | "ortacag" | "tablo" | "aydinlatma" | "deneyim" | "diger";

export const WISH_CATS: Record<WishCat, { label: string; emoji: string; color: string }> = {
  parfum: { label: "Parfüm", emoji: "🌸", color: "#e48aa0" },
  makyaj: { label: "Makyaj", emoji: "💄", color: "#d8485a" },
  cilt: { label: "Cilt bakımı", emoji: "🧴", color: "#f2c4b0" },
  taki: { label: "Takı", emoji: "💍", color: "#e2b45a" },
  canta: { label: "Çanta", emoji: "👜", color: "#a8454e" },
  kiyafet: { label: "Kıyafet", emoji: "👗", color: "#9a6ad6" },
  ayakkabi: { label: "Ayakkabı", emoji: "👠", color: "#3a2a40" },
  aksesuar: { label: "Aksesuar", emoji: "🕶️", color: "#6f86d6" },
  klavye: { label: "Klavye", emoji: "⌨️", color: "#7fd1b9" },
  mouse: { label: "Mouse", emoji: "🖱️", color: "#9fd0e8" },
  monitor: { label: "Monitör", emoji: "🖥️", color: "#5a9ac8" },
  kulaklik: { label: "Kulaklık", emoji: "🎧", color: "#c9a6f0" },
  donanim: { label: "Donanım", emoji: "🔐", color: "#4f7a4f" },
  kitap: { label: "Kitap", emoji: "📚", color: "#8a3a4a" },
  ortacag: { label: "Ortaçağ", emoji: "⚔️", color: "#c8ccd8" },
  tablo: { label: "Tablo", emoji: "🖼️", color: "#c89a3e" },
  aydinlatma: { label: "Aydınlatma", emoji: "🕯️", color: "#f0a24a" },
  deneyim: { label: "Deneyim", emoji: "🎟️", color: "#f0a24a" },
  diger: { label: "Diğer", emoji: "🎁", color: "#b56b7a" },
};
export const CAT_ORDER = Object.keys(WISH_CATS) as WishCat[];

/* --------------------------------- öneriler --------------------------------- */
// Fikir vermek için: dokununca form dolar, fiyatı ve bağlantıyı siz eklersiniz.

export type Suggestion = { title: string; brand: string; cat: WishCat; tier: Tier; metrics: Metric[]; note?: string };
/** Öneri için alışveriş araması (fiyat ve stok değiştiği için tek ürün sayfası yerine arama sonuçları) */
export const shopLink = (s: Pick<Suggestion, "title" | "brand">) =>
  `https://www.google.com/search?tbm=shop&q=${encodeURIComponent([s.brand, s.title.replace(/\s*\(.*?\)\s*/g, " ")].filter(Boolean).join(" ").trim())}`;

export const SUGGESTIONS: Record<"aysenur" | "cengiz" | "ortak", Suggestion[]> = {
  aysenur: [
    { title: "Addict Lip Glow", brand: "Dior", cat: "makyaj", tier: "yaygin", metrics: ["cilt_gun", "su_gun"] },
    { title: "Rouge Pur Couture ruj", brand: "YSL", cat: "makyaj", tier: "yaygin", metrics: ["cilt_gun", "spor_seans"] },
    { title: "Lash Idôle maskara", brand: "Lancôme", cat: "makyaj", tier: "yaygin", metrics: ["yuz_yogasi", "cilt_gun"] },
    { title: "Backstage far paleti", brand: "Dior", cat: "makyaj", tier: "nadir", metrics: ["cilt_gun", "calisma_dk", "spor_seans"] },
    { title: "Advanced Génifique serum", brand: "Lancôme", cat: "cilt", tier: "nadir", metrics: ["cilt_gun", "su_gun", "yuz_yogasi"] },
    { title: "La Vie Est Belle EDP", brand: "Lancôme", cat: "parfum", tier: "nadir", metrics: ["calisma_dk", "spor_seans", "cilt_gun"] },
    { title: "Libre EDP", brand: "YSL", cat: "parfum", tier: "nadir", metrics: ["calisma_dk", "spor_seans", "cilt_gun"] },
    { title: "Miss Dior EDP", brand: "Dior", cat: "parfum", tier: "destansi", metrics: ["calisma_dk", "spor_seans", "tam_gun"] },
    { title: "İnci küpe", brand: "", cat: "taki", tier: "nadir", metrics: ["calisma_dk", "sayfa", "cilt_gun"] },
    { title: "İnce altın kolye", brand: "", cat: "taki", tier: "destansi", metrics: ["calisma_dk", "spor_seans", "tam_gun"] },
    { title: "Özel gün elbisesi", brand: "", cat: "kiyafet", tier: "nadir", metrics: ["spor_seans", "spor_dk", "ogun"] },
    { title: "Deri omuz çantası", brand: "", cat: "canta", tier: "destansi", metrics: ["calisma_dk", "spor_seans", "tam_gun"] },
    { title: "Pırlanta bileklik", brand: "", cat: "taki", tier: "efsanevi", metrics: ["calisma_dk", "spor_seans", "tam_gun", "sayfa"] },
  ],
  cengiz: [
    { title: "Kablosuz hafif oyuncu mouse", brand: "", cat: "mouse", tier: "yaygin", metrics: ["calisma_dk", "spor_seans"] },
    { title: "YubiKey 5 NFC güvenlik anahtarı", brand: "Yubico", cat: "donanim", tier: "yaygin", metrics: ["calisma_dk", "sayfa"] },
    { title: "Deri kaplı ortaçağ defteri", brand: "", cat: "ortacag", tier: "yaygin", metrics: ["sayfa", "calisma_dk"] },
    { title: "Mekanik klavye (75%, hot-swap)", brand: "", cat: "klavye", tier: "nadir", metrics: ["calisma_dk", "spor_seans", "sayfa"] },
    { title: "Raspberry Pi 5 ev laboratuvarı", brand: "Raspberry Pi", cat: "donanim", tier: "nadir", metrics: ["calisma_dk", "sayfa"], note: "ağ ve güvenlik denemeleri için" },
    { title: "Sauvage EDP", brand: "Dior", cat: "parfum", tier: "nadir", metrics: ["spor_seans", "calisma_dk", "tam_gun"] },
    { title: "Dior Homme Intense", brand: "Dior", cat: "parfum", tier: "nadir", metrics: ["spor_seans", "calisma_dk", "tam_gun"] },
    { title: "La Nuit de L'Homme", brand: "YSL", cat: "parfum", tier: "nadir", metrics: ["spor_seans", "calisma_dk", "tam_gun"] },
    { title: "Bleu de Chanel EDP", brand: "Chanel", cat: "parfum", tier: "destansi", metrics: ["spor_seans", "calisma_dk", "tam_gun"] },
    { title: "Ortaçağ abajuru (dövme demir, mum ışığı)", brand: "", cat: "aydinlatma", tier: "nadir", metrics: ["calisma_dk", "sayfa", "spor_seans"], note: "çalışma masasına" },
    { title: "Jon Snow tablosu (çerçeveli)", brand: "", cat: "tablo", tier: "nadir", metrics: ["calisma_dk", "spor_seans", "sayfa"], note: "odanın duvarına" },
    { title: "Kuzey kalesi ve kurt tablosu", brand: "", cat: "tablo", tier: "destansi", metrics: ["calisma_dk", "spor_seans", "tam_gun"] },
    { title: "Y EDP", brand: "YSL", cat: "parfum", tier: "nadir", metrics: ["spor_seans", "calisma_dk", "tam_gun"] },
    { title: "Çerçeveli ortaçağ gravürü", brand: "", cat: "tablo", tier: "nadir", metrics: ["calisma_dk", "sayfa", "spor_seans"], note: "odanın duvarına" },
    { title: "27\" 1440p 165 Hz monitör", brand: "", cat: "monitor", tier: "destansi", metrics: ["calisma_dk", "spor_seans", "tam_gun"] },
    { title: "Gürültü engelleyici kulaklık", brand: "", cat: "kulaklik", tier: "destansi", metrics: ["calisma_dk", "birlikte_dk", "spor_seans"] },
    { title: "Flipper Zero", brand: "", cat: "donanim", tier: "destansi", metrics: ["calisma_dk", "sayfa", "spor_seans"], note: "kendi cihazlarında güvenlik araştırması için" },
    { title: "34\" ultra geniş monitör", brand: "", cat: "monitor", tier: "efsanevi", metrics: ["calisma_dk", "spor_seans", "tam_gun", "sayfa"] },
    { title: "Duvar askılı şövalye kılıcı replikası", brand: "", cat: "ortacag", tier: "efsanevi", metrics: ["calisma_dk", "spor_seans", "tam_gun", "sayfa"] },
  ],
  ortak: [
    { title: "Güzel bir akşam yemeği", brand: "", cat: "deneyim", tier: "yaygin", metrics: ["birlikte_dk", "spor_seans"] },
    { title: "Konser ya da tiyatro", brand: "", cat: "deneyim", tier: "nadir", metrics: ["birlikte_dk", "calisma_dk", "spor_seans"] },
    { title: "Kale ve ortaçağ festivali gezisi", brand: "", cat: "deneyim", tier: "destansi", metrics: ["birlikte_dk", "calisma_dk", "spor_seans"] },
    { title: "Birlikte hafta sonu kaçamağı", brand: "", cat: "deneyim", tier: "efsanevi", metrics: ["birlikte_dk", "calisma_dk", "spor_seans", "tam_gun"] },
  ],
};

/* ---------------------------------- türler ---------------------------------- */

export type Progress = { userId: string; values: Partial<Record<Metric, number>> };
export type Wish = {
  id: string; userId: string; title: string; brand: string; cat: WishCat; tier: Tier; price: number | null; link: string; note: string;
  photo: string | null; photoId: string | null; shared: boolean; goals: Goal[]; days: number; status: WishStatus;
  startDay: string | null; endDay: string | null; daysLeft: number | null; expired: boolean; attempts: number;
  earnedAt: string | null; claimedAt: string | null; progress: Progress[];
};

/** Görevin ilerlemesi (0-1): her koşulun oranının ortalaması, ortakta en geride olanınki */
export function wishPct(w: Pick<Wish, "goals" | "progress">): number {
  if (!w.progress.length) return 0;
  return Math.min(...w.progress.map((p) => w.goals.reduce((n, g) => n + Math.min(1, (p.values[g.metric] ?? 0) / g.target), 0) / w.goals.length));
}
export const goalsMet = (goals: Goal[], values: Partial<Record<Metric, number>>) => goals.every((g) => (values[g.metric] ?? 0) >= g.target);

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  console.assert(targetFor("calisma_dk", "nadir") === 1800 && targetFor("aktif_gun", "nadir") === 23, "nadir hedefler");
  console.assert(targetFor("cilt_gun", "efsanevi") <= 85 && targetFor("spor_seans", "yaygin") === 5, "gün sınırı ve yuvarlama");
  console.assert(minTarget("calisma_dk", "nadir") === 1440, "en fazla %20 hafifletme");
}
