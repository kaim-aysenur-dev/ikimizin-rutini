import type { Metadata } from "next";
import { GelisimWorld } from "@/components/gelisim/gelisim-world";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { placedOf, profilesOf } from "@/lib/room-server";
import { levelOf } from "@/lib/xp";
import { adventure } from "@/lib/xp-server";

export const metadata: Metadata = { title: "Gelişim" };

export default async function Page() {
  const user = await requireUser();
  const today = todayIstanbul();
  const [profiles, placed] = await Promise.all([profilesOf(user.accountId), placedOf(user.accountId)]);
  // iki profilin seviyesi: zırh rengi ve envanter kilidi
  const withLevel = await Promise.all(profiles.map(async (p) => ({ ...p, level: levelOf((await adventure(p.id, user.accountId, today)).xp).level })));
  return (
    <main className="main">
      <header className="page-head">
        <p className="eyebrow">Kendi odan ve ortak bahçe</p>
        <h1>Gelişim</h1>
      </header>
      <GelisimWorld me={user.id} profiles={withLevel} initialPlaced={placed} />
    </main>
  );
}
