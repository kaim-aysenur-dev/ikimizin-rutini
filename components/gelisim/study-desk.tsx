"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gainXp } from "@/components/xp-badge";
import { api } from "@/lib/api-client";
import { WEEKDAY_SHORT, diffDays, formatDayShort, todayIstanbul, weekdayIndex } from "@/lib/dates";
import { formatClock } from "@/lib/slots";
import {
  BOOK_KINDS, BOOK_STATUS, type Book, type BookKind, type BookStatus, STUDY_COLORS, STUDY_XP, type StudyArea, type StudyColor,
  type StudyOverview, type StudySession, type StudyTimer, studyXp,
} from "@/lib/study";

export type StudyTab = "masa" | "kitaplik";
type Profile = { id: string; name: string };
type Target = { areaId: string } | { bookId: string };
type View =
  | { kind: "list" }
  | { kind: "area"; area: StudyArea | null }
  | { kind: "book"; book: Book | null }
  | { kind: "log"; target: Target; label: string; fromTimer: boolean; book: Book | null };

const COLOR_NAMES: Record<StudyColor, string> = { pm: "Mor", am: "Amber", shower: "Mavi", ok: "Yeşil", week: "Gül", bad: "Kiremit" };

const fmtMin = (m: number) => (m < 60 ? `${m} dk` : `${Math.floor(m / 60)} sa${m % 60 ? ` ${m % 60} dk` : ""}`);
function dayLabel(day: string, today: string) {
  const d = diffDays(today, day);
  return d === 0 ? "Bugün" : d === 1 ? "Dün" : d < 7 ? `${WEEKDAY_SHORT[weekdayIndex(day)]} · ${formatDayShort(day)}` : formatDayShort(day);
}
const num = (v: string) => (v.trim() === "" ? "" : Number(v));

/**
 * Çalışma odasındaki masa ve kitaplık: alanlar (Python, Network...) ve okuma listesi, süre tutma, sayfa,
 * günlük ve XP. Ortak alan/kitaplara ikiniz de kayıt girersiniz; aynı anda çalışınca oturum +%50 XP.
 */
