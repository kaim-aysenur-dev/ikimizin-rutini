import type { Metadata } from "next";
import { VideoLibrary } from "@/components/sport/video-library";
import { requireUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { listTypes, listVideos } from "@/lib/sport-activities";

export const metadata: Metadata = { title: "Spor · Videolar" };

export default async function SportVideosPage() {
  const user = await requireUser();
  const [videos, types] = await Promise.all([listVideos(user.id), listTypes(user.id)]);
  return <VideoLibrary today={todayIstanbul()} videos={videos} types={types} />;
}
