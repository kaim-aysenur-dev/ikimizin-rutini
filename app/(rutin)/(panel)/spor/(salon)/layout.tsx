import { SubNav } from "@/components/subnav";

// Salon antrenmanı: sabit günlü plan, set/tekrar/kilo kaydı ve hareket kütüphanesi
const ITEMS = [
  { href: "/spor/plan", label: "Plan" },
  { href: "/spor/kayit", label: "Set kaydı" },
  { href: "/spor/hareketler", label: "Hareketler" },
];

export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={ITEMS} label="Salon" variant="chips" />
      {children}
    </>
  );
}
