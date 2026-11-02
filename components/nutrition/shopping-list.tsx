"use client";

import { useCallback, useState } from "react";
import { Plus, Trash } from "lucide-react";
import { Toast } from "@/components/toast";
import { api } from "@/lib/api-client";
import { formatAmount, type ShoppingEntry } from "@/lib/meals";

type Manual = { id: string; label: string; checked: boolean };

/** Plandan otomatik çıkan maddeler + elle eklenenler; işaretler hafta bazında saklanır */
export function ShoppingList({
  week,
  entries,
  initialChecked,
  initialManual,
}: {
  week: string;
  entries: ShoppingEntry[];
  initialChecked: string[];
  initialManual: Manual[];
}) {
  const [checked, setChecked] = useState(() => new Set(initialChecked));
  const [manual, setManual] = useState(initialManual);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);
  const fail = (err: unknown) => setError(err instanceof Error ? err.message : "Kaydedilemedi.");

  async function toggleAuto(key: string) {
    const next = !checked.has(key);
    setChecked((s) => {
      const c = new Set(s);
      if (next) c.add(key);
      else c.delete(key);
      return c;
    });
    try {
      await api("/api/nutrition/shopping", { body: { week, key, checked: next } });
    } catch (err) {
      setChecked((s) => {
        const c = new Set(s);
        if (next) c.delete(key);
        else c.add(key);
        return c;
      });
      fail(err);
    }
  }

  async function toggleManual(item: Manual) {
    setManual((list) => list.map((m) => (m.id === item.id ? { ...m, checked: !m.checked } : m)));
    try {
      await api("/api/nutrition/shopping", { method: "PATCH", body: { id: item.id, checked: !item.checked } });
    } catch (err) {
      setManual((list) => list.map((m) => (m.id === item.id ? item : m)));
      fail(err);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const text = label.trim();
    if (!text) return;
    try {
      const { id } = await api<{ id: string }>("/api/nutrition/shopping", { body: { week, label: text } });
      setManual((list) => [...list, { id, label: text, checked: false }]);
      setLabel("");
    } catch (err) {
      fail(err);
    }
  }

  async function remove(item: Manual) {
    setManual((list) => list.filter((m) => m.id !== item.id));
    try {
      await api(`/api/nutrition/shopping?id=${item.id}`, { method: "DELETE" });
    } catch (err) {
      setManual((list) => [...list, item]);
      fail(err);
    }
  }

  const left = entries.filter((e) => !checked.has(e.key)).length + manual.filter((m) => !m.checked).length;

  return (
    <div className="stack">
      <p className="muted">
        <span className="num">{left}</span> madde kaldı. Miktarlar plandaki maddelerin toplamıdır; pişmiş ölçüler (ör. yemek kaşığı pilav) yaklaşık alınmalı.
      </p>
      <section className="card" aria-label="Plandan gelen maddeler">
        {entries.length === 0 ? (
          <p className="muted">Planda madde yok. Plan sekmesinden öğün ekleyince liste burada oluşur.</p>
        ) : (
          <ul className="check-list">
            {entries.map((e) => (
              <li key={e.key}>
                <label className={`check-item${checked.has(e.key) ? " is-done" : ""}`}>
                  <input type="checkbox" checked={checked.has(e.key)} onChange={() => toggleAuto(e.key)} />
                  <span className="grow">
                    <span className="check-name">{e.name}</span>
                    <span className="muted small">{formatAmount(e)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack" aria-labelledby="ekstra">
        <h2 id="ekstra">Ek maddeler</h2>
        {manual.length > 0 && (
          <ul className="check-list">
            {manual.map((m) => (
              <li key={m.id} className="row" style={{ flexWrap: "nowrap" }}>
                <label className={`check-item grow${m.checked ? " is-done" : ""}`}>
                  <input type="checkbox" checked={m.checked} onChange={() => toggleManual(m)} />
                  <span className="check-name">{m.label}</span>
                </label>
                <button type="button" className="icon-btn" onClick={() => remove(m)} aria-label={`${m.label} maddesini sil`}>
                  <Trash size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="row" onSubmit={add}>
          <input className="input grow" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ör. Limon, maden suyu" aria-label="Madde ekle" maxLength={120} />
          <button type="submit" className="btn btn-primary" disabled={!label.trim()}>
            <Plus size={18} /> Ekle
          </button>
        </form>
      </section>
      <Toast message={error} onDone={clearError} />
    </div>
  );
}
