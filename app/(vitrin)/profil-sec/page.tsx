import type { Metadata } from "next";
import { ProfilePicker } from "@/components/auth";
import { requireAccount } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { safeNextPath } from "@/lib/identity";

export const metadata: Metadata = { title: "Kim kullanıyor? · İkimizin Rutini" };

// Ortak girişten sonra kişi seçimi; seçim bu cihazın oturumunda saklanır
export default async function ProfilePickPage({ searchParams }: PageProps<"/profil-sec">) {
  const session = await requireAccount();
  const rows = await sql()`
    select id, display_name, lock_hash is not null as locked from users
    where account_id = ${session.accountId} order by created_at, display_name`;
  const profiles = rows.map((r) => ({ id: r.id as string, name: r.display_name as string, locked: Boolean(r.locked) }));
  const { sonra } = await searchParams;
  return <ProfilePicker profiles={profiles} currentId={session.profile?.id ?? null} next={safeNextPath(sonra) ?? "/bugun"} />;
}
