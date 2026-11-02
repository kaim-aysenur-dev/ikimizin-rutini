import type { Metadata } from "next";
import Link from "next/link";
import { ListOrdered, Plus, TriangleAlert } from "lucide-react";
import { ProductsView } from "@/components/skin/products-view";
import { requireUser } from "@/lib/auth/session";
import { listProducts } from "@/lib/skin";

export const metadata: Metadata = { title: "Cilt · Ürünler" };

export default async function ProductsPage() {
  const user = await requireUser();
  const products = await listProducts(user.id);
  const notes = products.filter((p) => p.note);

  return (
    <>
      <div className="section-head">
        <div>
          <h2>Ürünler ve rutin</h2>
          <p className="muted">Önem sırasına göre. Ürünü düzenleyerek hangi zaman grubunda olduğunu değiştirebilirsin.</p>
        </div>
        <div className="row">
          <Link href="/cilt/urunler/rutin" className="btn btn-ghost">
            <ListOrdered size={18} /> Rutini düzenle
          </Link>
          <Link href="/cilt/urunler/yeni" className="btn btn-primary">
            <Plus size={18} /> Ürün ekle
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">
            <Plus size={26} />
          </span>
          <h2>Henüz ürün yok</h2>
          <p>Ad, marka, fotoğraf ve kullanım bilgileriyle ilk ürününü ekle; sonra sabah, akşam, duş, haftalık ya da gerektiğinde grubuna yerleştir.</p>
          <Link href="/cilt/urunler/yeni" className="btn btn-primary">
            <Plus size={18} /> Ürün ekle
          </Link>
        </div>
      ) : (
        <ProductsView products={products} />
      )}

      {notes.length > 0 && (
        <section className="section" aria-labelledby="notlar">
          <h2 id="notlar" className="section-title">
            Notlar
          </h2>
          <div className="stack">
            {notes.map((p) => (
              <p key={p.id} className="notice warn">
                <TriangleAlert size={18} aria-hidden="true" />
                <span>
                  <strong>{p.name}:</strong> {p.note}
                </span>
              </p>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
