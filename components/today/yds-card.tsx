import Link from "next/link";
import { daysLeft } from "@/lib/yds";

type St = { done: boolean; words: number; questions: number; quota: { words: number; questions: number }; examDate: string | null } | null;

// Bugün sayfasında YDS: kendi kotan ve partnerinki; dokununca YDS Kampı açılır
export function YdsCard({ me, partner, today }: { me: St; partner: (NonNullable<St> & { name: string }) | null; today: string }) {
  if (!me && !partner) return null;
  const left = me ? daysLeft(me.examDate, today) : null;
  return (
    <Link href="/yds" className="card yds-today-card" aria-label="YDS Kampı">
      {me && (
        <span className="row">
          <b>{me.done ? "✅ YDS kotan tamam" : "📚 YDS kotan bekliyor"}</b>
          {left !== null && left > 0 && <small>sınava {left} gün</small>}
        </span>
      )}
      {me && !me.done && <small>{me.words}/{me.quota.words} kart · {me.questions}/{me.quota.questions} soru</small>}
      {partner && <small>{partner.name}: {partner.done ? "✅ bitirdi" : `${partner.words}/${partner.quota.words} kart · ${partner.questions}/${partner.quota.questions} soru`}</small>}
    </Link>
  );
}
