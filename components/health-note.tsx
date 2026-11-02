import { Info } from "lucide-react";

export function HealthNote() {
  return (
    <p className="notice health-note">
      <Info size={18} aria-hidden="true" />
      <span>
        Genel bilgilendirme amaçlıdır. Sağlık sorunu, sakatlık veya hamilelik durumunda doktor ya da diyetisyene danışın.
      </span>
    </p>
  );
}
