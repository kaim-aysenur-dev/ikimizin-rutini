import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/skin/product-form";
import { requireUser } from "@/lib/auth/session";
import { getProduct } from "@/lib/skin";

export const metadata: Metadata = { title: "Cilt · Ürünü düzenle" };

export default async function EditProductPage({ params }: PageProps<"/cilt/urunler/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  // Ürün yalnızca oturumdaki kullanıcıya aitse açılır
  const product = await getProduct(user.id, id);
  if (!product) notFound();
  return (
    <div className="narrow-block">
      <h2 className="section-title">{product.name}</h2>
      <ProductForm product={product} />
    </div>
  );
}
