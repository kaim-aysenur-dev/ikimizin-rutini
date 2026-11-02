import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { PasswordForm } from "@/components/password-form";
import { requireAccount } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Şifreni belirle" };

// İlk girişte zorunlu şifre değişimi. Bu tamamlanmadan başka sayfa ve API açılmaz.
export default async function ChangePasswordPage() {
  const session = await requireAccount({ duringPasswordChange: true });
  if (!session.mustChangePassword) redirect("/ayarlar");

  return (
    <div className="login-page">
      <main className="login">
        <header className="login-hero">
          <BrandMark large />
          <h1>Hoş geldiniz</h1>
          <p>İlk giriş olduğu için geçici şifreyi kendi şifrenizle değiştirmeniz gerekiyor. Şifre ikiniz için ortak.</p>
        </header>
        <section className="login-card" aria-label="Şifre belirle">
          <PasswordForm username={session.accountUsername} firstLogin />
        </section>
        <div className="login-foot">
          <LogoutButton variant="link" />
        </div>
      </main>
    </div>
  );
}
