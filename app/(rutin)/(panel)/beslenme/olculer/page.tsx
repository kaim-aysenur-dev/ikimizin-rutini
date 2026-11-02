import type { Metadata } from "next";
import { BodyMetrics } from "@/components/nutrition/body-metrics";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { getBodyMetrics } from "@/lib/nutrition";

export const metadata: Metadata = { title: "Beslenme · Ölçüler" };

export default async function BodyMetricsPage() {
  const user = await requireUser();
  const entries = await getBodyMetrics(user.id);
  return <BodyMetrics entries={entries} today={todayIstanbul()} />;
}
