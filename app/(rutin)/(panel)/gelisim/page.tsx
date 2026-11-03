import type { Metadata } from "next";
import { GelisimWorld } from "@/components/gelisim/gelisim-world";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { placedOf, profilesOf } from "@/lib/room-server";
import { sanitizeEquipment } from "@/lib/equipment";
import { equipmentOf } from "@/lib/equipment-server";
import { myTimer } from "@/lib/study-server";
import { levelOf } from "@/lib/xp";
import { adventure } from "@/lib/xp-server";

export const metadata: Metadata = { title: "Gelişim" };

export default async function Page() {
  const user = await requireUser();
  const today = todayIstanbul();
  const [profiles, placed, timer, equipped] = await Promise.all([profilesOf(user.accountId), placedOf(user.accountId), myTimer(user.id), equipmentOf(user.accountId)]);
  // iki profilin seviyesi: zırh rengi ve envanter kilidi
  const withLevel = await Promise.all(profiles.map(async (p) => ({ ...p, level: levelOf((await adventure(p.id, user.accountId, today)).xp).level })));
  // kuşanılanlar: seviyesi yetmeyen ya da artık olmayan eşyalar düşer
  const initialEquipment = Object.fromEntries(withLevel.map((p) => [p.id, sanitizeEquipment(equipped[p.id], p.level)]));
  return (
    <main className="main gw-main">
      <h1 className="sr-only">Gelişim</h1>
      <GelisimWorld me={user.id} profiles={withLevel} initialPlaced={placed} initialStudyTimer={timer} initialEquipment={initialEquipment} />
    </main>
  );
}
