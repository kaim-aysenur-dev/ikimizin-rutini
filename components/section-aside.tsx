import { CharacterAside } from "@/components/character-aside";
import { requireUser } from "@/lib/auth/session";
import { careState } from "@/lib/care-server";
import { todayIstanbul } from "@/lib/dates";
import { outfitOf } from "@/lib/outfit-server";
import { getRoutine } from "@/lib/skin";

// Bölüm düzenlerinin sağındaki karakter (sunucuda veriyi hazırlar): Cilt, Spor, Beslenme
export async function SectionAside({ base }: { base: "cilt" | "spor" | "beslenme" }) {
  const user = await requireUser();
  const today = todayIstanbul();
  const who = /ay[sş]enur/i.test(user.displayName) ? "aysenur" : "cengiz";
  const items = await getRoutine(user.id);
  const [care, outfit] = await Promise.all([careState(user.id, today, items), outfitOf(user.id, who)]);
  return (
    <CharacterAside base={base} who={who} name={user.displayName.split(" ")[0]} initial={care} outfit={outfit}
      steps={base === "cilt" ? items.map((i) => ({ id: i.id, label: i.label, productName: i.productName, slot: i.slot })) : []} />
  );
}
