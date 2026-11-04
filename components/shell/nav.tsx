"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarCheck, Droplet, Dumbbell, Salad, Settings, Sprout, Swords, Users, type LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };

export const SECTIONS: NavItem[] = [
  { href: "/bugun", label: "Bugün", icon: CalendarCheck },
  { href: "/cilt", label: "Cilt", icon: Droplet },
  { href: "/beslenme", label: "Beslenme", icon: Salad },
  { href: "/spor", label: "Spor", icon: Dumbbell },
  { href: "/gelisim", label: "Gelişim", icon: Sprout },
];

// Hazine telefonda alt menüde yok; seviye rozetinden açılır
const EXTRA: NavItem[] = [
  { href: "/hazine", label: "Hazine", icon: Swords },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Masaüstünde sol kenar çubuğundaki bağlantılar */
export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Bölümler">
      {[...SECTIONS, ...EXTRA].map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}>
          <Icon size={20} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Kenar çubuğunun altında: profil değiştir (aynı sayfaya döner) ve hikâye ana sayfası */
export function SideExtras() {
  const pathname = usePathname();
  return (
    <nav className="sidebar-extra" aria-label="Hesap">
      <Link href={`/profil-sec?sonra=${encodeURIComponent(pathname)}`}><Users size={20} aria-hidden="true" />Profil değiştir</Link>
      <Link href="/"><BookOpen size={20} aria-hidden="true" />Hikâye</Link>
    </nav>
  );
}

/** Telefonda altta sabit sekme menüsü */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Bölümler">
      {SECTIONS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}>
          <span className="tab-icon">
            <Icon size={21} aria-hidden="true" />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
