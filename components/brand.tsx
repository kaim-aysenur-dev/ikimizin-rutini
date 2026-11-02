import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function BrandMark({ large = false }: { large?: boolean }) {
  const size = large ? 30 : 20;
  return (
    <span className={`brand-mark${large ? " lg" : ""}`} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="8.6" cy="12" r="5.6" />
        <circle cx="15.4" cy="12" r="5.6" strokeOpacity="0.8" />
      </svg>
    </span>
  );
}

export function Brand({ href = "/bugun" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label={SITE_NAME}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" className="brand-logo" width={134} height={34} />
    </Link>
  );
}

