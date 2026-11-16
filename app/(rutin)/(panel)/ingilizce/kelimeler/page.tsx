import type { Metadata } from "next";
import { YdsWordsView } from "@/components/yds/words-view";
import { requireUser } from "@/lib/auth/session";
import { wordsOf } from "@/lib/yds-server";

export const metadata: Metadata = { title: "Kelimelerim · İngilizce" };

export default async function Page() {
  const user = await requireUser();
  return <YdsWordsView initial={await wordsOf(user.id)} />;
}
