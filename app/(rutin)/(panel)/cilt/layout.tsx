import { SubNav } from "@/components/subnav";

const ITEMS = [
  { href: "/cilt", label: "Takip", exact: true },
  { href: "/cilt/urunler", label: "Ürünler" },
  { href: "/cilt/gunluk", label: "Günlük" },
  { href: "/cilt/yuz-yogasi", label: "Yüz yogası" },
  { href: "/cilt/seruven", label: "Serüven" },
];

export default function SkinLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="main">
      <header className="page-head">
        <p className="eyebrow">Cilt bakım serüveni</p>
        <h1>Cilt</h1>
      </header>
      <SubNav items={ITEMS} label="Cilt bölümleri" />
      {children}
    </main>
  );
}
