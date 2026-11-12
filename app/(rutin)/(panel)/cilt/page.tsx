import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { WeekGrid } from "@/components/skin/week-grid";
import { requireUser } from "@/lib/auth/session";
import { addDays, formatWeekRange, isDay, todayIstanbul, weekDays, weekStart } from "@/lib/dates";
import { getCheckKeys, getRoutine } from "@/lib/skin";

export const metadata: Metadata = { title: "Cilt · Haftalık takip" };

export default async function SkinTrackingPage({ searchParams }: PageProps<"/cilt">) {
  const user = await requireUser();
  const today = todayIstanbul();
  const thisMonday = weekStart(today);
  const { hafta } = await searchParams;
  const monday = isDay(hafta) ? weekStart(hafta) : thisMonday;
  const days = weekDays(monday);

  const [items, checks] = await Promise.all([getRoutine(user.id), getCheckKeys(user.id, days[0]!, days[6]!)]);

  if (!items.length) {
    return (
      <div className="empty">
        <span className="empty-icon">
          <Plus size={26} />
        </span>
        <h2>Henüz ürün yok</h2>
        <p>Ürünlerini ekleyip zaman gruplarına yerleştirince haftalık takip burada oluşur.</p>
        <Link href="/cilt/urunler/yeni" className="btn btn-primary">
          <Plus size={18} /> Ürün ekle
        </Link>
      </div>
    );
  }

  const href = (m: string) => (m === thisMonday ? "/cilt" : `/cilt?hafta=${m}`);
  return (
    <WeekGrid
      key={monday}
      days={days}
      today={today}
      rangeLabel={formatWeekRange(monday)}
      prevHref={href(addDays(monday, -7))}
      nextHref={href(addDays(monday, 7))}
      thisWeekHref={monday === thisMonday ? null : "/cilt"}
      items={items}
      initialChecks={checks}
    />
  );
}
