"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { ProductThumb } from "@/components/product-thumb";
import { SLOTS, SLOT_LABEL, type Slot } from "@/lib/slots";
import type { Product } from "@/lib/skin";

type Filter = "tumu" | Slot;

function SlotTags({ product }: { product: Product }) {
  return (
    <span className="tag-row">
      {product.slots.map((slot) => (
        <span key={slot} className="tag" data-slot={slot}>
          {slot === "haftalik" && product.weeklyTarget ? `Haftada ${product.weeklyTarget}` : SLOT_LABEL[slot]}
        </span>
      ))}
    </span>
  );
}

export function ProductsView({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState<Filter>("tumu");
  const visible = filter === "tumu" ? products : products.filter((p) => p.slots.includes(filter));
  const count = (slot: Slot) => products.filter((p) => p.slots.includes(slot)).length;
  const rank = (p: Product) => products.indexOf(p) + 1;

  return (
    <>
      <div className="chips" role="radiogroup" aria-label="Zaman filtresi">
        <button type="button" role="radio" className="chip" aria-checked={filter === "tumu"} onClick={() => setFilter("tumu")}>
          Tümü <span className="count">{products.length}</span>
        </button>
        {SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            role="radio"
            className="chip"
            data-slot={slot}
            aria-checked={filter === slot}
            onClick={() => setFilter(slot)}
          >
            {SLOT_LABEL[slot]} <span className="count">{count(slot)}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 && <p className="muted section">Bu grupta ürün yok.</p>}

      {/* Telefonda kartlar */}
      <ul className="prod-cards">
        {visible.map((p) => (
          <li key={p.id} className="prod-card">
            <div className="prod-card-head">
              <ProductThumb src={p.image} alt={p.name} size="lg" />
              <div className="prod-card-title">
                <span className="prod-rank num">{rank(p)}</span>
                <h3>{p.name}</h3>
                <span className="muted">{p.brand}</span>
                <SlotTags product={p} />
              </div>
              <Link href={`/cilt/urunler/${p.id}`} className="icon-btn" aria-label={`${p.name} ürününü düzenle`}>
                <Pencil size={18} />
              </Link>
            </div>
            <dl className="prod-facts">
              {p.purpose && (
                <div>
                  <dt>Ne için</dt>
                  <dd>{p.purpose}</dd>
                </div>
              )}
              {p.area && (
                <div>
                  <dt>Nereye</dt>
                  <dd>{p.area}</dd>
                </div>
              )}
              {p.duration && (
                <div>
                  <dt>Süre</dt>
                  <dd>{p.duration}</dd>
                </div>
              )}
              {p.usageTime && (
                <div>
                  <dt>Ne zaman</dt>
                  <dd>{p.usageTime}</dd>
                </div>
              )}
              {p.ingredients && (
                <div>
                  <dt>İçerik</dt>
                  <dd>{p.ingredients}</dd>
                </div>
              )}
            </dl>
            {p.note && <p className="prod-note">{p.note}</p>}
          </li>
        ))}
      </ul>

      {/* Masaüstünde tablo */}
      <div className="prod-table-wrap">
        <table className="prod-table">
          <thead>
            <tr>
              <th scope="col">Ürün</th>
              <th scope="col">Ne için</th>
              <th scope="col">Nereye</th>
              <th scope="col">Süre</th>
              <th scope="col">Ne zaman</th>
              <th scope="col">İçerikler</th>
              <th scope="col">
                <span className="sr-only">Düzenle</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id}>
                <th scope="row">
                  <div className="prod-cell">
                    <span className="prod-rank num">{rank(p)}</span>
                    <ProductThumb src={p.image} alt={p.name} />
                    <span>
                      <strong>{p.name}</strong>
                      <span className="muted">{p.brand}</span>
                    </span>
                  </div>
                </th>
                <td>{p.purpose}</td>
                <td>{p.area}</td>
                <td>{p.duration}</td>
                <td>
                  <SlotTags product={p} />
                  {p.usageTime && <span className="muted small">{p.usageTime}</span>}
                </td>
                <td className="small">
                  {p.ingredients}
                  {p.note && <span className="prod-note">{p.note}</span>}
                </td>
                <td>
                  <Link href={`/cilt/urunler/${p.id}`} className="icon-btn" aria-label={`${p.name} ürününü düzenle`}>
                    <Pencil size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
