import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { PasswordForm } from "@/components/password-form";
import { ProfileForm } from "@/components/profile-form";
import { SkinMetricsForm } from "@/components/skin-metrics-form";
import { requireUser } from "@/lib/auth/session";
import { imageUrl } from "@/lib/cloudinary";
import type { SkinMetric } from "@/lib/slots";

export const metadata: Metadata = { title: "Ayarlar" };

export default async function SettingsPage() {
  const user = await requireUser();
  const avatarUrl = user.avatarPublicId
    ? imageUrl(user.avatarPublicId, { width: 160, height: 160, crop: "fill", gravity: "face" })
    : null;

  return (
    <main className="main narrow">
      <header className="page-head">
        <p className="eyebrow">Ayarlar</p>
        <h1>{user.displayName}</h1>
      </header>

      <section className="card stack" aria-labelledby="profil">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h2 id="profil">Profil</h2>
          <Link href="/profil-sec" className="btn btn-quiet">
            <Users size={18} /> Profil değiştir
          </Link>
        </div>
        <ProfileForm name={user.displayName} avatarUrl={avatarUrl} />
      </section>

      <section className="card stack" aria-labelledby="olcutler">
        <div>
          <h2 id="olcutler">Cilt günlüğü ölçütleri</h2>
          <p className="muted">Günlükte 1–5 puanlanacak başlıklar. Kapattığın ölçütlerin eski puanları silinmez.</p>
        </div>
        <SkinMetricsForm initial={user.skinMetrics as SkinMetric[]} />
      </section>

      <section className="card stack" aria-labelledby="sifre">
        <div>
          <h2 id="sifre">Ortak giriş şifresi</h2>
          <p className="muted">
            Giriş kullanıcı adı: <strong>{user.accountUsername}</strong>. Şifre ikiniz için ortak; değişince diğer
            cihazlardaki oturumlar kapanır.
          </p>
        </div>
        <PasswordForm username={user.accountUsername} />
      </section>

      <section className="card stack" aria-labelledby="oturum">
        <div>
          <h2 id="oturum">Oturum</h2>
          <p className="muted">Bu cihazdan çıkış yapar.</p>
        </div>
        <div>
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
