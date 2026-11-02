export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toLocaleUpperCase("tr-TR"))
    .join("");
}

export function Avatar({ name, url, size = 34 }: { name: string; url: string | null; size?: number }) {
  return (
    <span className="avatar" style={{ "--size": `${size}px` } as React.CSSProperties} aria-hidden="true">
      {url ? <img src={url} alt="" width={size} height={size} /> : initials(name)}
    </span>
  );
}
