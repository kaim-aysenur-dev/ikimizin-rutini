"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Droplet, Dumbbell, Salad, Settings, Sprout, type LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };

export const SECTIONS: NavItem[] = [
  { href: "/bugun", label: "Bugün", icon: CalendarCheck },
  { href: "/cilt", label: "Cilt", icon: Droplet },
  { href: "/beslenme", label: "Beslenme", icon: Salad },
  { href: "/spor", label: "Spor", icon: Dumbbell },
  { href: "/gelisim", label: "Gelişim", icon: Sprout },
];

const EXTRA: NavItem[] = [{ href: "/ayarlar", label: "Ayarlar", icon: Settings }];

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
