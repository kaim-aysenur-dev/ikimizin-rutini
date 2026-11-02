"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Settings, Users } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { LogoutButton } from "@/components/logout-button";

type Props = { name: string; account: string; avatarUrl: string | null };

export function UserMenu({ name, account, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // sayfa değişince menüyü kapat
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={name} url={avatarUrl} />
        <span>{name.split(" ")[0]}</span>
        <ChevronDown size={16} className="chev" aria-hidden="true" />
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <strong>{name}</strong>
            <span>Ortak hesap: {account}</span>
          </div>
          <Link href="/profil-sec" role="menuitem">
            <Users size={18} /> Profil değiştir
          </Link>
          <Link href="/ayarlar" role="menuitem">
            <Settings size={18} /> Ayarlar
          </Link>
          <LogoutButton variant="menu" />
        </div>
      )}
    </div>
  );
}
