import { HealthNote } from "@/components/health-note";
import { SectionAside } from "@/components/section-aside";
import { SubNav } from "@/components/subnav";

const ITEMS = [
  { href: "/spor", label: "Bu hafta", exact: true },
  { href: "/spor/videolar", label: "Videolar" },
  { href: "/spor/plan", label: "Salon", match: ["/spor/kayit", "/spor/hareketler"] },
  { href: "/spor/hedef", label: "Hedef" },
];

export default function SportLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="main with-side">
      <header className="page-head">
        <h1>Spor</h1>
      </header>
      <div className="side-layout">
        <div className="side-main">
          <SubNav items={ITEMS} label="Spor bölümleri" />
          {children}
          <HealthNote />
        </div>
        <SectionAside base="spor" />
      </div>
    </main>
  );
}
