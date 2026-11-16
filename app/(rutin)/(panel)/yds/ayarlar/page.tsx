import type { Metadata } from "next";
import { YdsSettingsForm } from "@/components/yds/settings-form";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { settingsOf } from "@/lib/yds-server";

export const metadata: Metadata = { title: "Ayarlar · YDS" };

export default async function Page() {
  const user = await requireUser();
  return <YdsSettingsForm initial={await settingsOf(user.id)} today={todayIstanbul()} />;
}
