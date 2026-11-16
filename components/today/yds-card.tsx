import Link from "next/link";
import { MODES, type Mode, daysLeft } from "@/lib/yds";

type St = { done: boolean; words: number; questions: number; quota: { words: number; questions: number }; examDate: string | null; mode: Mode } | null;

// Bugün sayfasında İngilizce (YDS ya da genel): kendi kotan ve partnerinki; dokununca bölüm açılır
export function YdsCard({ me, partner, today }: { me: St; partner: (NonNullable<St> & { name: string }) | null; today: string }) {
  if (!me && !partner) return null;
  const left = me ? daysLeft(me.examDate, today) : null;
  return (
    <Link href="/ingilizce" className="card yds-today-card" aria-label="İngilizce">
      {me && (
        <span className="row">
          <b>{me.done ? `✅ ${MODES[me.mode].name} kotan tamam` : `📚 ${MODES[me.mode].name} kotan bekliyor`}</b>
          {left !== null && left > 0 && <small>sınava {left} gün</small>}
        </span>
      )}
      {me && !me.done && <small>{me.words}/{me.quota.words} kart · {me.questions}/{me.quota.questions} {me.mode === "yds" ? "soru" : "dk pratik"}</small>}
      {partner && <small>{partner.name} ({MODES[partner.mode].name}): {partner.done ? "✅ bitirdi" : `${partner.words}/${partner.quota.words} kart · ${partner.questions}/${partner.quota.questions} ${partner.mode === "yds" ? "soru" : "dk pratik"}`}</small>}
    </Link>
  );
}
