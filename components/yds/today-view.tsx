"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { gainXp } from "@/components/xp-badge";
import { api } from "@/lib/api-client";
import { formatDayShort } from "@/lib/dates";
import { type Card, GRADES, type Grade, SECTIONS, SECTION_ORDER, type Section, type YdsDay, type YdsSettings, correctFor, daysLeft, isDone, quotaFor, scoreOf } from "@/lib/yds";
import { KIND_NAME } from "@/lib/yds-words";

type Overview = {
  settings: YdsSettings & { exists: boolean };
  today: { words: number; questions: number; correct: number; quota: ReturnType<typeof quotaFor>; done: boolean; availableCards: number };
  days: YdsDay[]; streak: number; cards: { seen: number; learned: number; learning: number; total: number };
  sections: Partial<Record<Section, { solved: number; correct: number }>>;
  exams: { id: string; day: string; correct: number; total: number }[];
  practice: { id: string; section: Section; solved: number; correct: number }[];
  partner: { id: string; name: string; words: number; questions: number; quota: { words: number; questions: number }; done: boolean } | null;
};

const ring = (v: number, max: number) => ({ "--p": `${Math.round(Math.min(1, max ? v / max : 1) * 360)}deg` }) as React.CSSProperties;

/** YDS Kampı bugün: kota, kelime oturumu, soru kaydı, partner, son 30 gün, bölümler */
export function YdsTodayView({ initial, today }: { initial: Overview; today: string }) {
  const [d, setD] = useState(initial);
  const [session, setSession] = useState<Card[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (!msg) return; const id = window.setTimeout(() => setMsg(null), 3200); return () => window.clearTimeout(id); }, [msg]);

  const reload = async () => { try { setD(await api<Overview>("/api/yds")); } catch (e) { setErr(e instanceof Error ? e.message : "Yüklenemedi."); } };
  const s = d.settings, t = d.today, left = daysLeft(s.examDate, today);
  const need = correctFor(s.target);
  const lastExam = d.exams[0];
  const weakest = SECTION_ORDER.filter((k) => (d.sections[k]?.solved ?? 0) >= 5).sort((a, b) => d.sections[a]!.correct / d.sections[a]!.solved - d.sections[b]!.correct / d.sections[b]!.solved)[0];
  const maxDay = Math.max(10, ...d.days.map((x) => Math.max(x.words, x.questions)));

  if (!s.exists) return (
    <div className="card yds-setup">
      <h2>🎯 YDS Kampı'nı kur</h2>
      <p>Sınav tarihini, hedef puanını ve günlük kotanı gir. Uygulama her gün kelime ve soru kotanı tutar, kaçırdığın günü ertesi güne ekler ve istersen kota bitmeden Gelişim'de zindanı kilitler.</p>
      <Link href="/yds/ayarlar" className="btn btn-primary">Ayarlara git</Link>
    </div>
  );

  const startSession = async () => {
    setErr(null);
    try { const r = await api<{ cards: Card[] }>("/api/yds/kart"); if (!r.cards.length) { setMsg("Bugün çalışılacak kart kalmadı: tekrarların ve yeni kelimelerin bitti."); return; } setSession(r.cards); }
    catch (e) { setErr(e instanceof Error ? e.message : "Kartlar yüklenemedi."); }
  };

  return (
    <div className="yds">
      <section className="card yds-hero">
        <div className="yds-count">
          {left !== null ? <><b className="num">{left > 0 ? left : 0}</b><span>{left > 0 ? "gün kaldı" : left === 0 ? "sınav bugün!" : "sınav geçti"}</span></> : <><b>—</b><span><Link href="/yds/ayarlar">sınav tarihini gir</Link></span></>}
        </div>
        <div className="yds-goal">
          <span>Hedef <b className="num">{s.target}</b> puan · 80 sorudan en az <b className="num">{need}</b> doğru</span>
          {lastExam && <span>Son deneme: <b className="num">{scoreOf(lastExam.correct * (80 / lastExam.total))}</b> puan ({lastExam.correct}/{lastExam.total})</span>}
          <span>🔥 <b className="num">{d.streak}</b> gün seri</span>
        </div>
        <div className="yds-rings">
          <div className="yds-ring" style={ring(t.words, t.availableCards === 0 ? t.words : t.quota.words)}><span><b className="num">{t.words}</b><small>/ {t.quota.words} kart</small></span></div>
          <div className="yds-ring" style={ring(t.questions, t.quota.questions)}><span><b className="num">{t.questions}</b><small>/ {t.quota.questions} soru</small></span></div>
        </div>
        <p className={`yds-state${t.done ? " is-done" : ""}`}>
          {t.done ? "✅ Bugünkü kota tamam. Gelişim açık; istersen fazlasını yap." : `Kalan: ${Math.max(0, t.quota.words - t.words)} kart, ${Math.max(0, t.quota.questions - t.questions)} soru.${t.quota.owedWords || t.quota.owedQuestions ? ` (Dünden telafi: +${t.quota.owedWords} kart, +${t.quota.owedQuestions} soru)` : ""}${s.lock !== "kapali" ? " 🔒 Bitene kadar Gelişim'de zindan kilitli." : ""}`}
        </p>
      </section>

      {msg && <p className="st-msg" role="status">{msg}</p>}
      {err && <p className="form-error">{err}</p>}

      {session ? (
        <Session cards={session} onGraded={() => setD((x) => { const today2 = { ...x.today, words: x.today.words + 1 }; return { ...x, today: { ...today2, done: isDone(today2) } }; })}
          onEnd={(n) => { setSession(null); if (n) { gainXp(Math.floor(n / 2)); setMsg(`${n} kart çalıştın · +${Math.floor(n / 2)} XP`); } void reload(); }} />
      ) : (
        <div className="yds-grid">
          <section className="card yds-words">
            <h2>🃏 Kelimeler</h2>
            <p className="muted">Hazır YDS listesi ({d.cards.total} kelime ve phrasal verb) ve kendi eklediklerin. Bilmediğin sık, bildiğin seyrek gelir.</p>
            <div className="yds-cardstats">
              <span><b className="num">{d.cards.learned}</b><small>öğrenildi</small></span>
              <span><b className="num">{d.cards.learning}</b><small>tekrarda</small></span>
              <span><b className="num">{Math.max(0, d.cards.total - d.cards.seen)}</b><small>yeni</small></span>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => void startSession()}>▶ Kelime çalış</button>
          </section>
          <Practice entries={d.practice} onChange={(gained) => { if (gained) gainXp(gained); void reload(); }} />
        </div>
      )}

      {d.partner && <Partner p={d.partner} />}

      <section className="card">
        <h2>📈 Son 30 gün</h2>
        <div className="yds-chart" aria-label="Günlük kart ve soru sayısı">
          {d.days.map((x) => (
            <span key={x.day} title={`${formatDayShort(x.day)}: ${x.words} kart, ${x.questions} soru`} className={x.day === today ? "is-today" : undefined}>
              <i className="w" style={{ height: `${(x.words / maxDay) * 100}%` }} /><i className="q" style={{ height: `${(x.questions / maxDay) * 100}%` }} />
            </span>
          ))}
        </div>
        <p className="muted yds-legend"><i className="w" /> kart <i className="q" /> soru</p>
      </section>

      <section className="card">
        <h2>🧩 Bölümler (son 30 gün)</h2>
        {Object.keys(d.sections).length === 0 ? <p className="muted">Soru kaydettikçe bölüm bölüm doğruluğun burada görünür.</p> : (
          <ul className="yds-sections">
            {SECTION_ORDER.filter((k) => d.sections[k]).map((k) => {
              const v = d.sections[k]!, pct = Math.round((v.correct / v.solved) * 100);
              return <li key={k} className={k === weakest ? "is-weak" : undefined}><span>{SECTIONS[k].name}{k === weakest ? " · en zayıf" : ""}</span><span className="yds-bar"><i style={{ width: `${pct}%` }} /></span><small className="num">%{pct} · {v.correct}/{v.solved}</small></li>;
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------------------------- oturum ---------------------------------- */

function Session({ cards, onGraded, onEnd }: { cards: Card[]; onGraded: () => void; onEnd: (n: number) => void }) {
  const [queue, setQueue] = useState(cards);
  const [shown, setShown] = useState(false);
  const [n, setN] = useState(0);
  const [busy, setBusy] = useState(false);
  const card = queue[0];

  const grade = async (g: Grade) => {
    if (!card || busy) return;
    setBusy(true);
    try {
      await api("/api/yds/kart", { body: { key: card.key, grade: g } });
      setN((x) => x + 1); onGraded();
      // bilmediğin kart birkaç kart sonra yeniden gelir
      setQueue((q) => { const rest = q.slice(1); if (g === 0) rest.splice(Math.min(4, rest.length), 0, { ...card, isNew: false }); return rest; });
      setShown(false);
    } catch { /* bağlantı: aynı kart kalır */ }
    setBusy(false);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input, textarea")) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setShown(true); }
      if (shown && /^[1-4]$/.test(e.key)) void grade((Number(e.key) - 1) as Grade);
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  if (!card) return (
    <section className="card yds-session is-end">
      <h2>🎉 Oturum bitti</h2>
      <p>{n} kart çalıştın. Tekrarlar yarın ve sonraki günlere dağıldı.</p>
      <button type="button" className="btn btn-primary" onClick={() => onEnd(n)}>Tamam</button>
    </section>
  );
  return (
    <section className="card yds-session" aria-live="polite">
      <div className="yds-session-top"><span className="muted">{n} çalışıldı · {queue.length} kaldı</span><button type="button" className="btn btn-quiet btn-sm" onClick={() => onEnd(n)}>Bitir</button></div>
      <button type="button" className={`yds-flash${shown ? " is-shown" : ""}`} onClick={() => setShown(true)}>
        <small>{card.isNew ? "✨ yeni" : `kutu ${card.box}`} · {card.kind === "kendi" ? "kendi kelimen" : KIND_NAME[card.kind]}</small>
        <b lang="en">{card.en}</b>
        {shown ? <span className="yds-tr">{card.tr}</span> : <span className="muted">Anlamını düşün, sonra çevir (boşluk)</span>}
      </button>
      {shown && (
        <div className="yds-grades">
          {GRADES.map((g) => <button key={g.g} type="button" className={`btn ${g.g >= 2 ? "btn-primary" : "btn-ghost"}`} disabled={busy} onClick={() => void grade(g.g)}>{g.name} <kbd>{g.key}</kbd></button>)}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------- sorular ---------------------------------- */

function Practice({ entries, onChange }: { entries: Overview["practice"]; onChange: (xp: number) => void }) {
  const [section, setSection] = useState<Section>("okuma");
  const [solved, setSolved] = useState("");
  const [correct, setCorrect] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api("/api/yds/soru", { body: { section, solved: Number(solved), correct: Number(correct) } }); onChange(Number(solved)); setSolved(""); setCorrect(""); }
    catch (er) { setErr(er instanceof Error ? er.message : "Kaydedilemedi."); }
    setBusy(false);
  };
  return (
    <section className="card yds-practice">
      <h2>✍️ Bugün çözdüklerin</h2>
      <form className="stack" onSubmit={add}>
        <div className="chips" role="radiogroup" aria-label="Bölüm">
          {SECTION_ORDER.map((k) => <button key={k} type="button" role="radio" className="chip" aria-checked={section === k} onClick={() => setSection(k)}>{SECTIONS[k].name}</button>)}
        </div>
        <div className="row yds-nums">
          <label>Çözdüğüm<input className="input" type="number" inputMode="numeric" min={1} max={500} value={solved} onChange={(e) => setSolved(e.target.value)} required /></label>
          <label>Doğru<input className="input" type="number" inputMode="numeric" min={0} max={500} value={correct} onChange={(e) => setCorrect(e.target.value)} required /></label>
          <button type="submit" className="btn btn-primary" disabled={busy || !solved || correct === ""}>Kaydet</button>
        </div>
      </form>
      {err && <p className="form-error">{err}</p>}
      {entries.length > 0 && (
        <ul className="yds-entries">
          {entries.map((p) => (
            <li key={p.id}><span>{SECTIONS[p.section].name}</span><span className="num">{p.correct}/{p.solved}</span>
              <button type="button" className="btn btn-quiet btn-sm" aria-label="Kaydı sil" onClick={async () => { await api(`/api/yds/soru/${p.id}`, { method: "DELETE" }).catch(() => {}); onChange(-p.solved); }}>✕</button></li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------- partner ---------------------------------- */

function Partner({ p }: { p: NonNullable<Overview["partner"]> }) {
  const [sent, setSent] = useState(false);
  const nudge = async () => {
    try { await api("/api/gelisim/notlar", { body: { body: `📚 YDS dürtmesi! Bugünkü kotan: ${p.words}/${p.quota.words} kart, ${p.questions}/${p.quota.questions} soru. Hadi, birlikte bitirelim 💪` } }); setSent(true); } catch { /* sessiz */ }
  };
  return (
    <section className={`card yds-partner${p.done ? " is-done" : ""}`}>
      <span className="grow"><b>{p.name}</b> bugün: {p.done ? "✅ kotasını bitirdi" : `${p.words}/${p.quota.words} kart · ${p.questions}/${p.quota.questions} soru`}</span>
      {!p.done && <button type="button" className="btn btn-ghost btn-sm" disabled={sent} onClick={() => void nudge()}>{sent ? "Dürtüldü 👉" : "👉 Dürt"}</button>}
    </section>
  );
}
