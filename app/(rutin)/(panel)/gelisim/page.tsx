import type { Metadata } from "next";
import { GelisimWorld } from "@/components/gelisim/gelisim-world";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { placedOf, profilesOf } from "@/lib/room-server";
import { sanitizeEquipment } from "@/lib/equipment";
import { equipmentOf } from "@/lib/equipment-server";
import { myTimer } from "@/lib/study-server";
import { trophiesOf } from "@/lib/wishes-server";
import { levelOf } from "@/lib/xp";
import { adventure } from "@/lib/xp-server";

export const metadata: Metadata = { title: "Gelişim" };

export default async function Page({ searchParams }: PageProps<"/gelisim">) {
  const user = await requireUser();
  const { dolap } = await searchParams; // ?dolap=1: Dilek Dolabı açık gelir (Bugün kartından)
  const today = todayIstanbul();
  const [profiles, placed, timer, equipped] = await Promise.all([profilesOf(user.accountId), placedOf(user.accountId), myTimer(user.id), equipmentOf(user.accountId)]);
  // iki profilin seviyesi: zırh rengi ve envanter kilidi
  const withLevel = await Promise.all(profiles.map(async (p) => { const xp = (await adventure(p.id, user.accountId, today)).xp; return { ...p, xp, level: levelOf(xp).level }; }));
  // kuşanılanlar: seviyesi yetmeyen ya da artık olmayan eşyalar düşer
  const initialEquipment = Object.fromEntries(withLevel.map((p) => [p.id, sanitizeEquipment(equipped[p.id], p.level)]));
  // odadaki ödül vitrini: yalnız kendi kazandıkların (ödüller kişiye özel)
  const initialTrophies = { [user.id]: await trophiesOf(user.id) };
  return (
    <main className="main gw-main">
      <h1 className="sr-only">Gelişim</h1>
      <GelisimWorld me={user.id} profiles={withLevel} initialPlaced={placed} initialStudyTimer={timer} initialEquipment={initialEquipment} initialTrophies={initialTrophies} openWardrobe={dolap === "1"} />
    </main>
  );
}
