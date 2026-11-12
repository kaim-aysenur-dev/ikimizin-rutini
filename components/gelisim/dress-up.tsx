"use client";

import { useEffect, useRef, useState } from "react";
import { PixelCanvas } from "@/components/pixel-canvas";
import { api } from "@/lib/api-client";
import { DOLL_SIZE, drawDoll } from "@/lib/doll";
import type { FigureFx } from "@/lib/figure";
import {
  ACCS, type AccKind, BOTTOMS, type BottomKind, COLORS, HAIRS, HAIR_COLORS, LIPS, type Outfit, PATTERNS, type Pattern, SHOES, type ShoeKind, TOPS, type TopKind,
  type Wearable, sanitizeOutfit,
} from "@/lib/outfit";

type Cat = "ust" | "alt" | "ayakkabi" | "aksesuar" | "sac" | "makyaj" | "odul";
const CATS: { id: Cat; label: string }[] = [
  { id: "ust", label: "👕 Üst" }, { id: "alt", label: "👖 Alt" }, { id: "ayakkabi", label: "👟 Ayakkabı" }, { id: "aksesuar", label: "🕶️ Aksesuar" },
  { id: "sac", label: "💇 Saç" }, { id: "makyaj", label: "💄 Makyaj" }, { id: "odul", label: "🎁 Kazandıkların" },
];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const JEWEL = new Set<AccKind>(["kolye", "kupe", "bileklik"]);

/**
 * Giydirme: karakter tam boy, yakından. Üst, alt, ayakkabı, aksesuar türü, rengi ve deseniyle; saç modeli ve rengi;
 * Dilek Dolabı'nda kazanılanlar (elbise, ayakkabı, takı, çanta, ruj, parfüm, kulaklık). Kaydedince Gelişim'de de
 * bu kombinle dolaşırsın (zırh giymediğinde); portrede ve bakım aynasında da görünür.
 */
