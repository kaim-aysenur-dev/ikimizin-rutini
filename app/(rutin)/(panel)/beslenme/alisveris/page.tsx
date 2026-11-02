import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShoppingList } from "@/components/nutrition/shopping-list";
import { requireUser } from "@/lib/auth/session";
import { addDays, formatWeekRange, isDay, todayIstanbul, weekStart } from "@/lib/dates";
import { buildShoppingList } from "@/lib/meals";
import { getPlan, getShopping } from "@/lib/nutrition";

export const metadata: Metadata = { title: "Beslenme · Alışveriş" };

export default async function ShoppingPage({ searchParams }: PageProps<"/beslenme/alisveris">) {
  const user = await requireUser();
  const thisWeek = weekStart(todayIstanbul());
  const { hafta } = await searchParams;
  const week = isDay(hafta) ? weekStart(hafta) : thisWeek;
  const [plan, state] = await Promise.all([getPlan(user.id), getShopping(user.id, week)]);
  const href = (w: string) => (w === thisWeek ? "/beslenme/alisveris" : `/beslenme/alisveris?hafta=${w}`);

  return (
    <>
      <div className="week-nav">
        <Link href={href(addDays(week, -7))} className="icon-btn" aria-label="Önceki hafta">
          <ChevronLeft size={20} />
        </Link>
        <span className="week-range">{formatWeekRange(week)}</span>
        <Link href={href(addDays(week, 7))} className="icon-btn" aria-label="Sonraki hafta">
          <ChevronRight size={20} />
        </Link>
        {week !== thisWeek && (
          <Link href="/beslenme/alisveris" className="btn btn-quiet week-today">
            Bu hafta
          </Link>
        )}
      </div>
      <ShoppingList
        key={week}
        week={week}
        entries={buildShoppingList(plan)}
        initialChecked={state.checked}
        initialManual={state.manual}
      />
    </>
  );
}
