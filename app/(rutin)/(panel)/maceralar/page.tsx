import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { adventure } from "@/lib/xp-server";
import { todayIstanbul } from "@/lib/dates";
import { levelOf } from "@/lib/xp";
import { equipmentOf } from "@/lib/equipment-server";
import { sanitizeEquipment } from "@/lib/equipment";
import { ExpeditionWorld } from "@/components/gelisim/expedition-world";

export const metadata: Metadata = { title: "Şatonun Ötesi" };
export default async function Page() {
  const user = await requireUser();
  const [adv, equipped] = await Promise.all([adventure(user.id, user.accountId, todayIstanbul()), equipmentOf(user.accountId)]);
  const level = levelOf(adv.xp).level;
  return <main className="main gw-main"><ExpeditionWorld hero={{ id: user.id, name: user.displayName, level, equipment: sanitizeEquipment(equipped[user.id], level) }} /></main>;
}
