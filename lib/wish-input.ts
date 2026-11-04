import "server-only";
import { ownsPublicId } from "./cloudinary";
import { intIn, text } from "./validate";
import { CAT_ORDER, type Goal, METRICS, type Metric, TIERS, type Tier, type WishCat, minTarget, targetFor } from "./wishes";
import type { WishInput } from "./wishes-server";

// Dilek isteklerinin doğrulaması. Geçersizse Türkçe hata metni döner.
// Koşullar kademenin önerisinden en fazla %20 hafifletilebilir, en fazla 3 katına çıkarılabilir.

type Body = Record<string, unknown> | null;

function parseGoals(raw: unknown, tier: Tier): Goal[] | string {
  if (!Array.isArray(raw)) return "Görev koşulları eksik.";
  const seen = new Set<Metric>();
  const goals: Goal[] = [];
  for (const g of raw) {
    const m = (g as { metric?: unknown })?.metric;
    if (typeof m !== "string" || !(m in METRICS) || seen.has(m as Metric)) return "Geçersiz görev koşulu.";
    const metric = m as Metric;
    const target = intIn((g as { target?: unknown }).target, minTarget(metric, tier), targetFor(metric, tier) * 3);
    if (target === null) return `${METRICS[metric].label}: hedef ${minTarget(metric, tier)} ile ${targetFor(metric, tier) * 3} arasında olmalı.`;
    seen.add(metric); goals.push({ metric, target });
  }
  if (!seen.has("aktif_gun")) goals.unshift({ metric: "aktif_gun", target: targetFor("aktif_gun", tier) });
  if (goals.length < 2) return "En az bir ölçüt seç (çalışma, spor, okuma...).";
  if (goals.length > 5) return "En fazla 4 ölçüt seçilebilir.";
  return goals;
}

/** keepPhoto: dileğin şu anki fotoğrafı (başkası yüklediyse de olduğu gibi kalabilir) */
export function parseWish(b: Body, userId: string, keepPhoto: string | null = null): WishInput | string {
  const title = text(b?.title, 80);
  if (!title) return "Dileğin adı boş olamaz.";
  const tier = typeof b?.tier === "string" && b.tier in TIERS ? (b.tier as Tier) : null;
  if (!tier) return "Kademe seçilmedi.";
  const cat = CAT_ORDER.includes(b?.cat as WishCat) ? (b!.cat as WishCat) : "diger";
  // fiyat sayı ya da "3000" / "3.000" / "3 000" gibi yazı olarak gelebilir
  const rawPrice = typeof b?.price === "string" ? (b.price.trim() === "" ? "" : Number(b.price.replace(/[.\s]/g, ""))) : b?.price;
  const price = rawPrice == null || rawPrice === "" ? null : intIn(rawPrice, 0, 10_000_000);
  if (price === null && rawPrice != null && rawPrice !== "") return "Fiyat geçersiz: tam sayı olarak yaz (ör. 3000).";
  const link = text(b?.link, 500);
  if (link && !/^https?:\/\/\S+$/i.test(link)) return "Bağlantı http:// ya da https:// ile başlamalı.";
  const photo = b?.photo == null || b.photo === "" ? null : ownsPublicId(userId, "dilek", b.photo) || (keepPhoto !== null && b.photo === keepPhoto) ? (b.photo as string) : undefined;
  if (photo === undefined) return "Fotoğraf geçersiz.";
  const goals = parseGoals(b?.goals, tier);
  if (typeof goals === "string") return goals;
  return { title, brand: text(b?.brand, 60), cat, tier, price, link, note: text(b?.note, 300), photo, shared: b?.shared === true, goals };
}
