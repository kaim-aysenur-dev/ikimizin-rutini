"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

export async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.assign("/giris");
  }
}

export function LogoutButton({ variant = "button" }: { variant?: "button" | "link" | "menu" }) {
  const [busy, setBusy] = useState(false);
  const onClick = () => {
    setBusy(true);
    void logout();
  };
  if (variant === "menu") {
    return (
      <button type="button" className="menu-item danger" onClick={onClick} disabled={busy}>
        <LogOut size={18} /> Çıkış yap
      </button>
    );
  }
  return (
    <button
      type="button"
      className={variant === "link" ? "btn btn-quiet" : "btn btn-danger"}
      onClick={onClick}
      disabled={busy}
    >
      <LogOut size={18} /> {busy ? "Çıkılıyor…" : "Çıkış yap"}
    </button>
  );
}
