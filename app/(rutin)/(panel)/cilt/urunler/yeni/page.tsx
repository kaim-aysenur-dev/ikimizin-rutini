import type { Metadata } from "next";
import { ProductForm } from "@/components/skin/product-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Cilt · Ürün ekle" };

export default async function NewProductPage() {
  await requireUser();
  return (
    <div className="narrow-block">
      <h2 className="section-title">Yeni ürün</h2>
      <ProductForm />
    </div>
  );
}
