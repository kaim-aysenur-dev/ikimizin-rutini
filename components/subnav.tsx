"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; exact?: boolean; /** bu yollarda da etkin görünür */ match?: string[] };

export function SubNav({ items, label, variant }: { items: Item[]; label: string; variant?: "chips" }) {
  const pathname = usePathname();
  const under = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav className={variant === "chips" ? "subnav-chips" : "subnav"} aria-label={label}>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : under(item.href) || !!item.match?.some(under);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
