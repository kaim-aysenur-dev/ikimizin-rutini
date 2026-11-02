import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth";
import { getSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/identity";

export const metadata: Metadata = { title: "Giriş · İkimizin Rutini" };

// Oturum açıksa doğrudan rutin paneline geçer (eski ana sayfanın davranışı)
export default async function LoginPage({ searchParams }: PageProps<"/giris">) {
  const session = await getSession();
  if (session) redirect(session.mustChangePassword ? "/sifre-degistir" : session.profile ? "/bugun" : "/profil-sec");
  const { sonra } = await searchParams;
  return <LoginScreen next={safeNextPath(sonra) ?? undefined} />;
}