export function DressUp({ who, onSaved }: { who: "cengiz" | "aysenur"; onSaved: (o: Outfit) => void }) {
  const [saved, setSaved] = useState<Outfit | null>(null);
  const [draft, setDraft] = useState<Outfit | null>(null);
  const [wearables, setWearables] = useState<Wearable[]>([]);
  const [cat, setCat] = useState<Cat>("ust");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fx = useRef<FigureFx[]>([]);
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

  const setTop = (t: Partial<Outfit["top"]>) => {
    const top = { ...draft.top, ...t }, dress = !!TOPS[top.kind].dress;
    change({ ...draft, top, bottom: dress ? null : draft.bottom ?? { kind: "jean", color: "#4a6a9a" } });
  };
  const accOn = (k: AccKind) => draft.acc.find((a) => a.kind === k);
  const toggleAcc = (k: AccKind) => change({ ...draft, acc: accOn(k) ? draft.acc.filter((a) => a.kind !== k) : [...draft.acc, { kind: k, color: JEWEL.has(k) ? "#e2b45a" : "#24202a" }].slice(-6) });
  const wear = (w: Wearable) => {
    if (w.slot === "top") setTop({ kind: w.kind as TopKind, color: w.color, pattern: undefined });
    else if (w.slot === "shoes") change({ ...draft, shoes: { kind: w.kind as ShoeKind, color: w.color } });
    else if (w.slot === "acc") change({ ...draft, acc: [...draft.acc.filter((a) => a.kind !== w.kind), { kind: w.kind as AccKind, color: w.color }].slice(-6) });
    else if (w.slot === "lips") change({ ...draft, lips: draft.lips === w.color ? null : w.color });
    else change({ ...draft, scent: !draft.scent });
  };
  const random = () => {
    const top = pick(Object.keys(TOPS) as TopKind[]);
    change({
      ...draft,
      top: { kind: top, color: pick(COLORS).c, inner: pick(COLORS).c, ...(Math.random() < 0.3 ? { pattern: pick(["cizgili", "kareli", "puantiyeli"] as Pattern[]), color2: pick(COLORS).c } : {}) },
      bottom: TOPS[top].dress ? null : { kind: pick(Object.keys(BOTTOMS) as BottomKind[]), color: pick(COLORS).c },
      shoes: { kind: pick(Object.keys(SHOES) as ShoeKind[]), color: pick(COLORS).c },
      acc: Math.random() < 0.6 ? [{ kind: pick(["gozluk", "gunes", "bere", "kep", "sapka", "saat", "canta", "atki", "kolye"] as AccKind[]), color: pick(COLORS).c }] : [],
    });
  };
  const save = async () => {
    setBusy(true); setErr(null);
    try { const d = await api<{ outfit: Outfit }>("/api/gelisim/kiyafet", { method: "PUT", body: draft }); setSaved(d.outfit); setDraft(d.outfit); onSaved(d.outfit); setMsg("Kaydedildi: Gelişim'de de böyle dolaşıyorsun."); }
    catch (e) { setErr(e instanceof Error ? e.message : "Kaydedilemedi."); }
    setBusy(false);
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const swatches = (value: string, onPick: (c: string) => void, label: string, list = COLORS) => (
    <div className="du-swatches" role="radiogroup" aria-label={label}>
      {list.map((c) => <button key={c.name} type="button" role="radio" aria-checked={value === c.c} className={`du-swatch${c.c ? "" : " is-own"}`} style={c.c ? { background: c.c } : undefined} aria-label={c.name} title={c.name} onClick={() => onPick(c.c)} />)}
    </div>
  );
  const kinds = <K extends string>(map: Record<K, string | { name: string }>, value: K | undefined, onPick: (k: K) => void, label: string) => (
    <div className="chips du-kinds" role="radiogroup" aria-label={label}>
      {(Object.keys(map) as K[]).map((k) => { const v = map[k]; return <button key={k} type="button" role="radio" className="chip" aria-checked={value === k} onClick={() => onPick(k)}>{typeof v === "string" ? v : v.name}</button>; })}
    </div>
  );

  return (
    <div className="du">
      <div className="du-stage">
        <PixelCanvas size={DOLL_SIZE} scale={2} fps={20} className="du-canvas" label="Kombinin"
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
            {kinds(TOPS, draft.top.kind, (k) => setTop({ kind: k }), "Üst")}
            <span className="field-label">Renk</span>
            {swatches(draft.top.color, (c) => setTop({ color: c }), "Üstün rengi")}
            <span className="field-label">Desen</span>
            {kinds(PATTERNS, draft.top.pattern ?? "duz", (p) => setTop({ pattern: p === "duz" ? undefined : p, color2: draft.top.color2 ?? "#f2ede4" }), "Desen")}
            {draft.top.pattern && <><span className="field-label">Desenin rengi</span>{swatches(draft.top.color2 ?? "#f2ede4", (c) => setTop({ color2: c }), "Desenin rengi")}</>}
            {TOPS[draft.top.kind].open && <><span className="field-label">İçindeki</span>{swatches(draft.top.inner ?? "#f2ede4", (c) => setTop({ inner: c }), "İçindekinin rengi")}</>}
          </>
        )}

        {cat === "alt" && (TOPS[draft.top.kind].dress ? <p className="muted">Elbise giyiyorsun; alt yok. Üst sekmesinden başka bir şey seçince alt açılır.</p> : (
          <>
            {kinds(BOTTOMS, draft.bottom?.kind, (k) => change({ ...draft, bottom: { kind: k, color: draft.bottom?.color ?? "#4a6a9a" } }), "Alt")}
            <span className="field-label">Renk</span>
            {swatches(draft.bottom?.color ?? "", (c) => change({ ...draft, bottom: { kind: draft.bottom?.kind ?? "jean", color: c } }), "Altın rengi")}
          </>
        ))}

        {cat === "ayakkabi" && (
          <>
            {kinds(SHOES, draft.shoes.kind, (k) => change({ ...draft, shoes: { ...draft.shoes, kind: k } }), "Ayakkabı")}
            <span className="field-label">Renk</span>
            {swatches(draft.shoes.color, (c) => change({ ...draft, shoes: { ...draft.shoes, color: c } }), "Ayakkabının rengi")}
          </>
        )}

        {cat === "aksesuar" && (
          <>
            <p className="muted du-note">En fazla 6 aksesuar. Takılı olanın rengini aşağıdan seç.</p>
            <div className="chips du-kinds" role="group" aria-label="Aksesuarlar">
              {(Object.keys(ACCS) as AccKind[]).map((k) => <button key={k} type="button" className="chip" aria-pressed={!!accOn(k)} onClick={() => toggleAcc(k)}>{ACCS[k]}</button>)}
            </div>
            {draft.acc.map((a) => (
              <div key={a.kind}>
                <span className="field-label">{ACCS[a.kind]}</span>
                {swatches(a.color, (c) => change({ ...draft, acc: draft.acc.map((x) => (x.kind === a.kind ? { ...x, color: c } : x)) }), `${ACCS[a.kind]} rengi`)}
              </div>
            ))}
          </>
        )}

        {cat === "sac" && (
          <>
            <div className="chips du-kinds" role="radiogroup" aria-label="Saç modeli">
              {HAIRS[who].map((h) => <button key={h.kind} type="button" role="radio" className="chip" aria-checked={draft.hair === h.kind} onClick={() => change({ ...draft, hair: h.kind })}>{h.name}</button>)}
            </div>
            <span className="field-label">Saç rengi</span>
            {swatches(draft.hairColor ?? "", (c) => change({ ...draft, hairColor: c || null }), "Saç rengi", HAIR_COLORS)}
          </>
        )}

        {cat === "makyaj" && (
          <>
            <span className="field-label">Dudak</span>
            <div className="chips du-kinds" role="radiogroup" aria-label="Dudak rengi">
              {LIPS.map((l) => <button key={l.name} type="button" role="radio" className="chip" aria-checked={(draft.lips ?? "") === l.c} onClick={() => change({ ...draft, lips: l.c || null })}>
                {l.c && <i className="du-dot" style={{ background: l.c }} aria-hidden="true" />}{l.name}</button>)}
            </div>
            <p className="muted du-note">Yüzün bakım aynasındaki durumuyla görünür: bakım yaptıkça cilt ışıldar.</p>
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
