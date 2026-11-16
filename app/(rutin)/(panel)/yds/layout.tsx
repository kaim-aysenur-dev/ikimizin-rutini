import { SubNav } from "@/components/subnav";

const ITEMS = [
  { href: "/yds", label: "Bugün", exact: true },
  { href: "/yds/kelimeler", label: "Kelimelerim" },
  { href: "/yds/denemeler", label: "Denemeler" },
  { href: "/yds/ayarlar", label: "Ayarlar" },
];

export default function YdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="main">
      <header className="page-head">
        <p className="eyebrow">Her gün biraz, sınav günü hazır</p>
        <h1>YDS Kampı</h1>
      </header>
      <SubNav items={ITEMS} label="YDS bölümleri" />
      {children}
    </main>
  );
}
