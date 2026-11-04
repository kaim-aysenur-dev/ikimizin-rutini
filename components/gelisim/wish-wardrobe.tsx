"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelIcon } from "@/components/pixel-icon";
import { gainXp } from "@/components/xp-badge";
import { api } from "@/lib/api-client";
import { uploadImage } from "@/lib/upload-client";
import { drawWishIcon } from "@/lib/wish-pixel";
import {
  CAT_ORDER, type Goal, MAX_ACTIVE, METRICS, METRIC_ORDER, type Metric, SUGGESTIONS, type Suggestion, TIERS, TIER_ORDER, type Tier, WISH_CATS,
  type Wish, type WishCat, fmtMetric, goalsFor, minTarget, targetFor, tierForPrice, wishPct,
} from "@/lib/wishes";

type Profile = { id: string; name: string };
type Tab = "gorev" | "dilek" | "dolap";
type Draft = { title: string; brand: string; cat: WishCat; tier: Tier; price: string; link: string; note: string; shared: boolean; metrics: Metric[]; targets: Partial<Record<Metric, number>>; photoId: string | null; photoUrl: string | null };
type View = { kind: "list" } | { kind: "form"; wish: Wish | null; draft: Draft } | { kind: "ideas" };

const isAysenur = (name: string) => /ay[sş]enur/i.test(name);
const first = (name: string) => name.split(" ")[0];
const tl = (n: number) => `${n.toLocaleString("tr-TR")} ₺`;
const SEEN_KEY = "dilek-kutlandi";

function blankDraft(forAysenur: boolean): Draft {
  const metrics: Metric[] = forAysenur ? ["cilt_gun", "spor_seans", "calisma_dk"] : ["calisma_dk", "spor_seans", "sayfa"];
  return { title: "", brand: "", cat: forAysenur ? "parfum" : "klavye", tier: "nadir", price: "", link: "", note: "", shared: false, metrics, targets: {}, photoId: null, photoUrl: null };
}
const draftOf = (w: Wish): Draft => ({
  title: w.title, brand: w.brand, cat: w.cat, tier: w.tier, price: w.price == null ? "" : String(w.price), link: w.link, note: w.note, shared: w.shared,
  metrics: w.goals.map((g) => g.metric).filter((m) => m !== "aktif_gun"), targets: Object.fromEntries(w.goals.map((g) => [g.metric, g.target])),
  photoId: w.photoId, photoUrl: w.photo,
});
const draftFromIdea = (s: Suggestion, shared: boolean): Draft => ({ ...blankDraft(false), title: s.title, brand: s.brand, cat: s.cat, tier: s.tier, metrics: s.metrics, note: s.note ?? "", shared });

/**
 * Dilek Dolabı: gerçek hayatta almak istediğiniz ödüller. Her dileğin bir görevi var (kademe = süre + tempo);
 * başlatınca süre işler, koşullar tamamlanınca ödül kazanılır ve dolaba girer; gerçekte alınınca "alındı" olur.
 */
