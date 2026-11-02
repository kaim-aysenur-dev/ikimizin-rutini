import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RoutineEditor } from "@/components/skin/routine-editor";
import { requireUser } from "@/lib/auth/session";
import { getRoutineForEdit } from "@/lib/skin";

export const metadata: Metadata = { title: "Cilt · Rutini düzenle" };

export default async function RoutineEditPage() {
  const user = await requireUser();
  const steps = await getRoutineForEdit(user.id);
  return (
    <div className="narrow-block stack">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <h2>Rutini düzenle</h2>
          <p className="muted">
            Adımların sırasını, adını, sayacını değiştir; ürüne bağlı olmayan adımlar ekle. Ürün eklemek için{" "}
            <Link href="/cilt/urunler/yeni">ürün ekle</Link>.
          </p>
        </div>
        <Link href="/cilt/urunler" className="btn btn-ghost">
          <ChevronLeft size={18} /> Ürünler
        </Link>
      </div>
      <RoutineEditor steps={steps} />
    </div>
  );
}
