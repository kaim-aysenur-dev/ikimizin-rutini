"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Minus, Plus, Trash } from "lucide-react";
import { ProductThumb } from "@/components/product-thumb";
import { api } from "@/lib/api-client";
import { uploadImage } from "@/lib/upload-client";
import { SLOTS, SLOT_LABEL, TIMER_PRESETS, formatDuration, type Slot } from "@/lib/slots";
import type { Product } from "@/lib/skin";

type Props = { product?: Product };

export function ProductForm({ product }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    label: product?.label ?? "",
    purpose: product?.purpose ?? "",
    area: product?.area ?? "",
    duration: product?.duration ?? "",
    usageTime: product?.usageTime ?? "",
    ingredients: product?.ingredients ?? "",
    note: product?.note ?? "",
  });
  const [slots, setSlots] = useState<Slot[]>(product?.slots ?? []);
  const [weeklyTarget, setWeeklyTarget] = useState(product?.weeklyTarget ?? 2);
  const [timers, setTimers] = useState<number[]>(product?.timers ?? []);
  const [image, setImage] = useState<{ preview: string | null; publicId?: string | null }>({
    preview: product?.image ?? null,
  });
  const [busy, setBusy] = useState<"save" | "photo" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy("photo");
    setError(null);
    try {
      const publicId = await uploadImage(file, "urun", 1200);
      setImage({ preview: URL.createObjectURL(file), publicId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fotoğraf yüklenemedi.");
    }
    if (fileRef.current) fileRef.current.value = "";
    setBusy(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save");
    setError(null);
    const body = {
      ...form,
      slots,
      weeklyTarget,
      timers,
      ...(image.publicId !== undefined ? { imagePublicId: image.publicId } : {}),
    };
    try {
      if (product) await api(`/api/skin/products/${product.id}`, { method: "PATCH", body });
      else await api("/api/skin/products", { body });
      router.push("/cilt/urunler");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(null);
    }
  }

  async function onDelete() {
    if (!product) return;
    setBusy("delete");
    try {
      await api(`/api/skin/products/${product.id}`, { method: "DELETE" });
      router.push("/cilt/urunler");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi.");
      setBusy(null);
      setConfirmDelete(false);
    }
  }

  return (
    <form className="stack product-form" onSubmit={onSubmit} noValidate>
      <section className="card stack">
        <h2>Fotoğraf</h2>
        <div className="row">
          <ProductThumb src={image.preview} alt={form.name || "Ürün"} size="xl" />
          <div className="stack" style={{ gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
              <Camera size={18} /> {busy === "photo" ? "Yükleniyor…" : image.preview ? "Fotoğrafı değiştir" : "Fotoğraf ekle"}
            </button>
            {image.preview && (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => setImage({ preview: null, publicId: null })}
                disabled={busy !== null}
              >
                <Trash size={16} /> Kaldır
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
        </div>
        <p className="hint">Fotoğraf beyaz kutuda, kırpılmadan gösterilir. Düz zeminli ürün fotoğrafı en iyi sonucu verir.</p>
      </section>

      <section className="card form-grid two">
        <h2 className="span-2">Bilgiler</h2>
        <div className="field">
          <label htmlFor="p-name">Ürün adı *</label>
          <input id="p-name" className="input" value={form.name} onChange={set("name")} required maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="p-brand">Marka</label>
          <input id="p-brand" className="input" value={form.brand} onChange={set("brand")} maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="p-purpose">Ne için</label>
          <input id="p-purpose" className="input" value={form.purpose} onChange={set("purpose")} placeholder="Ör. Yüz yıkama" />
        </div>
        <div className="field">
          <label htmlFor="p-area">Nereye</label>
          <input id="p-area" className="input" value={form.area} onChange={set("area")} placeholder="Ör. Yüz ve boyun" />
        </div>
        <div className="field">
          <label htmlFor="p-duration">Süre / nasıl</label>
          <input id="p-duration" className="input" value={form.duration} onChange={set("duration")} placeholder="Ör. 1–2 dk bekle, durulanmaz" />
        </div>
        <div className="field">
          <label htmlFor="p-usage">Ne zaman</label>
          <input id="p-usage" className="input" value={form.usageTime} onChange={set("usageTime")} placeholder="Ör. Sabah + akşam" />
        </div>
        <div className="field span-2">
          <label htmlFor="p-ingredients">İçerik notu</label>
          <textarea id="p-ingredients" className="input" value={form.ingredients} onChange={set("ingredients")} rows={3} />
        </div>
        <div className="field span-2">
          <label htmlFor="p-note">Uyarı / not</label>
          <textarea
            id="p-note"
            className="input"
            value={form.note}
            onChange={set("note")}
            rows={2}
            placeholder="Ör. Tıraştan hemen sonra sürülmez."
          />
          <span className="hint">Not yazarsan Ürünler sayfasının altındaki Notlar bölümünde de görünür.</span>
        </div>
      </section>

      <section className="card stack">
        <div>
          <h2>Rutindeki yeri</h2>
          <p className="muted">Seçtiğin gruplarda Bugün listesine ve haftalık takibe eklenir.</p>
        </div>
        <div className="chips" role="group" aria-label="Zaman grupları">
          {SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              className="chip"
              data-slot={slot}
              aria-pressed={slots.includes(slot)}
              onClick={() => setSlots((s) => toggle(s, slot))}
            >
              {SLOT_LABEL[slot]}
            </button>
          ))}
        </div>
        {slots.includes("haftalik") && (
          <div className="field">
            <span className="field-label" id="weekly-target-label">
              Haftalık hedef
            </span>
            <div className="stepper" role="group" aria-labelledby="weekly-target-label">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setWeeklyTarget((v) => Math.max(1, v - 1))}
                aria-label="Azalt"
              >
                <Minus size={18} />
              </button>
              <span className="num stepper-value" aria-live="polite">
                Haftada {weeklyTarget}
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setWeeklyTarget((v) => Math.min(7, v + 1))}
                aria-label="Artır"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        )}
        <div className="field">
          <label htmlFor="p-label">Listede görünecek kısa ad</label>
          <input
            id="p-label"
            className="input"
            value={form.label}
            onChange={set("label")}
            placeholder={form.name || "Ör. Yüz köpüğü"}
            maxLength={60}
          />
          <span className="hint">Boş bırakırsan ürün adı kullanılır.</span>
        </div>
        <div className="field">
          <span className="field-label">Bekleme sayacı</span>
          <div className="chips" role="group" aria-label="Sayaç süreleri">
            {TIMER_PRESETS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                className="chip"
                aria-pressed={timers.includes(seconds)}
                onClick={() => setTimers((t) => toggle(t, seconds).sort((a, b) => a - b).slice(-3))}
              >
                {formatDuration(seconds)}
              </button>
            ))}
          </div>
          <span className="hint">Seçersen adımın yanında "Başlat" butonu çıkar. En fazla 3 süre.</span>
        </div>
      </section>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy !== null}>
          {busy === "save" ? "Kaydediliyor…" : product ? "Değişiklikleri kaydet" : "Ürünü ekle"}
        </button>
        <Link href="/cilt/urunler" className="btn btn-ghost btn-lg">
          Vazgeç
        </Link>
        {product && (
          <button type="button" className="btn btn-danger btn-lg" onClick={() => setConfirmDelete(true)} disabled={busy !== null}>
            <Trash size={18} /> Ürünü kaldır
          </button>
        )}
      </div>

      {confirmDelete && product && (
        <div className="modal-backdrop" role="presentation" onClick={() => setConfirmDelete(false)}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="del-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="del-title">{product.name} kaldırılsın mı?</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Ürün listeden ve rutinden çıkar. Geçmiş haftalardaki işaretler silinmez.
            </p>
            <div className="stack" style={{ marginTop: 18 }}>
              <button type="button" className="btn btn-danger btn-block" onClick={onDelete} disabled={busy === "delete"}>
                {busy === "delete" ? "Kaldırılıyor…" : "Evet, kaldır"}
              </button>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setConfirmDelete(false)}>
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
