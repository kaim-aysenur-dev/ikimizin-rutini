import type { Metadata } from "next";
import { YdsExamsView } from "@/components/yds/exams-view";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { ydsOverview } from "@/lib/yds-server";

export const metadata: Metadata = { title: "Denemeler · YDS" };

export default async function Page() {
  const user = await requireUser();
  const today = todayIstanbul();
  const d = await ydsOverview(user, today);
  return <YdsExamsView initial={d.exams} target={d.settings.target} today={today} />;
}