export function WishWardrobe({ me, profiles, owner, onClose }: { me: string; profiles: Profile[]; owner: string; onClose: () => void }) {
  const [wishes, setWishes] = useState<Wish[] | null>(null);
  const [person, setPerson] = useState(owner);
  const [tab, setTab] = useState<Tab>("gorev");
  const [view, setView] = useState<View>({ kind: "list" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [party, setParty] = useState<Wish | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  useEffect(() => { box.current?.focus(); }, []);
  useEffect(() => { if (!msg) return; const id = window.setTimeout(() => setMsg(null), 3500); return () => window.clearTimeout(id); }, [msg]);

  const nameOf = (id: string) => first(profiles.find((p) => p.id === id)?.name ?? "");
  const personName = profiles.find((p) => p.id === person)?.name ?? "";
  const mineView = person === me;

  const load = useCallback(async () => {
    try {
      const d = await api<{ wishes: Wish[] }>("/api/gelisim/dilek");
      setWishes(d.wishes);
      setErr(null);
      // yeni kazanılan (bu tarayıcıda kutlanmamış) kendi ya da ortak ödülü: kutlama ve XP
      let seen: string[] = [];
      try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"); } catch { /* özel pencere */ }
      const fresh = d.wishes.find((w) => (w.userId === me || w.shared) && w.status === "kazanildi" && !seen.includes(w.id)
        && w.earnedAt && Date.now() - new Date(w.earnedAt).getTime() < 3 * 86400_000);
      if (fresh) {
        setParty(fresh);
        if (!firstLoad.current || Date.now() - new Date(fresh.earnedAt!).getTime() < 120_000) gainXp(TIERS[fresh.tier].xp);
        try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, fresh.id].slice(-100))); } catch { /* özel pencere */ }
      }
      firstLoad.current = false;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Yüklenemedi.");
    }
  }, [me]);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(null);
    try { await fn(); await load(); } catch (e) { setErr(e instanceof Error ? e.message : "Olmadı, tekrar dene."); }
    setBusy(false);
  };
  const act = (w: Wish, action: string, done: string) => run(async () => { await api(`/api/gelisim/dilek/${w.id}/eylem`, { body: { action } }); setMsg(done); setConfirm(null); });

  const onKey = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // dünyadaki tuşlar çalışmasın
    if (e.key === "Escape") { if (party) setParty(null); else if (view.kind !== "list") setView({ kind: "list" }); else onClose(); }
  };

  // bu kişinin dolabındakiler: kendi dilekleri + ortak dilekler
  const own = (wishes ?? []).filter((w) => w.userId === person || w.shared);
  const quests = own.filter((w) => w.status === "gorevde");
  const list = own.filter((w) => w.status === "dilek");
  const closet = own.filter((w) => w.status === "kazanildi" || w.status === "alindi");
  const activeMine = (wishes ?? []).filter((w) => w.status === "gorevde" && (w.userId === me || w.shared)).length;

  const icon = (w: Pick<Wish, "cat" | "photo" | "title">, big = false) => w.photo
    ? <img className={`wd-photo${big ? " is-big" : ""}`} src={w.photo} alt={w.title} loading="lazy" />
    : <PixelIcon draw={(c, _w, _h, t) => drawWishIcon(c, 0, 0, w.cat, t)} size={[16, 16]} scale={big ? 5 : 3} animate className="wd-icon" />;
  const tierTag = (t: Tier) => <span className="wd-tier" style={{ "--tier": TIERS[t].color } as React.CSSProperties}>{TIERS[t].label}</span>;

  const goalRows = (w: Wish) => (
    <ul className="wd-goals">
      {w.goals.map((g) => {
        const M = METRICS[g.metric];
        return (
          <li key={g.metric}>
            <span className="wd-goal-name">{M.emoji} {M.label}</span>
            {(w.progress.length ? w.progress : [{ userId: w.userId, values: {} }]).map((p) => {
              const v = p.values[g.metric] ?? 0, rem = Math.max(0, g.target - v);
              const left = w.daysLeft ?? 0;
              const pace = rem && left && !M.perDay ? ` · günde ~${fmtMetric(g.metric, Math.ceil(rem / left))}` : "";
              const late = M.perDay && rem > left && !w.expired;
              return (
                <span key={p.userId} className="wd-goal-row">
                  {w.shared && <small className="wd-who">{nameOf(p.userId)}</small>}
                  <span className={`wd-bar${v >= g.target ? " is-full" : ""}`}><i style={{ width: `${Math.min(100, (v / g.target) * 100)}%` }} /></span>
                  <small className="num">{fmtMetric(g.metric, v)} / {fmtMetric(g.metric, g.target)}</small>
                  {rem > 0 && w.status === "gorevde" && !w.expired && <small className={`wd-pace${late ? " is-late" : ""}`}>{late ? "bu hızla yetişmez" : `kalan ${fmtMetric(g.metric, rem)}${pace}`}</small>}
                </span>
              );
            })}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div ref={box} tabIndex={-1} className="modal wd" role="dialog" aria-modal="true" aria-labelledby="wd-title" onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="wd-head">
          <h2 id="wd-title">🎁 {mineView ? "Dilek Dolabım" : `${first(personName)}'in Dilek Dolabı`}</h2>
          <button type="button" className="btn btn-quiet" onClick={onClose} aria-label="Kapat">✕</button>
        </div>
        <div className="chips" role="group" aria-label="Kimin dolabı">
          {profiles.map((p) => (
            <button key={p.id} type="button" className="chip" aria-pressed={person === p.id} onClick={() => { setPerson(p.id); setView({ kind: "list" }); }}>
              {p.id === me ? "Benim" : `${first(p.name)}'in`}
            </button>
          ))}
        </div>

        {party && (
          <div className="wd-party" role="status">
            <div className="wd-confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, k) => <i key={k} style={{ "--k": k } as React.CSSProperties} />)}</div>
            {icon(party, true)}
            <div>
              <b>🎉 Kazandın: {party.title}</b>
              <p>{TIERS[party.tier].label} görev tamam · +{TIERS[party.tier].xp} XP. Artık gerçekten alabilirsin; aldığında dolapta "Aldım" de.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { setParty(null); setTab("dolap"); setView({ kind: "list" }); }}>Dolaba bak</button>
            </div>
          </div>
        )}

        {err && <p className="form-error">{err}</p>}
        {msg && <p className="st-msg" role="status">{msg}</p>}

        {!wishes ? <p className="muted">{err ? "" : "Yükleniyor..."}</p>
          : view.kind === "form" ? <WishForm key={view.wish?.id ?? "yeni"} wish={view.wish} draft={view.draft} busy={busy} onCancel={() => setView({ kind: "list" })}
            onSave={(body) => run(async () => {
              await api(view.wish ? `/api/gelisim/dilek/${view.wish.id}` : "/api/gelisim/dilek", { method: view.wish ? "PATCH" : "POST", body });
              setView({ kind: "list" }); setTab("dilek"); setMsg(view.wish ? "Dilek güncellendi." : "Dileğin dolaba eklendi. Hazır olunca görevi başlat.");
            })}
            onDelete={view.wish ? () => run(async () => { await api(`/api/gelisim/dilek/${view.wish!.id}`, { method: "DELETE" }); setView({ kind: "list" }); setMsg("Dilek silindi."); }) : undefined} />
          : view.kind === "ideas" ? (
            <Ideas forAysenur={isAysenur(personName)} onPick={(s, shared) => setView({ kind: "form", wish: null, draft: draftFromIdea(s, shared) })} onCancel={() => setView({ kind: "list" })} />
          ) : (
            <>
              <div className="chips wd-tabs" role="tablist">
                <button type="button" role="tab" className="chip" aria-selected={tab === "gorev"} onClick={() => setTab("gorev")}>⚔️ Görevde <span className="count">{quests.length}</span></button>
                <button type="button" role="tab" className="chip" aria-selected={tab === "dilek"} onClick={() => setTab("dilek")}>📜 Dilekler <span className="count">{list.length}</span></button>
                <button type="button" role="tab" className="chip" aria-selected={tab === "dolap"} onClick={() => setTab("dolap")}>🚪 Dolap <span className="count">{closet.length}</span></button>
              </div>

              {tab === "gorev" && (
                quests.length === 0 ? (
                  <div className="wd-empty">
                    <p>{mineView ? "Şu an bir ödül için çalışmıyorsun." : `${first(personName)} şu an bir görevde değil.`}</p>
                    {mineView && <button type="button" className="btn btn-primary" onClick={() => setTab("dilek")}>Dileklerinden birini seç</button>}
                  </div>
                ) : (
                  <ul className="wd-quests">
                    {quests.map((w) => {
                      const pct = Math.round(wishPct(w) * 100), canAct = w.userId === me;
                      return (
                        <li key={w.id} className={`wd-quest${w.expired ? " is-expired" : ""}`} style={{ "--tier": TIERS[w.tier].color } as React.CSSProperties}>
                          <div className="wd-quest-top">
                            {icon(w)}
                            <div className="grow">
                              <b>{w.title}</b>
                              <small className="muted">{[w.brand, WISH_CATS[w.cat].label, w.shared ? "❤️ ortak" : null].filter(Boolean).join(" · ")}</small>
                            </div>
                            {tierTag(w.tier)}
                          </div>
                          <div className="wd-pct"><span className="wd-bar is-big"><i style={{ width: `${pct}%` }} /></span><b className="num">%{pct}</b></div>
                          <p className="wd-time">{w.expired ? "⌛ Süre doldu: bu sefer olmadı." : `⏳ ${w.daysLeft} gün kaldı · ${w.days} günlük görev${w.attempts > 1 ? ` · ${w.attempts}. deneme` : ""}`}</p>
                          {goalRows(w)}
                          {canAct && (
                            <div className="row st-actions">
                              {w.expired && <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act(w, "yeniden", "Görev bugünden yeniden başladı. Bu sefer olacak!")}>↻ Yeniden dene</button>}
                              {confirm === w.id
                                ? <><button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => act(w, "birak", "Görev bırakıldı; dilek listende duruyor.")}>Evet, bırak</button>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>Vazgeç</button></>
                                : <button type="button" className="btn btn-quiet btn-sm" onClick={() => setConfirm(w.id)}>{w.expired ? "Listeye geri al" : "Görevi bırak"}</button>}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )
              )}

              {tab === "dilek" && (
                <>
                  {mineView && <p className="muted wd-intro">Bir dilek seç, görevini başlat: süre işlemeye başlar ve koşullar yalnız o günlerden sayılır. Aynı anda en fazla {MAX_ACTIVE} görev ({activeMine}/{MAX_ACTIVE}).</p>}
                  {!mineView && <p className="muted wd-intro">{first(personName)}'in dilekleri. 🎁 ile hediye etmek istediğini işaretle: bunu yalnız sen görürsün.</p>}
                  {list.length === 0 && <p className="wd-empty">{mineView ? "Henüz dilek yok. Aşağıdan ekle ya da fikirlere bak." : "Henüz dilek eklememiş."}</p>}
                  <ul className="wd-grid">
                    {list.map((w) => (
                      <li key={w.id} className="wd-card" style={{ "--tier": TIERS[w.tier].color } as React.CSSProperties}>
                        <div className="wd-card-top">{icon(w)}{tierTag(w.tier)}</div>
                        <b>{w.title}</b>
                        <small className="muted">{[w.brand, WISH_CATS[w.cat].label, w.price != null ? tl(w.price) : null, w.shared ? "❤️ ortak" : null].filter(Boolean).join(" · ")}</small>
                        {w.note && <span className="st-note">“{w.note}”</span>}
                        <small className="wd-req">{TIERS[w.tier].days} gün: {w.goals.map((g) => `${METRICS[g.metric].emoji} ${fmtMetric(g.metric, g.target)}`).join(" · ")}</small>
                        <div className="row st-actions">
                          {w.userId === me && <button type="button" className="btn btn-primary btn-sm" disabled={busy || activeMine >= MAX_ACTIVE} title={activeMine >= MAX_ACTIVE ? "Önce süren bir görevi bitir ya da bırak" : undefined}
                            onClick={() => act(w, "baslat", `Görev başladı: ${TIERS[w.tier].days} gün. Başarılar!`)}>▶ Görevi başlat</button>}
                          {w.userId === me && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView({ kind: "form", wish: w, draft: draftOf(w) })}>Düzenle</button>}
                          {w.link && <a className="btn btn-quiet btn-sm" href={w.link} target="_blank" rel="noopener noreferrer">Bağlantı ↗</a>}
                          {w.userId !== me && !w.shared && <button type="button" className={`btn btn-sm ${w.giftByMe ? "btn-primary" : "btn-ghost"}`} aria-pressed={w.giftByMe} disabled={busy}
                            onClick={() => act(w, "hediye", w.giftByMe ? "Hediye işareti kaldırıldı." : "🎁 Not edildi: kazanınca hediyesini sen alacaksın.")}>🎁 {w.giftByMe ? "Ben alacağım" : "Hediye et"}</button>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {mineView && (
                    <div className="row">
                      <button type="button" className="btn btn-primary" onClick={() => setView({ kind: "form", wish: null, draft: blankDraft(isAysenur(personName)) })}>+ Yeni dilek</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setView({ kind: "ideas" })}>💡 Fikirler</button>
                    </div>
                  )}
                </>
              )}

              {tab === "dolap" && (
                closet.length === 0 ? <p className="wd-empty">Dolap şimdilik boş. İlk görevini tamamlayınca ödülün buraya, rafa girer.</p> : (
                  <div className="wd-closet" aria-label="Kazanılan ödüller">
                    {closet.map((w) => (
                      <div key={w.id} className={`wd-slot${w.status === "kazanildi" ? " is-new" : ""}`} style={{ "--tier": TIERS[w.tier].color } as React.CSSProperties}>
                        {icon(w)}
                        <b>{w.title}</b>
                        <small className="muted">{w.status === "alindi" ? `✓ Alındı · ${new Date(w.claimedAt!).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}` : "Kazanıldı · henüz alınmadı"}</small>
                        {w.giftByMe && w.status === "kazanildi" && <small className="wd-gift">🎁 Hediyesini sen alacaktın!</small>}
                        {w.userId === me && (w.status === "kazanildi"
                          ? <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act(w, "aldim", "Afiyetle kullan! Dolabında yerini aldı.")}>Aldım ✓</button>
                          : <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={() => act(w, "almadim", "Geri alındı.")}>Geri al</button>)}
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
      </div>
    </div>
  );
}

/* ---------------------------------- fikirler ---------------------------------- */

function Ideas({ forAysenur, onPick, onCancel }: { forAysenur: boolean; onPick: (s: Suggestion, shared: boolean) => void; onCancel: () => void }) {
  const mine = SUGGESTIONS[forAysenur ? "aysenur" : "cengiz"];
  const card = (s: Suggestion, shared: boolean) => (
    <li key={s.title}>
      <button type="button" className="wd-idea" onClick={() => onPick(s, shared)} style={{ "--tier": TIERS[s.tier].color } as React.CSSProperties}>
        <PixelIcon draw={(c) => drawWishIcon(c, 0, 0, s.cat)} size={[16, 16]} scale={2} className="wd-icon" />
        <span className="grow"><b>{s.title}</b><small className="muted">{[s.brand, WISH_CATS[s.cat].label, TIERS[s.tier].label].filter(Boolean).join(" · ")}</small></span>
      </button>
    </li>
  );
  return (
    <div className="stack">
      <h3 className="st-sub">💡 Fikirler</h3>
      <p className="muted wd-intro">Dokun, form dolsun; fiyatı, bağlantıyı ve fotoğrafı sen ekle. Kademeyi fiyata göre değiştirebilirsin.</p>
      <ul className="wd-ideas">{mine.map((s) => card(s, false))}</ul>
      <h3 className="st-sub">❤️ Birlikte</h3>
      <p className="muted wd-intro">Ortak dileklerde koşulları ikiniz de ayrı ayrı tamamlarsınız.</p>
      <ul className="wd-ideas">{SUGGESTIONS.ortak.map((s) => card(s, true))}</ul>
      <div className="row"><button type="button" className="btn btn-ghost" onClick={onCancel}>Geri</button></div>
    </div>
  );
}

/* ----------------------------------- form ----------------------------------- */

function WishForm({ wish, draft, busy, onSave, onCancel, onDelete }: {
  wish: Wish | null; draft: Draft; busy: boolean; onSave: (b: object) => void; onCancel: () => void; onDelete?: () => void;
}) {
  const [d, setD] = useState(draft);
  const [uploading, setUploading] = useState(false);
  const [upErr, setUpErr] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const locked = !!wish && wish.status !== "dilek"; // görevdeyken koşullar kilitli
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const goals: Goal[] = goalsFor(d.tier, d.metrics).map((g) => ({ ...g, target: d.targets[g.metric] ?? g.target }));
  const priceN = d.price.trim() ? Number(d.price) : null;
  const suggested = priceN != null && Number.isFinite(priceN) ? tierForPrice(priceN) : null;

  const toggleMetric = (m: Metric) => setD((x) => ({
    ...x, metrics: x.metrics.includes(m) ? x.metrics.filter((y) => y !== m) : x.metrics.length >= 4 ? x.metrics : [...x.metrics, m],
  }));
  const setTier = (t: Tier) => setD((x) => ({ ...x, tier: t, targets: {} })); // kademe değişince hedefler öneriye döner

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    setUploading(true); setUpErr(null);
    try { const id = await uploadImage(f, "dilek", 1200); setD((x) => ({ ...x, photoId: id, photoUrl: URL.createObjectURL(f) })); }
    catch (e) { setUpErr(e instanceof Error ? e.message : "Yüklenemedi."); }
    setUploading(false);
  };

  return (
    <form className="stack st-form wd-form" onSubmit={(e) => {
      e.preventDefault();
      onSave({ title: d.title, brand: d.brand, cat: d.cat, tier: d.tier, price: d.price, link: d.link, note: d.note, shared: d.shared, photo: d.photoId, goals });
    }}>
      <h3 className="st-sub">{wish ? "Dileği düzenle" : "Yeni dilek"}</h3>
      <div className="st-two">
        <span>
          <label className="field-label" htmlFor="wd-title-in">Ne istiyorsun?</label>
          <input id="wd-title-in" className="input" maxLength={80} value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="Ör. Libre EDP 50 ml" autoFocus required />
        </span>
        <span>
          <label className="field-label" htmlFor="wd-brand">Marka</label>
          <input id="wd-brand" className="input" maxLength={60} value={d.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Ör. YSL" />
        </span>
      </div>
      <span className="field-label">Kategori</span>
      <div className="chips wd-cats" role="radiogroup" aria-label="Kategori">
        {CAT_ORDER.map((c) => <button key={c} type="button" role="radio" className="chip" aria-checked={d.cat === c} onClick={() => set("cat", c)}>{WISH_CATS[c].emoji} {WISH_CATS[c].label}</button>)}
      </div>
      <div className="st-two">
        <span>
          <label className="field-label" htmlFor="wd-price">Yaklaşık fiyat (₺, isteğe bağlı)</label>
          <input id="wd-price" className="input" type="number" inputMode="numeric" min={0} value={d.price} onChange={(e) => set("price", e.target.value)} placeholder="Ör. 4500" />
          {suggested && !locked && suggested !== d.tier && <button type="button" className="btn btn-quiet btn-sm wd-suggest" onClick={() => setTier(suggested)}>Bu fiyata {TIERS[suggested].label} uygun: seç</button>}
        </span>
        <span>
          <label className="field-label" htmlFor="wd-link">Bağlantı (isteğe bağlı)</label>
          <input id="wd-link" className="input" type="url" maxLength={500} value={d.link} onChange={(e) => set("link", e.target.value)} placeholder="https://..." />
        </span>
      </div>

      <span className="field-label">Kademe · görevin zorluğu</span>
      {locked && <p className="muted wd-locked">🔒 Görev sürerken kademe ve koşullar değişmez. Değiştirmek için görevi bırak.</p>}
      <div className="wd-tiers" role="radiogroup" aria-label="Kademe">
        {TIER_ORDER.map((t) => (
          <button key={t} type="button" role="radio" aria-checked={d.tier === t} disabled={locked} className="wd-tier-card" style={{ "--tier": TIERS[t].color } as React.CSSProperties} onClick={() => setTier(t)}>
            <b>{TIERS[t].label}</b><small>{TIERS[t].days} gün · +{TIERS[t].xp} XP</small><small className="muted">{TIERS[t].hint}</small>
          </button>
        ))}
      </div>

      <span className="field-label">Ölçütler (en fazla 4) · her görevde düzenli olmak da şart</span>
      <div className="chips wd-metrics" role="group" aria-label="Ölçütler">
        {METRIC_ORDER.map((m) => <button key={m} type="button" className="chip" aria-pressed={d.metrics.includes(m)} disabled={locked} onClick={() => toggleMetric(m)} title={METRICS[m].hint}>{METRICS[m].emoji} {METRICS[m].label}</button>)}
      </div>
      <ul className="wd-targets">
        {goals.map((g) => {
          const M = METRICS[g.metric], lo = minTarget(g.metric, d.tier), hi = targetFor(g.metric, d.tier) * 3;
          return (
            <li key={g.metric}>
              <span>{M.emoji} {M.label}<small className="muted"> · {g.metric === "aktif_gun" ? `${TIERS[d.tier].days} günün en az %${Math.round(TIERS[d.tier].active * 100)}'i` : M.hint}</small></span>
              {g.metric === "aktif_gun" ? <b className="num">{g.target} gün</b> : (
                <span className="wd-target-in">
                  <input className="input" type="number" inputMode="numeric" min={lo} max={hi} step={M.step} value={g.target} disabled={locked}
                    onChange={(e) => setD((x) => ({ ...x, targets: { ...x.targets, [g.metric]: Number(e.target.value) } }))} aria-label={`${M.label} hedefi`} />
                  <small className="muted">{M.unit}</small>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="muted wd-hint">Hedefler {TIERS[d.tier].days} günlük önerilen tempodur; en fazla %20 hafifletebilir, istediğin kadar zorlaştırabilirsin.</p>

      <label className="check-row"><input type="checkbox" checked={d.shared} disabled={locked} onChange={(e) => set("shared", e.target.checked)} /> ❤️ Ortak dilek: koşulları ikimiz de tamamlarız</label>
      <label className="field-label" htmlFor="wd-note">Neden istiyorum? (isteğe bağlı)</label>
      <input id="wd-note" className="input" maxLength={300} value={d.note} onChange={(e) => set("note", e.target.value)} placeholder="Ör. ilk maaşımı kutlamak için" />

      <span className="field-label">Fotoğraf (isteğe bağlı)</span>
      <div className="row wd-photo-row">
        {d.photoUrl && <img className="wd-photo" src={d.photoUrl} alt="" />}
        <label className="btn btn-ghost btn-sm">
          {uploading ? "Yükleniyor..." : d.photoUrl ? "Değiştir" : "Fotoğraf seç"}
          <input type="file" accept="image/*" hidden onChange={(e) => void pickPhoto(e.target.files?.[0])} />
        </label>
        {d.photoUrl && <button type="button" className="btn btn-quiet btn-sm" onClick={() => setD((x) => ({ ...x, photoId: null, photoUrl: null }))}>Kaldır</button>}
      </div>
      {upErr && <p className="form-error">{upErr}</p>}

      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy || uploading || !d.title.trim()}>Kaydet</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Vazgeç</button>
        {onDelete && (sure
          ? <button type="button" className="btn btn-danger" disabled={busy} onClick={onDelete}>Evet, sil</button>
          : <button type="button" className="btn btn-quiet" onClick={() => setSure(true)}>Sil</button>)}
      </div>
    </form>
  );
}
