import type { Metadata } from "next";
import { FaceYogaView } from "@/components/face-yoga/face-yoga-view";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { getFaceYogaOverview } from "@/lib/face-yoga";

export const metadata: Metadata = { title: "Cilt · Yüz yogası" };

export default async function FaceYogaPage() {
  const user = await requireUser();
  const today = todayIstanbul();
  const overview = await getFaceYogaOverview(user.id, today);
  return <FaceYogaView key={today} today={today} overview={overview} />;
}
