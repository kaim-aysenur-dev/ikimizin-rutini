import Link from "next/link";
import { METRICS, TIERS, WISH_CATS, type Wish, fmtMetric, wishPct } from "@/lib/wishes";

// Bugün sayfasında: süren ödül görevlerin, ne kadar kaldığı ve bugün en çok neye ihtiyacın olduğu.
// Görev yoksa kendine bir ödül koymaya çağırır. Dokununca Gelişim'de Dilek Dolabı açılır.
export function WishQuests({ me, wishes }: { me: string; wishes: Wish[] }) {
  const quests = wishes.filter((w) => w.status === "gorevde" && (w.userId === me || w.shared));
  const fresh = wishes.filter((w) => w.status === "kazanildi" && (w.userId === me || w.shared));
  if (!quests.length && !fresh.length) {
    return (
      <Link href="/gelisim?dolap=1" className="card wq wq-empty">
        <span aria-hidden="true">🎁</span>
        <span><b>Kendine bir ödül koy</b><small>Parfüm, klavye, kolye... Görevini tamamla, gerçekten al.</small></span>
      </Link>
    );
  }
  return (
    <Link href="/gelisim?dolap=1" className="card wq" aria-label="Ödül görevlerin: Dilek Dolabını aç">
      {fresh.map((w) => (
        <span key={w.id} className="wq-row is-won"><span aria-hidden="true">🎉</span><span className="grow"><b>{w.title}</b><small>Kazandın! Artık alabilirsin.</small></span></span>
      ))}
      {quests.map((w) => {
        const pct = Math.round(wishPct(w) * 100);
        const mine = w.progress.find((p) => p.userId === me) ?? w.progress[0];
        // bugün için: en geride kalan koşul ve günlük tempo
        const gap = w.goals
          .map((g) => ({ g, v: mine?.values[g.metric] ?? 0 }))
          .filter(({ g, v }) => v < g.target)
          .sort((a, b) => a.v / a.g.target - b.v / b.g.target)[0];
        const left = w.daysLeft ?? 0;
        const tip = w.expired ? "Süre doldu: yeniden dene" : gap
          ? METRICS[gap.g.metric].perDay ? `${METRICS[gap.g.metric].emoji} ${METRICS[gap.g.metric].label}: ${gap.g.target - gap.v} gün daha`
            : `${METRICS[gap.g.metric].emoji} bugün ~${fmtMetric(gap.g.metric, Math.ceil((gap.g.target - gap.v) / Math.max(1, left)))} ${METRICS[gap.g.metric].label.toLocaleLowerCase("tr")}`
          : "Koşullar tamam, son kontrol yapılıyor";
        return (
          <span key={w.id} className="wq-row" style={{ "--tier": TIERS[w.tier].color } as React.CSSProperties}>
            <span aria-hidden="true">{WISH_CATS[w.cat].emoji}</span>
            <span className="grow">
              <b>{w.title}</b>
              <span className="wd-bar"><i style={{ width: `${pct}%` }} /></span>
              <small>%{pct} · {w.expired ? "süre doldu" : `${left} gün kaldı`} · {tip}</small>
            </span>
          </span>
        );
      })}
    </Link>
  );
}
