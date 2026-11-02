import "server-only";
import { str } from "@/lib/http";
import { ownsPublicId } from "@/lib/cloudinary";
import { isSlot, type Slot } from "@/lib/slots";
import type { ProductInput } from "@/lib/skin";

/** İstekten gelen ürün verisini doğrular. Hata varsa Türkçe mesaj döner. */
export function parseProductInput(userId: string, body: Record<string, unknown> | null): ProductInput | string {
  if (!body) return "Geçersiz istek.";
  const name = str(body.name, 120);
  if (name.length < 2) return "Ürün adı en az 2 karakter olmalı.";

  const slots = Array.isArray(body.slots) ? [...new Set(body.slots.filter(isSlot))] : [];
  const timers = Array.isArray(body.timers)
    ? [...new Set(body.timers.filter((t): t is number => Number.isInteger(t) && t >= 10 && t <= 3 * 3600))]
        .sort((a, b) => a - b)
        .slice(0, 3)
    : [];
  const weeklyTarget = Number(body.weeklyTarget);
  if (slots.includes("haftalik") && !(Number.isInteger(weeklyTarget) && weeklyTarget >= 1 && weeklyTarget <= 7)) {
    return "Haftalık hedef 1 ile 7 arasında olmalı.";
  }

  let imagePublicId: string | null | undefined;
  if ("imagePublicId" in body) {
    if (body.imagePublicId === null) imagePublicId = null;
    else if (ownsPublicId(userId, "urun", body.imagePublicId)) imagePublicId = body.imagePublicId;
    else return "Geçersiz fotoğraf.";
  }

  return {
    name,
    brand: str(body.brand, 80),
    purpose: str(body.purpose, 200),
    area: str(body.area, 200),
    duration: str(body.duration, 200),
    usageTime: str(body.usageTime, 120),
    ingredients: str(body.ingredients, 1000),
    note: str(body.note, 1000),
    label: str(body.label, 60),
    timers,
    slots: slots as Slot[],
    weeklyTarget: slots.includes("haftalik") ? weeklyTarget : null,
    imagePublicId,
  };
}
