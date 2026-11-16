import type { Metadata } from "next";
import { GelisimWorld } from "@/components/gelisim/gelisim-world";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { placedOf, profilesOf } from "@/lib/room-server";
import { sanitizeEquipment } from "@/lib/equipment";
import { equipmentOf, stylesOf } from "@/lib/equipment-server";
import { battleLog } from "@/lib/battle-server";
import { myTimer } from "@/lib/study-server";
import { trophiesOf } from "@/lib/wishes-server";
import { outfitOf } from "@/lib/outfit-server";
import { studyIdleOf } from "@/lib/care-server";
import { ydsStatus } from "@/lib/yds-server";
import { levelOf } from "@/lib/xp";
import { adventure } from "@/lib/xp-server";

export const metadata: Metadata = { title: "Gelişim" };

export default async function Page({ searchParams }: PageProps<"/gelisim">) {
  const user = await requireUser();
  const { dolap } = await searchParams; // ?dolap=1: Dilek Dolabı açık gelir (Bugün kartından)
  const today = todayIstanbul();
  const [profiles, placed, timer, equipped, styles, log, mine] = await Promise.all([profilesOf(user.accountId), placedOf(user.accountId), myTimer(user.id), equipmentOf(user.accountId), stylesOf(user.accountId), battleLog(user.id, today), adventure(user.id, user.accountId, today)]);
  // iki profilin seviyesi: zırh rengi ve envanter kilidi
  const withLevel = await Promise.all(profiles.map(async (p) => { const xp = (await adventure(p.id, user.accountId, today)).xp; return { ...p, xp, level: levelOf(xp).level }; }));
  // kuşanılanlar: seviyesi yetmeyen ya da artık olmayan eşyalar düşer
  const initialEquipment = Object.fromEntries(withLevel.map((p) => [p.id, sanitizeEquipment(equipped[p.id], p.level)]));
  // odadaki ödül vitrini: her evde o evin sahibinin kazandıkları (yalnız kategori; dilek ayrıntıları dolapta, kişiye özel)
  const initialTrophies = Object.fromEntries(await Promise.all(profiles.map(async (p) => [p.id, await trophiesOf(p.id)] as const)));
  // giydirme ekranındaki kombinler (dünyada zırh yoksa bu renklerle) ve masaların tozu için son çalışma
  const whoOf = (name: string) => (/ay[sş]enur/i.test(name) ? "aysenur" : "cengiz");
  const [wearList, studyIdle] = await Promise.all([Promise.all(profiles.map(async (p) => [p.id, await outfitOf(p.id, whoOf(p.name))] as const)), studyIdleOf(profiles.map((p) => p.id), today)]);
  const initialWear = Object.fromEntries(wearList);
  const ydsLock = await ydsStatus(user.id, today); // YDS kotası bitmeden kilitlenenler
  return (
    <main className="main gw-main">
      <h1 className="sr-only">Gelişim</h1>
      <GelisimWorld me={user.id} profiles={withLevel} initialPlaced={placed} initialStudyTimer={timer} initialEquipment={initialEquipment} initialTrophies={initialTrophies} openWardrobe={dolap === "1"} initialWear={initialWear} studyIdle={studyIdle} ydsLock={ydsLock} initialStyles={styles} progress={{ level: levelOf(mine.xp).level, stats: mine.stats, cleared: log.cleared }} />
    </main>
  );
}
