import type { Metadata } from "next";
import { Treasury } from "@/components/treasury";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { adventure } from "@/lib/xp-server";

export const metadata: Metadata = { title: "Hazine" };

export default async function Page() {
  const user = await requireUser();
  const { xp } = await adventure(user.id, user.accountId, todayIstanbul());
  return (
    <main className="main narrow">
      <header className="page-head">
        <p className="eyebrow">Seviye seviye kazanılanlar</p>
        <h1>Hazine</h1>
      </header>
      <Treasury xp={xp} />
    </main>
  );
}
