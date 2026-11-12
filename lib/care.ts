// Bakım aynası: rutindeki her adım bir bölgeye (yüz, saç, diş, vücut) ve bir uygulama animasyonuna bağlanır.
// Ürünlerde tür alanı yok; ad, amaç ve uygulama bölgesindeki kelimelerden çıkarılır (gerçek rutinlere göre ayarlı).
// Bölge puanları son günlerdeki düzenden gelir: bakım yapıldıkça iyileşir, yapılmadıkça yavaş yavaş kötüleşir.

export type Area = "yuz" | "sac" | "dis" | "vucut";
export type Effect = "kopuk" | "tonik" | "serum" | "krem" | "maske" | "gunes" | "peeling" | "dis" | "sac" | "sampuan" | "vucut" | "deodorant" | "onarim" | "parilti";

const has = (s: string, re: RegExp) => re.test(s);

/** Adımın bölgesi ve animasyonu (Türkçe ve İngilizce kelimelerle) */
export function careOf(text: string): { area: Area; effect: Effect } {
  const s = text.toLocaleLowerCase("tr");
  if (has(s, /diş|dis macun|ağız|gargara|floss|tooth/)) return { area: "dis", effect: "dis" };
  if (has(s, /şampuan|shampoo/)) return { area: "sac", effect: "sampuan" };
  if (has(s, /saç|keratin|hair/)) return { area: "sac", effect: "sac" };
  if (has(s, /deodorant|deo |deo-|roll-on|koltuk/)) return { area: "vucut", effect: "deodorant" };
  if (has(s, /hametan|repair|onarı|kesik|yanık|tahriş/)) return { area: "yuz", effect: "onarim" };
  const body = has(s, /vücut|body|sabun|fırça|balsam|bacak|kollar|el kremi/) && !has(s, /yüz|face/);
  if (has(s, /scrub|peeling|exfol/)) return { area: body ? "vucut" : "yuz", effect: "peeling" };
  if (body) return { area: "vucut", effect: "vucut" };
  if (has(s, /maske|mask/)) return { area: "yuz", effect: "maske" };
  if (has(s, /güneş|gunes|spf|sun/)) return { area: "yuz", effect: "gunes" };
  if (has(s, /köpü|kopu|foam|temizle|yıka|cleans|jel/)) return { area: "yuz", effect: "kopuk" };
  if (has(s, /tonik|toner|mist|esans|essence/)) return { area: "yuz", effect: "tonik" };
  if (has(s, /serum|ampul|niacin|retinol|vitamin c|hyaluron/)) return { area: "yuz", effect: "serum" };
  if (has(s, /nemlend|krem|cream|atoderm|losyon|lotion|balm/)) return { area: "yuz", effect: "krem" };
  return { area: "yuz", effect: "parilti" };
}

export type CareState = {
  areas: Record<Area, number | null>; // 0-1; o bölgede günlük adım yoksa null
  neglect: number; // hiçbir bakım yapılmayan ardışık gün (bugün hariç)
  study: { score: number; idleDays: number; todayMin: number }; // çalışma: son 7 günün düzeni, son çalışmadan beri gün
};

export const AREA_NAME: Record<Area, string> = { yuz: "Cilt", sac: "Saç", dis: "Dişler", vucut: "Vücut" };

/** Bölge puanından bir söz: ayna altındaki durum satırı */
export function areaWord(a: Area, v: number | null): string {
  if (v === null) return "rutinde yok";
  if (a === "yuz") return v >= 0.8 ? "ışıl ışıl" : v >= 0.55 ? "iyi" : v >= 0.3 ? "yorgun, kurumaya başladı" : "bakım istiyor";
  if (a === "sac") return v >= 0.8 ? "parlak" : v >= 0.55 ? "iyi" : v >= 0.3 ? "elektriklenmiş" : "yıpranmış";
  if (a === "dis") return v >= 0.8 ? "bembeyaz" : v >= 0.55 ? "iyi" : v >= 0.3 ? "matlaşıyor" : "fırça bekliyor";
  return v >= 0.8 ? "yumuşacık" : v >= 0.55 ? "iyi" : v >= 0.3 ? "kuru" : "bakım istiyor";
}
export function studyWord(s: CareState["study"]): string {
  if (s.todayMin >= 60 || s.score >= 0.8) return "zihin parlak: odak yerinde";
  if (s.idleDays >= 5) return `${s.idleDays} gündür çalışılmadı: kafa uykulu, örümcek ağı bağlıyor`;
  if (s.idleDays >= 2) return `${s.idleDays} gündür çalışılmadı: biraz dalgın`;
  return s.score >= 0.4 ? "zihin iyi" : "biraz çalışmak iyi gelir";
}

/** Bugün işaretlenen adımın puana anında etkisi (sunucuya dönmeden ayna tepki versin) */
export const bump = (v: number | null, done: boolean, steps: number) => (v === null ? null : Math.max(0, Math.min(1, v + (done ? 1 : -1) * (0.35 / Math.max(1, steps)))));

// kendi kendini denetler: gerçek rutinlerdeki adlar doğru bölgeye düşmeli
if (process.env.NODE_ENV !== "production") {
  const ok = (t: string, e: Effect) => console.assert(careOf(t).effect === e, `careOf: ${t} → ${careOf(t).effect}, beklenen ${e}`);
  ok("Yüz temizleme köpüğü yüz yıkama", "kopuk"); ok("Facial Cleansing Foam Yüz yıkama", "kopuk"); ok("Longevity Serum Yüz ve boyun", "serum");
  ok("Atoderm Cream Ultra Nemlendirici", "krem"); ok("bioderma atoderm nemlendirme Yüz ve Boyun", "krem"); ok("HydraShield Face Mask", "maske");
  ok("Papatya Özlü Florürsüz Jel Diş Macunu", "dis"); ok("Regenerating Hair Shampoo", "sampuan"); ok("Keratin koruyucu yağ saç", "sac");
  ok("Elixir Body Butter vücut nemlendirme", "vucut"); ok("Elixir Body Scrub vücut peelingi", "peeling"); ok("Aura Deo Roll-on Koltuk altı", "deodorant");
  ok("Hametan Krem kesik yanık", "onarim");
}

/** Bakım adımı işaretlenince (Cilt, Bugün) yayılan olay: ayna animasyonu oynatır */
export const CARE_EVENT = "bakim:isaret";
export type CareEventDetail = { day: string; itemId: string; done: boolean };
