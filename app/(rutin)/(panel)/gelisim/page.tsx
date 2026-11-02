import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Gelişim" };

export default async function Page() {
  await requireUser();
  return <ComingSoon eyebrow="Kendini geliştirme" title="Gelişim" items={["Alışkanlık takibi ve seriler", "Hedefler ve ara adımlar", "Haftalık değerlendirme", "Rozetler"]} />;
}
