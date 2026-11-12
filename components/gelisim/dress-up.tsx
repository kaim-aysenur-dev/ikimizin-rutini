"use client";

import { useEffect, useRef, useState } from "react";
import { PixelCanvas } from "@/components/pixel-canvas";
import { api } from "@/lib/api-client";
import { DOLL_SIZE, drawDoll } from "@/lib/doll";
import {
  ACCS, type AccKind, BOTTOMS, type BottomKind, COLORS, LIPS, type Outfit, SHOES, type ShoeKind, TOPS, type TopKind, type Wearable, sanitizeOutfit,
} from "@/lib/outfit";
import type { PortraitFx } from "@/lib/portrait";

type Cat = "ust" | "alt" | "ayakkabi" | "aksesuar" | "makyaj" | "odul";
const CATS: { id: Cat; label: string }[] = [
  { id: "ust", label: "👕 Üst" }, { id: "alt", label: "👖 Alt" }, { id: "ayakkabi", label: "👟 Ayakkabı" },
  { id: "aksesuar", label: "🕶️ Aksesuar" }, { id: "makyaj", label: "💄 Makyaj" }, { id: "odul", label: "🎁 Kazandıkların" },
];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/**
 * Giydirme: karakter tam boy, yakından. Gündelik kıyafetler türü ve rengiyle seçilir; Dilek Dolabı'nda kazanılanlar
 * (elbise, ayakkabı, takı, çanta, ruj, parfüm, kulaklık) da giyilir. Kaydedince dünyada da bu kıyafetle görünürsün
 * (zırh giymediğinde); portrede yaka, ruj ve aksesuarlar görünür.
 */
