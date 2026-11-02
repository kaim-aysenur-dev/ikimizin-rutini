import { Package } from "lucide-react";

/** Ürün fotoğrafı: her temada beyaz, kare, taşmayan kutu. Fotoğraf yoksa simge. */
export function ProductThumb({
  src,
  alt,
  size = "md",
  tooth = false,
}: {
  src: string | null;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  tooth?: boolean;
}) {
  return (
    <span className={`thumb ${size === "md" ? "" : size}`}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      ) : tooth ? (
        <ToothIcon />
      ) : (
        <Package className="fallback" strokeWidth={1.5} aria-hidden="true" />
      )}
    </span>
  );
}

function ToothIcon() {
  return (
    <svg className="fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path
        d="M7.5 3C5 3 3.5 5 3.5 7.6c0 2 1 3.5 1.5 5.5.6 2.4.8 7.9 3 7.9 1.8 0 1.6-5 4-5s2.2 5 4 5c2.2 0 2.4-5.5 3-7.9.5-2 1.5-3.5 1.5-5.5C20.5 5 19 3 16.5 3c-1.9 0-2.8 1-4.5 1S9.4 3 7.5 3Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
