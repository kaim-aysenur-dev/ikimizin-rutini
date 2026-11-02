import type { Metadata } from "next";
import { JournalForm, JournalList } from "@/components/skin/journal";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { getJournal } from "@/lib/skin";
import type { SkinMetric } from "@/lib/slots";

export const metadata: Metadata = { title: "Cilt · Günlük" };

export default async function JournalPage() {
  const user = await requireUser();
  const entries = await getJournal(user.id, 120);
  const metrics = user.skinMetrics as SkinMetric[];
  const items = entries.map(({ day, scores, note, photoThumb, photoLarge }) => ({ day, scores, note, photoThumb, photoLarge }));

  return (
    <div className="journal-layout">
      <JournalForm today={todayIstanbul()} metrics={metrics} entries={items} />
      <section aria-labelledby="gecmis">
        <h2 id="gecmis" className="section-title">
          Geçmiş kayıtlar
        </h2>
        <JournalList entries={items} metrics={metrics} />
      </section>
    </div>
  );
}