export function StudyDesk({ me, profiles, tab: firstTab, onClose, onTimer }: {
  me: string; profiles: Profile[]; tab: StudyTab; onClose: () => void;
  onTimer: (t: { label: string; startedAt: string } | null) => void;
}) {
  const [tab, setTab] = useState<StudyTab>(firstTab);
  const [data, setData] = useState<StudyOverview | null>(null);
  const [offset, setOffset] = useState(0); // sunucu saati - tarayıcı saati
  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState<View>({ kind: "list" });
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [bookFilter, setBookFilter] = useState<BookStatus | "tum">("okunuyor");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const today = todayIstanbul();

  // odak panelde olsun: tuşlar dünyaya gitmez (karakter yürümez, E envanteri açmaz)
  useEffect(() => { box.current?.focus(); }, []);

  const load = useCallback(async () => {
    try {
      const d = await api<StudyOverview>("/api/gelisim/calisma");
      setData(d);
      setOffset(new Date(d.serverNow).getTime() - Date.now());
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Yüklenemedi.");
    }
  }, []);

  // diğerinin sayacını canlı görmek için ara ara yenilenir
  useEffect(() => { void load(); const id = window.setInterval(load, 15_000); return () => window.clearInterval(id); }, [load]);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => { if (!msg) return; const id = window.setTimeout(() => setMsg(null), 3200); return () => window.clearTimeout(id); }, [msg]);

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.name.split(" ")[0] ?? "";
  const partner = profiles.find((p) => p.id !== me);
  const areaById = new Map(data?.areas.map((a) => [a.id, a]));
  const bookById = new Map(data?.books.map((b) => [b.id, b]));
  const timerLabel = (t: StudyTimer) =>
    (t.areaId ? areaById.get(t.areaId)?.name : t.bookId ? bookById.get(t.bookId)?.title : null) ?? (t.bookId ? "bir kitap" : "kendi çalışması");
  const elapsed = (t: StudyTimer) => Math.max(0, (now + offset - new Date(t.startedAt).getTime()) / 1000);
  const myTimer = data?.timers.find((t) => t.userId === me) ?? null;
  const theirTimer = data?.timers.find((t) => t.userId !== me) ?? null;
  const myLabel = myTimer ? timerLabel(myTimer) : null;

  // dünyadaki çubukta çalışan sayacı göstermek için
  useEffect(() => { onTimer(myTimer && myLabel ? { label: myLabel, startedAt: myTimer.startedAt } : null); }, [myTimer?.startedAt, myLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(null);
    try { await fn(); await load(); } catch (e) { setErr(e instanceof Error ? e.message : "Olmadı, tekrar dene."); }
    setBusy(false);
  };

  const start = (target: Target) => run(async () => { await api("/api/gelisim/calisma/sayac", { body: target }); });
  const cancel = () => run(async () => { await api("/api/gelisim/calisma/sayac", { method: "DELETE" }); });
  const finishTimer = () => {
    if (!myTimer) return;
    const target: Target = myTimer.areaId ? { areaId: myTimer.areaId } : { bookId: myTimer.bookId! };
    setView({ kind: "log", target, label: myLabel ?? "", fromTimer: true, book: myTimer.bookId ? bookById.get(myTimer.bookId) ?? null : null });
  };
  const removeSession = (s: StudySession) => run(async () => {
    const res = await api<{ xp: number }>(`/api/gelisim/calisma/oturum/${s.id}`, { method: "DELETE" });
    if (res.xp) gainXp(-res.xp);
    setConfirm(null);
  });

  const onKey = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // dünyadaki yürüme ve kısayol tuşları çalışmasın
    if (e.key === "Escape") { if (view.kind !== "list") setView({ kind: "list" }); else onClose(); }
  };

  const startBtn = (target: Target, isRunning: boolean, label: string) => (
    <button type="button" className="btn btn-primary btn-sm" disabled={busy || !!myTimer}
      title={myTimer && !isRunning ? "Önce çalışan sayacı bitir" : undefined} onClick={() => start(target)}>
      {isRunning ? "⏱ Çalışıyor" : `▶ ${label}`}
    </button>
  );

  const sessionsOf = (pred: (s: StudySession) => boolean) => {
    const list = (data?.sessions ?? []).filter(pred);
    const days = [...new Set(list.map((s) => s.day))];
    return days.map((day) => ({ day, items: list.filter((s) => s.day === day) }));
  };

  const journal = (groups: { day: string; items: StudySession[] }[], empty: string) => (
    groups.length === 0 ? <p className="muted st-empty">{empty}</p> : (
      <ol className="st-journal">
        {groups.map((g) => (
          <li key={g.day}>
            <p className="st-day"><b>{dayLabel(g.day, today)}</b><span>{fmtMin(g.items.reduce((n, s) => n + s.minutes, 0))}{g.items.some((s) => s.pages) ? ` · ${g.items.reduce((n, s) => n + s.pages, 0)} sayfa` : ""}</span></p>
            <ul>
              {g.items.map((s) => {
                const name = s.areaId ? areaById.get(s.areaId)?.name : s.bookId ? bookById.get(s.bookId)?.title : null;
                const color = s.areaId ? areaById.get(s.areaId)?.color : undefined;
                return (
                  <li key={s.id} className="st-entry" data-color={color}>
                    <i aria-hidden="true" />
                    <span className="grow">
                      <b>{name ?? "Kaldırılmış"}</b>
                      <small>
                        {[s.minutes ? fmtMin(s.minutes) : null, s.pages ? `${s.pages} sayfa` : null, s.userId !== me ? nameOf(s.userId) : null, s.together ? "❤️ birlikte" : null, `+${studyXp(s.minutes, s.pages, s.together)} XP`].filter(Boolean).join(" · ")}
                      </small>
                      {s.note && <span className="st-note">{s.note}</span>}
                    </span>
                    {s.userId === me && (confirm === s.id ? (
                      <span className="row st-confirm">
                        <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => removeSession(s)}>Sil</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>Vazgeç</button>
                      </span>
                    ) : (
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => setConfirm(s.id)} aria-label="Bu kaydı sil">✕</button>
                    ))}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    )
  );

  const visibleBooks = (data?.books ?? []).filter((b) => bookFilter === "tum" || b.status === bookFilter);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div ref={box} tabIndex={-1} className="modal st" role="dialog" aria-modal="true" aria-labelledby="st-title" onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="st-head">
          <h2 id="st-title">{tab === "masa" ? "📚 Çalışma masası" : "📖 Kitaplık"}</h2>
          <button type="button" className="btn btn-quiet" onClick={onClose} aria-label="Kapat">✕</button>
        </div>
        <div className="chips" role="tablist">
          <button type="button" role="tab" className="chip" aria-selected={tab === "masa"} onClick={() => { setTab("masa"); setView({ kind: "list" }); }}>Masa · alanlar</button>
          <button type="button" role="tab" className="chip" aria-selected={tab === "kitaplik"} onClick={() => { setTab("kitaplik"); setView({ kind: "list" }); }}>Kitaplık · okuma listesi</button>
        </div>

        {(myTimer || theirTimer) && (
          <div className="st-live" aria-live="polite">
            {myTimer && (
              <div className="st-live-row is-mine">
                <span className="grow">⏱ <b>{myLabel}</b></span>
                <b className="num st-clock">{formatClock(elapsed(myTimer))}</b>
                <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={finishTimer}>Bitir ve kaydet</button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={cancel}>Vazgeç</button>
              </div>
            )}
            {theirTimer && (
              <div className="st-live-row">
                <span className="grow">🟢 <b>{nameOf(theirTimer.userId)}</b> şu an <b>{timerLabel(theirTimer)}</b> {theirTimer.bookId ? "okuyor" : "çalışıyor"}</span>
                <b className="num st-clock">{formatClock(elapsed(theirTimer))}</b>
              </div>
            )}
            {theirTimer && <p className="st-together">{myTimer ? "❤️ Birlikte çalışıyorsunuz: bu oturum +%50 XP." : "Sen de bir sayaç başlat: birlikte çalışılan oturum +%50 XP."}</p>}
          </div>
        )}

        {err && <p className="form-error">{err}</p>}
        {msg && <p className="st-msg" role="status">{msg}</p>}

        {!data ? <p className="muted">{err ? "" : "Yükleniyor..."}</p>
          : view.kind === "area" ? <AreaForm area={view.area} mine={!view.area || view.area.userId === me} busy={busy} onCancel={() => setView({ kind: "list" })}
            onSave={(body) => run(async () => {
              await api(view.area ? `/api/gelisim/calisma/alan/${view.area.id}` : "/api/gelisim/calisma/alan", { method: view.area ? "PATCH" : "POST", body });
              setView({ kind: "list" }); setMsg(view.area ? "Alan güncellendi." : "Alan masaya eklendi.");
            })}
            onArchive={view.area && view.area.userId === me ? () => run(async () => { await api(`/api/gelisim/calisma/alan/${view.area!.id}`, { method: "DELETE" }); setView({ kind: "list" }); setMsg("Alan kaldırıldı; geçmiş kayıtlar duruyor."); }) : undefined} />
          : view.kind === "book" ? <BookForm book={view.book} mine={!view.book || view.book.userId === me} busy={busy} onCancel={() => setView({ kind: "list" })}
            onSave={(body) => run(async () => {
              await api(view.book ? `/api/gelisim/calisma/kitap/${view.book.id}` : "/api/gelisim/calisma/kitap", { method: view.book ? "PATCH" : "POST", body });
              setView({ kind: "list" }); setMsg(view.book ? "Kitap güncellendi." : "Okuma listesine eklendi.");
            })}
            onArchive={view.book && view.book.userId === me ? () => run(async () => { await api(`/api/gelisim/calisma/kitap/${view.book!.id}`, { method: "DELETE" }); setView({ kind: "list" }); setMsg("Kitap listeden kaldırıldı."); }) : undefined} />
          : view.kind === "log" ? <LogForm view={view} elapsedMin={myTimer ? Math.round(elapsed(myTimer) / 60) : 0} busy={busy} onCancel={() => setView({ kind: "list" })}
            onSave={(body) => run(async () => {
              const res = await api<{ xp: number; together: boolean; minutes: number; pages: number }>("/api/gelisim/calisma/oturum", { body: { ...view.target, fromTimer: view.fromTimer, ...body } });
              if (res.xp) gainXp(res.xp);
              setView({ kind: "list" });
              setMsg(`Kaydedildi: ${[res.minutes ? fmtMin(res.minutes) : null, res.pages ? `${res.pages} sayfa` : null].filter(Boolean).join(", ")} · +${res.xp} XP${res.together ? " · birlikte ❤️" : ""}`);
            })} />
          : tab === "masa" ? (
            <>
              <p className="muted st-intro">Masandaki çalışma alanları. Sayaçla süre tut, sayfa gir; her 15 dakika {STUDY_XP.quarter} XP, her 2 sayfa 1 XP. Ortak alanlara {partner ? partner.name.split(" ")[0] : "diğeriniz"} da kayıt girer.</p>
              {data.areas.length === 0 && <p className="st-empty">Henüz alan yok. Örneğin <b>Python</b>, <b>Network</b> ya da <b>İngilizce</b> ekle.</p>}
              <ul className="st-cards">
                {data.areas.map((a) => {
                  const running = myTimer?.areaId === a.id;
                  return (
                    <li key={a.id} className={`st-card${areaFilter === a.id ? " is-picked" : ""}`} data-color={a.color}>
                      <div className="st-card-top">
                        <b>{a.name}</b>
                        {a.shared && <span className="st-tag">Ortak</span>}
                        {a.userId !== me && <span className="st-tag">{nameOf(a.userId)}</span>}
                      </div>
                      {a.dailyMinutes ? (
                        <div className="st-bar" title={`Bugün ${a.todayMin} / ${a.dailyMinutes} dk`}><i style={{ width: `${Math.min(100, (a.todayMin / a.dailyMinutes) * 100)}%` }} /></div>
                      ) : null}
                      <small className="muted">Bugün {fmtMin(a.todayMin)}{a.dailyMinutes ? ` / ${fmtMin(a.dailyMinutes)}` : ""} · toplam {fmtMin(a.totalMin)}{a.totalPages ? ` · ${a.totalPages} sayfa` : ""}</small>
                      <div className="row st-actions">
                        {startBtn({ areaId: a.id }, running, "Başlat")}
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setView({ kind: "log", target: { areaId: a.id }, label: a.name, fromTimer: false, book: null })}>+ Elle</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView({ kind: "area", area: a })}>Düzenle</button>
                        <button type="button" className="btn btn-quiet btn-sm" aria-pressed={areaFilter === a.id} onClick={() => setAreaFilter(areaFilter === a.id ? null : a.id)}>Günlük</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="btn btn-ghost" onClick={() => setView({ kind: "area", area: null })}>+ Yeni alan</button>
              <h3 className="st-sub">Günlük{areaFilter ? ` · ${areaById.get(areaFilter)?.name ?? ""}` : ""}</h3>
              {journal(sessionsOf((s) => (areaFilter ? s.areaId === areaFilter : !!s.areaId)), "Henüz kayıt yok. Bir alanda sayacı başlat ya da elle ekle.")}
            </>
          ) : (
            <>
              <p className="muted st-intro">Okuma listen: kitaplar ve yayınlar. Okurken süre tut, bitirince kaldığın sayfayı yaz; okuduğun her 2 sayfa 1 XP.</p>
              <div className="chips" role="group" aria-label="Duruma göre">
                {(["okunuyor", "okunacak", "bitti", "tum"] as const).map((s) => (
                  <button key={s} type="button" className="chip" aria-pressed={bookFilter === s} onClick={() => setBookFilter(s)}>
                    {s === "tum" ? "Tümü" : BOOK_STATUS[s]} <span className="count">{s === "tum" ? data.books.length : data.books.filter((b) => b.status === s).length}</span>
                  </button>
                ))}
              </div>
              {visibleBooks.length === 0 && <p className="st-empty">{data.books.length ? "Bu rafta kitap yok." : "Okuma listen boş. İlk kitabını ya da yayınını ekle."}</p>}
              <ul className="st-cards">
                {visibleBooks.map((b) => {
                  const running = myTimer?.bookId === b.id;
                  const pct = b.totalPages ? Math.min(100, Math.round((b.currentPage / b.totalPages) * 100)) : null;
                  return (
                    <li key={b.id} className="st-card st-book" data-color={b.kind === "yayin" ? "shower" : "week"}>
                      <div className="st-card-top">
                        <b>{b.title}</b>
                        <span className="st-tag">{BOOK_KINDS[b.kind]}</span>
                        {b.shared && <span className="st-tag">Ortak</span>}
                        {b.userId !== me && <span className="st-tag">{nameOf(b.userId)}</span>}
                      </div>
                      {b.author && <small className="muted">{b.author}</small>}
                      {pct !== null && <div className="st-bar"><i style={{ width: `${pct}%` }} /></div>}
                      <small className="muted">
                        {b.totalPages ? `Sayfa ${b.currentPage} / ${b.totalPages} · %${pct}` : `Sayfa ${b.currentPage}`}{b.totalMin ? ` · ${fmtMin(b.totalMin)} okundu` : ""} · {BOOK_STATUS[b.status]}
                      </small>
                      {b.note && <span className="st-note">📍 {b.note}</span>}
                      <div className="row st-actions">
                        {b.status !== "bitti" && startBtn({ bookId: b.id }, running, "Oku")}
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setView({ kind: "log", target: { bookId: b.id }, label: b.title, fromTimer: false, book: b })}>Sayfa gir</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView({ kind: "book", book: b })}>Düzenle</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="btn btn-ghost" onClick={() => setView({ kind: "book", book: null })}>+ Kitap / yayın ekle</button>
              <h3 className="st-sub">Okuma günlüğü</h3>
              {journal(sessionsOf((s) => !!s.bookId), "Henüz okuma kaydı yok.")}
            </>
          )}
      </div>
    </div>
  );
}

/* ---------------------------------- formlar ---------------------------------- */

function AreaForm({ area, mine, busy, onSave, onCancel, onArchive }: {
  area: StudyArea | null; mine: boolean; busy: boolean; onSave: (b: object) => void; onCancel: () => void; onArchive?: () => void;
}) {
  const [name, setName] = useState(area?.name ?? "");
  const [color, setColor] = useState<StudyColor>(area?.color ?? "pm");
  const [daily, setDaily] = useState(area?.dailyMinutes ? String(area.dailyMinutes) : "");
  const [shared, setShared] = useState(area?.shared ?? false);
  const [sure, setSure] = useState(false);
  return (
    <form className="stack st-form" onSubmit={(e) => { e.preventDefault(); onSave({ name, color, dailyMinutes: num(daily), shared }); }}>
      <h3 className="st-sub">{area ? "Alanı düzenle" : "Yeni çalışma alanı"}</h3>
      <label className="field-label" htmlFor="st-name">Ad</label>
      <input id="st-name" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Python, Network, İngilizce..." autoFocus required />
      <label className="field-label" htmlFor="st-daily">Günlük hedef (dakika, isteğe bağlı)</label>
      <input id="st-daily" className="input" type="number" inputMode="numeric" min={5} max={720} value={daily} onChange={(e) => setDaily(e.target.value)} placeholder="Ör. 45" />
      <span className="field-label">Renk</span>
      <div className="swatches" role="radiogroup" aria-label="Renk">
        {STUDY_COLORS.map((c) => (
          <button key={c} type="button" role="radio" className="swatch" data-color={c} aria-checked={color === c} aria-label={COLOR_NAMES[c]} onClick={() => setColor(c)} />
        ))}
      </div>
      {mine && <label className="check-row"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Ortak alan: ikimiz de görelim ve kayıt girelim</label>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>Kaydet</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Vazgeç</button>
        {onArchive && (sure
          ? <button type="button" className="btn btn-danger" disabled={busy} onClick={onArchive}>Evet, kaldır</button>
          : <button type="button" className="btn btn-quiet" onClick={() => setSure(true)}>Alanı kaldır</button>)}
      </div>
    </form>
  );
}

function BookForm({ book, mine, busy, onSave, onCancel, onArchive }: {
  book: Book | null; mine: boolean; busy: boolean; onSave: (b: object) => void; onCancel: () => void; onArchive?: () => void;
}) {
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [kind, setKind] = useState<BookKind>(book?.kind ?? "kitap");
  const [total, setTotal] = useState(book?.totalPages ? String(book.totalPages) : "");
  const [current, setCurrent] = useState(book ? String(book.currentPage) : "");
  const [note, setNote] = useState(book?.note ?? "");
  const [status, setStatus] = useState<BookStatus>(book?.status ?? "okunuyor");
  const [shared, setShared] = useState(book?.shared ?? false);
  const [sure, setSure] = useState(false);
  return (
    <form className="stack st-form" onSubmit={(e) => { e.preventDefault(); onSave({ title, author, kind, totalPages: num(total), currentPage: num(current), note, status, shared }); }}>
      <h3 className="st-sub">{book ? "Kitabı düzenle" : "Okuma listesine ekle"}</h3>
      <div className="chips" role="radiogroup" aria-label="Tür">
        {(Object.keys(BOOK_KINDS) as BookKind[]).map((k) => <button key={k} type="button" role="radio" className="chip" aria-checked={kind === k} onClick={() => setKind(k)}>{BOOK_KINDS[k]}</button>)}
      </div>
      <label className="field-label" htmlFor="st-title-in">{kind === "yayin" ? "Yayın adı" : "Kitap adı"}</label>
      <input id="st-title-in" className="input" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
      <label className="field-label" htmlFor="st-author">{kind === "yayin" ? "Yazar / dergi" : "Yazar"}</label>
      <input id="st-author" className="input" maxLength={120} value={author} onChange={(e) => setAuthor(e.target.value)} />
      <div className="st-two">
        <span>
          <label className="field-label" htmlFor="st-total">Sayfa sayısı</label>
          <input id="st-total" className="input" type="number" inputMode="numeric" min={1} max={20000} value={total} onChange={(e) => setTotal(e.target.value)} />
        </span>
        <span>
          <label className="field-label" htmlFor="st-current">Kaldığın sayfa</label>
          <input id="st-current" className="input" type="number" inputMode="numeric" min={0} max={20000} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0" />
        </span>
      </div>
      <label className="field-label" htmlFor="st-note">Nerede kaldım</label>
      <input id="st-note" className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ör. 4. bölüm, TCP el sıkışması" />
      <span className="field-label">Durum</span>
      <div className="chips" role="radiogroup" aria-label="Durum">
        {(Object.keys(BOOK_STATUS) as BookStatus[]).map((s) => <button key={s} type="button" role="radio" className="chip" aria-checked={status === s} onClick={() => setStatus(s)}>{BOOK_STATUS[s]}</button>)}
      </div>
      {mine && <label className="check-row"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Ortak kitap: ikimiz de görelim ve kayıt girelim</label>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy || !title.trim()}>Kaydet</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Vazgeç</button>
        {onArchive && (sure
          ? <button type="button" className="btn btn-danger" disabled={busy} onClick={onArchive}>Evet, kaldır</button>
          : <button type="button" className="btn btn-quiet" onClick={() => setSure(true)}>Listeden kaldır</button>)}
      </div>
    </form>
  );
}

function LogForm({ view, elapsedMin, busy, onSave, onCancel }: {
  view: Extract<View, { kind: "log" }>; elapsedMin: number; busy: boolean; onSave: (b: object) => void; onCancel: () => void;
}) {
  const book = view.book;
  const [minutes, setMinutes] = useState("");
  const [pages, setPages] = useState("");
  const [toPage, setToPage] = useState(book ? String(book.currentPage) : "");
  const [note, setNote] = useState("");
  const read = book && toPage.trim() !== "" ? Math.max(0, Number(toPage) - book.currentPage) : null;
  return (
    <form className="stack st-form" onSubmit={(e) => {
      e.preventDefault();
      onSave(book ? { minutes: num(minutes), toPage: num(toPage), note } : { minutes: num(minutes), pages: num(pages), note });
    }}>
      <h3 className="st-sub">{view.fromTimer ? "Oturumu bitir" : "Elle kayıt"} · {view.label}</h3>
      {view.fromTimer
        ? <p className="muted">Süre sayaçtan: <b>{fmtMin(elapsedMin)}</b></p>
        : <>
          <label className="field-label" htmlFor="st-min">Süre (dakika)</label>
          <input id="st-min" className="input" type="number" inputMode="numeric" min={0} max={720} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Ör. 30" autoFocus />
        </>}
      {book ? (
        <>
          <label className="field-label" htmlFor="st-to">Kaldığın sayfa{book.totalPages ? ` (toplam ${book.totalPages})` : ""}</label>
          <input id="st-to" className="input" type="number" inputMode="numeric" min={0} max={book.totalPages ?? 20000} value={toPage} onChange={(e) => setToPage(e.target.value)} autoFocus={view.fromTimer} />
          {read !== null && <small className="muted">{read} sayfa okundu (önceki: {book.currentPage}).</small>}
        </>
      ) : (
        <>
          <label className="field-label" htmlFor="st-pages">Sayfa (isteğe bağlı)</label>
          <input id="st-pages" className="input" type="number" inputMode="numeric" min={0} max={5000} value={pages} onChange={(e) => setPages(e.target.value)} placeholder="Ör. 12" />
        </>
      )}
      <label className="field-label" htmlFor="st-lognote">{book ? "Nerede kaldım (isteğe bağlı)" : "Not (isteğe bağlı)"}</label>
      <input id="st-lognote" className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={book ? "Ör. 5. bölümün başı" : "Ör. listeler ve sözlükler"} />
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy}>Kaydet</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{view.fromTimer ? "Sayaca dön" : "Vazgeç"}</button>
      </div>
    </form>
  );
}
