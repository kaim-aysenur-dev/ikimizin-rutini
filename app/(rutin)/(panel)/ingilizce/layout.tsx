import { SubNav } from "@/components/subnav";
import { requireUser } from "@/lib/auth/session";
import { MODES, defaultMode } from "@/lib/yds";
import { settingsOf } from "@/lib/yds-server";

// İngilizce bölümü: YDS'ye hazırlanan için "YDS Kampı" (denemelerle), diğeri için genel İngilizce
export default async function EnglishLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { mode } = await settingsOf(user.id, defaultMode(user.displayName));
  const items = [
    { href: "/ingilizce", label: "Bugün", exact: true },
    { href: "/ingilizce/kelimeler", label: "Kelimelerim" },
    ...(mode === "yds" ? [{ href: "/ingilizce/denemeler", label: "Denemeler" }] : []),
    { href: "/ingilizce/ayarlar", label: "Ayarlar" },
  ];
  return (
    <main className="main">
      <header className="page-head">
        <p className="eyebrow">{mode === "yds" ? "Her gün biraz, sınav günü hazır" : "Her gün biraz İngilizce"}</p>
        <h1>{MODES[mode].title}</h1>
      </header>
      <SubNav items={items} label="İngilizce bölümleri" />
      {children}
    </main>
  );
}
