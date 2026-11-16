import type { Metadata } from "next";
import { YdsTodayView } from "@/components/yds/today-view";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { defaultMode } from "@/lib/yds";
import { ydsOverview } from "@/lib/yds-server";

export const metadata: Metadata = { title: "İngilizce" };

export default async function Page() {
  const user = await requireUser();
  const today = todayIstanbul();
  return <YdsTodayView initial={await ydsOverview(user, today, defaultMode(user.displayName))} today={today} />;
}