export function DressUp({ who, onSaved }: { who: "cengiz" | "aysenur"; onSaved: (o: Outfit) => void }) {
  const [saved, setSaved] = useState<Outfit | null>(null);
  const [draft, setDraft] = useState<Outfit | null>(null);
  const [wearables, setWearables] = useState<Wearable[]>([]);
  const [cat, setCat] = useState<Cat>("ust");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fx = useRef<PortraitFx[]>([]);
  const draftRef = useRef<Outfit | null>(null);
  draftRef.current = draft;

  useEffect(() => {
    api<{ outfit: Outfit; wearables: Wearable[] }>("/api/gelisim/kiyafet")
      .then((d) => { setSaved(d.outfit); setDraft(d.outfit); setWearables(d.wearables); }, (e) => setErr(e instanceof Error ? e.message : "Yüklenemedi."));
  }, []);
  useEffect(() => { if (!msg) return; const id = window.setTimeout(() => setMsg(null), 2600); return () => window.clearTimeout(id); }, [msg]);

  // her değişiklikte karakterin etrafında kısa bir parıltı
  const change = (next: Outfit) => { setDraft(sanitizeOutfit(next, who)); fx.current = [{ kind: "parilti", at: performance.now() / 1000 }]; };
  if (!draft) return <p className="muted">{err ?? "Gardırop açılıyor..."}</p>;

  const accOn = (k: AccKind) => draft.acc.find((a) => a.kind === k);
  const toggleAcc = (k: AccKind, color = "#24202a") => change({ ...draft, acc: accOn(k) ? draft.acc.filter((a) => a.kind !== k) : [...draft.acc, { kind: k, color }].slice(-5) });
  const wear = (w: Wearable) => {
    if (w.slot === "top") change({ ...draft, top: { kind: w.kind as TopKind, color: w.color }, bottom: w.kind === "elbise" ? null : draft.bottom ?? { kind: "jean", color: "#4a6a9a" } });
    else if (w.slot === "shoes") change({ ...draft, shoes: { kind: w.kind as ShoeKind, color: w.color } });
    else if (w.slot === "acc") change({ ...draft, acc: [...draft.acc.filter((a) => a.kind !== w.kind), { kind: w.kind as AccKind, color: w.color }].slice(-5) });
    else if (w.slot === "lips") change({ ...draft, lips: w.color });
    else change({ ...draft, scent: !draft.scent });
  };
  const random = () => {
    const top = pick(Object.keys(TOPS) as TopKind[]);
    change({
      top: { kind: top, color: pick(COLORS).c, inner: pick(COLORS).c },
      bottom: top === "elbise" ? null : { kind: pick(Object.keys(BOTTOMS) as BottomKind[]), color: pick(COLORS).c },
      shoes: { kind: pick(Object.keys(SHOES) as ShoeKind[]), color: pick(COLORS).c },
      acc: Math.random() < 0.5 ? [{ kind: pick(["gozluk", "gunes", "bere", "sapka", "saat", "canta"] as AccKind[]), color: pick(COLORS).c }] : [],
      lips: draft.lips, scent: draft.scent,
    });
  };
  const save = async () => {
    setBusy(true); setErr(null);
    try { const d = await api<{ outfit: Outfit }>("/api/gelisim/kiyafet", { method: "PUT", body: draft }); setSaved(d.outfit); setDraft(d.outfit); onSaved(d.outfit); setMsg("Kombin kaydedildi: dünyada da böyle görünüyorsun."); }
    catch (e) { setErr(e instanceof Error ? e.message : "Kaydedilemedi."); }
    setBusy(false);
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const swatches = (value: string, onPick: (c: string) => void, label: string) => (
    <div className="swatches du-swatches" role="radiogroup" aria-label={label}>
      {COLORS.map((c) => <button key={c.c} type="button" role="radio" aria-checked={value === c.c} className="du-swatch" style={{ background: c.c }} aria-label={c.name} title={c.name} onClick={() => onPick(c.c)} />)}
    </div>
  );

  return (
    <div className="du">
      <div className="du-stage">
        <PixelCanvas size={DOLL_SIZE} scale={3} fps={20} className="du-canvas" label="Kombinin"
          draw={(c, w, h, t) => draftRef.current && drawDoll(c, w, h, t, { who, outfit: draftRef.current, state: null, fx: fx.current })} />
        <div className="row du-actions">
          <button type="button" className="btn btn-primary" disabled={busy || !dirty} onClick={() => void save()}>Kaydet</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={random}>🎲 Rastgele</button>
          {dirty && <button type="button" className="btn btn-quiet btn-sm" onClick={() => saved && setDraft(saved)}>Geri al</button>}
        </div>
        {msg && <p className="st-msg" role="status">{msg}</p>}
        {err && <p className="form-error">{err}</p>}
      </div>

      <div className="du-panel">
        <div className="chips" role="tablist">
          {CATS.map((c) => <button key={c.id} type="button" role="tab" className="chip" aria-selected={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>)}
        </div>

        {cat === "ust" && (
          <>
            <div className="chips du-kinds" role="radiogroup" aria-label="Üst">
              {(Object.keys(TOPS) as TopKind[]).map((k) => <button key={k} type="button" role="radio" className="chip" aria-checked={draft.top.kind === k}
                onClick={() => change({ ...draft, top: { ...draft.top, kind: k }, bottom: k === "elbise" ? null : draft.bottom ?? { kind: "jean", color: "#4a6a9a" } })}>{TOPS[k].name}</button>)}
            </div>
            <span className="field-label">Renk</span>
            {swatches(draft.top.color, (c) => change({ ...draft, top: { ...draft.top, color: c } }), "Üstün rengi")}
            {draft.top.kind === "ceket" && <><span className="field-label">İçindeki</span>{swatches(draft.top.inner ?? "#f2ede4", (c) => change({ ...draft, top: { ...draft.top, inner: c } }), "İçindekinin rengi")}</>}
          </>
        )}

        {cat === "alt" && (draft.top.kind === "elbise" ? <p className="muted">Elbise giyiyorsun; alt yok. Üst sekmesinden başka bir şey seçince alt açılır.</p> : (
          <>
            <div className="chips du-kinds" role="radiogroup" aria-label="Alt">
              {(Object.keys(BOTTOMS) as BottomKind[]).map((k) => <button key={k} type="button" role="radio" className="chip" aria-checked={draft.bottom?.kind === k}
                onClick={() => change({ ...draft, bottom: { kind: k, color: draft.bottom?.color ?? "#4a6a9a" } })}>{BOTTOMS[k].name}</button>)}
            </div>
            <span className="field-label">Renk</span>
            {swatches(draft.bottom?.color ?? "", (c) => change({ ...draft, bottom: { kind: draft.bottom?.kind ?? "jean", color: c } }), "Altın rengi")}
          </>
        ))}

        {cat === "ayakkabi" && (
          <>
            <div className="chips du-kinds" role="radiogroup" aria-label="Ayakkabı">
              {(Object.keys(SHOES) as ShoeKind[]).map((k) => <button key={k} type="button" role="radio" className="chip" aria-checked={draft.shoes.kind === k} onClick={() => change({ ...draft, shoes: { ...draft.shoes, kind: k } })}>{SHOES[k]}</button>)}
            </div>
            <span className="field-label">Renk</span>
            {swatches(draft.shoes.color, (c) => change({ ...draft, shoes: { ...draft.shoes, color: c } }), "Ayakkabının rengi")}
          </>
        )}

        {cat === "aksesuar" && (
          <>
            <p className="muted du-note">En fazla 5 aksesuar. Takılı olanın rengini aşağıdan seç.</p>
            <div className="chips du-kinds" role="group" aria-label="Aksesuarlar">
              {(Object.keys(ACCS) as AccKind[]).map((k) => <button key={k} type="button" className="chip" aria-pressed={!!accOn(k)} onClick={() => toggleAcc(k, k === "kolye" || k === "kupe" || k === "bileklik" ? "#e2b45a" : "#24202a")}>{ACCS[k]}</button>)}
            </div>
            {draft.acc.map((a) => (
              <div key={a.kind}>
                <span className="field-label">{ACCS[a.kind]}</span>
                {swatches(a.color, (c) => change({ ...draft, acc: draft.acc.map((x) => (x.kind === a.kind ? { ...x, color: c } : x)) }), `${ACCS[a.kind]} rengi`)}
              </div>
            ))}
          </>
        )}

        {cat === "makyaj" && (
          <>
            <span className="field-label">Dudak</span>
            <div className="chips du-kinds" role="radiogroup" aria-label="Dudak rengi">
              {LIPS.map((l) => <button key={l.name} type="button" role="radio" className="chip" aria-checked={(draft.lips ?? "") === l.c} onClick={() => change({ ...draft, lips: l.c || null })}>
                {l.c && <i className="du-dot" style={{ background: l.c }} aria-hidden="true" />}{l.name}</button>)}
            </div>
            <p className="muted du-note">Cildin bakım aynasındaki durumuyla görünür: bakım yaptıkça yüz ışıldar.</p>
          </>
        )}

        {cat === "odul" && (
          wearables.length === 0 ? <p className="muted">Dilek Dolabı'na kıyafet, ayakkabı, takı, çanta, ruj, parfüm ya da kulaklık ekle; görevini tamamlayınca burada giyersin.</p> : (
            <ul className="du-rewards">
              {wearables.map((w) => {
                const on = w.slot === "scent" ? draft.scent : w.slot === "lips" ? draft.lips === w.color : w.slot === "top" ? draft.top.kind === w.kind && draft.top.color === w.color
                  : w.slot === "shoes" ? draft.shoes.kind === w.kind && draft.shoes.color === w.color : draft.acc.some((a) => a.kind === w.kind && a.color === w.color);
                return (
                  <li key={w.id} className={w.earned ? undefined : "is-locked"}>
                    <i className="du-dot" style={{ background: w.color }} aria-hidden="true" />
                    <span className="grow"><b>{w.title}</b><small>{w.earned ? (on ? "giyiliyor" : "kazandın") : "🔒 görevini tamamlayınca"}</small></span>
                    <button type="button" className={`btn btn-sm ${on ? "btn-primary" : "btn-ghost"}`} disabled={!w.earned} onClick={() => wear(w)}>{w.slot === "scent" ? (on ? "Sıkıldı ✓" : "Sık") : on ? "Giyili" : "Giy"}</button>
                  </li>
                );
              })}
            </ul>
          )
        )}
      </div>
    </div>
  );
}
