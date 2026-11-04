import { World } from "@/components/world";
import { getSession } from "@/lib/auth/session";

// Herkese açık hikâye. Üstte ve sonda oturuma göre bir sonraki adım: giriş, profil seçimi ya da rutine geçiş.
export default async function Home() {
  const session = await getSession();
  const entry = !session ? { href: "/giris", label: "Giriş yap" }
    : session.mustChangePassword ? { href: "/sifre-degistir", label: "Devam et" }
    : session.profile ? { href: "/bugun", label: "Rutinime geç" }
    : { href: "/profil-sec", label: "Profil seç" };
  return <World entry={entry} profileName={session?.profile?.displayName ?? null} />;
}
