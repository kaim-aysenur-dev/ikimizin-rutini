const TR_TO_ASCII: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

/** Giriş alanına yazılanı e-posta ya da kullanıcı adı olarak normalleştirir ("Ayşenur" → "aysenur"). */
export function normalizeIdentifier(raw: string): { kind: "email" | "username"; value: string } {
  const value = raw.trim();
  if (value.includes("@")) return { kind: "email", value: value.toLowerCase() };
  return {
    kind: "username",
    value: value
      .toLocaleLowerCase("tr-TR")
      .replace(/[çğıöşüâîû]/g, (ch) => TR_TO_ASCII[ch] ?? ch)
      .replace(/\s+/g, ""),
  };
}

/** Girişten sonra yalnızca site içi bir yola dönülür (açık yönlendirmeye karşı). */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value === "/" || value.startsWith("/giris") || value.startsWith("/api/") || value.startsWith("/sifre-degistir") || value.startsWith("/profil-sec")) return null;
  return value.slice(0, 300);
}
