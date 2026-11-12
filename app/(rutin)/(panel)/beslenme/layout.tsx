import { HealthNote } from "@/components/health-note";
import { SectionAside } from "@/components/section-aside";
import { SubNav } from "@/components/subnav";

const ITEMS = [
  { href: "/beslenme", label: "Plan", exact: true },
  { href: "/beslenme/takip", label: "Takip" },
  { href: "/beslenme/olculer", label: "Ölçüler" },
  { href: "/beslenme/alisveris", label: "Alışveriş" },
];

export default function NutritionLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="main with-side">
      <header className="page-head">
        <p className="eyebrow">Beslenme programı</p>
        <h1>Beslenme</h1>
      </header>
      <div className="side-layout">
        <div className="side-main">
          <SubNav items={ITEMS} label="Beslenme bölümleri" />
          {children}
          <HealthNote />
        </div>
        <SectionAside base="beslenme" />
      </div>
    </main>
  );
}
