"use client";

import { useEffect, useRef, useState } from "react";
import { SAME_ROOM, SCENES, WIDTHS, renderScene, tagsOf, vignette, type Tag } from "@/lib/story";
import { tapPet } from "@/lib/companions";
import { replay } from "@/lib/adventures";
import { lastStrike, weather } from "@/lib/weather";
import { ambientRunning, disposeAmbient, setMix, setVolume, startAmbient, stopAmbient, thunder } from "@/lib/ambient";
import type { SceneOut } from "@/lib/scenes/types";
import { CalendarPanel, CarePanel, DayPanel, NutritionPanel, ProgressPanel, SportPanel } from "./panels";
import s from "./world.module.css";
import Link from "next/link";

type Entry = { href: string; label: string };

// aktif profil rozeti: dokununca profil seçimine gider (Cengiz ⇄ Ayşenur); seçince rutine geçilir
function ProfileChip({ name }: { name: string }) {
  const who = /ay[sş]enur/i.test(name) ? "aysenur" : "cengiz";
  return (
    <Link href="/profil-sec" className={`${s.chip} ${s[who]}`} aria-label={`Profil: ${name.split(" ")[0]}. Profil değiştir`}>
      {name.split(" ")[0]}<span aria-hidden="true"> ⇄</span>
    </Link>
  );
}

const toTop = () => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

const NAMES = { cengiz: "Cengiz", aysenur: "Ayşenur", duldul: "Düldül", gandalf: "Gandalf", gimli: "Gimli", legolas: "Legolas", jon: "Jon Snow", daenerys: "Daenerys Targaryen" } as const;
type Tagged = keyof typeof NAMES;

// takip ekranları kaydırma akışında değil; menüden açılan alt sayfalarda
const SHEETS = {
  gunum: { label: "Günüm", body: <DayPanel /> },
  spor: { label: "Spor", body: <SportPanel /> },
  beslenme: { label: "Beslenme", body: <NutritionPanel /> },
  bakim: { label: "Bakım", body: <CarePanel /> },
  ilerleme: { label: "İlerleme", body: <><CalendarPanel /><ProgressPanel /></> },
};
type SheetId = keyof typeof SHEETS;

function Sheet({ id, onClose }: { id: SheetId; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className={s.sheetWrap} role="dialog" aria-modal="true" aria-label={SHEETS[id].label}>
      <div className={s.sheet}>
        <button ref={close} className={s.close} onClick={onClose} aria-label="Kapat">✕</button>
        {SHEETS[id].body}
      </div>
    </div>
  );
}

export function World({ entry, profileName }: { entry: Entry; profileName: string | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tags = useRef<Record<string, HTMLDivElement | null>>({});
  const bubbles = useRef<Record<string, HTMLDivElement | null>>({});
  const sections = useRef<(HTMLElement | null)[]>([]);
  const title = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  const lastShown = useRef<{ tags: Tag[]; scale: number }>({ tags: [], scale: 1 });
  const [calm, setCalm] = useState(false);
  const [far, setFar] = useState(false); // ilk ekranın altına inildi: "Başa dön" görünür
  const [sheet, setSheet] = useState<SheetId | null>(null);
  // ortam sesleri: başlangıçta kapalı
  const [sound, setSound] = useState(true);
  const [volume, setVol] = useState(0.6);
  const soundRef = useRef(true);
  const volRef = useRef(0.6);
  // tarayıcı sesi başlattı mı (kaydırma izin sayılmaz; dokunuş, tık ya da tuş gerekir)
  const [audible, setAudible] = useState(false);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const bufA = document.createElement("canvas"), bufB = document.createElement("canvas");
    const ca = bufA.getContext("2d")!, cb = bufB.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scale = 1;

    const resize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      // tam sayı ölçek: her dünya pikseli ekranda eşit kare olur
      scale = Math.max(2, Math.min(6, Math.max(Math.round(Math.min(w / 320, h / 200)), Math.ceil(h / 360))));
      for (const c of [cv, bufA, bufB]) { c.width = Math.ceil(w / scale); c.height = Math.ceil(h / scale); }
      cv.style.width = `${cv.width * scale}px`;
      cv.style.height = `${cv.height * scale}px`;
      for (const c of [ctx, ca, cb]) c.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener("resize", resize);

    const progressOf = (i: number, y: number, vh: number) => {
      const el = sections.current[i];
      if (!el) return 0; // sayfadan çıkarken ref'ler döngüden önce boşalabilir
      const span = i === SCENES.length - 1 ? el.offsetHeight - vh : el.offsetHeight;
      return Math.max(0, Math.min(1, (y - el.offsetTop) / Math.max(1, span)));
    };

    let raf = 0;
    let lastCalm = false, lastFar = false;
    let frameNo = 0, lastThunder = -99;
    const loop = () => {
      const t = performance.now() / 1000;
      const y = window.scrollY, vh = window.innerHeight;
      const view: [number, number] = [cv.width, cv.height];
      let index = 0;
      sections.current.forEach((el, i) => { if (el && y >= el.offsetTop) index = i; });

      // geçiş penceresi: sınırdan hemen önce ve hemen sonra iki oda yan yana çizilir
      let pair: [number, number] | null = null;
      const next = sections.current[index + 1];
      const cur = sections.current[index]!;
      if (next && y > next.offsetTop - cur.offsetHeight * 0.05) pair = [index, index + 1];
      else if (index > 0 && y < cur.offsetTop + cur.offsetHeight * 0.04) pair = [index - 1, index];
      if (pair && SAME_ROOM.has(`${SCENES[pair[0]].id}>${SCENES[pair[1]].id}`)) pair = null;

      let shown: Tag[];
      let out: SceneOut;
      if (pair) {
        const [i, j] = pair;
        const a = renderScene(ca, i, progressOf(i, y, vh), view, t, still);
        const b = renderScene(cb, j, progressOf(j, y, vh), view, t, still);
        const elB = sections.current[j]!;
        const start = elB.offsetTop - sections.current[i]!.offsetHeight * 0.05;
        const end = elB.offsetTop + elB.offsetHeight * 0.04;
        const k = Math.max(0, Math.min(1, (y - start) / (end - start)));
        const e = k * k * (3 - 2 * k);
        // A'nın sağ kenarı ile B'nin sol kenarı aynı çizgide buluşur; çizgi ekranda sağdan sola kayar
        const shift = e * (WIDTHS[SCENES[i].id] - a.cam[0] + b.cam[0]);
        const seam = Math.round(WIDTHS[SCENES[i].id] - a.cam[0] - shift);
        const offB = seam + b.cam[0];
        ctx.clearRect(0, 0, view[0], view[1]);
        const sh = Math.round(shift);
        if (seam > 0) ctx.drawImage(bufA, sh, 0, Math.min(seam, view[0]), view[1], 0, 0, Math.min(seam, view[0]), view[1]);
        ctx.save();
        ctx.beginPath(); ctx.rect(Math.max(0, seam), 0, view[0], view[1]); ctx.clip();
        ctx.drawImage(bufB, Math.round(offB), 0);
        ctx.restore();
        // iki odayı ayıran taş kemer
        ctx.fillStyle = "#3e3a46"; ctx.fillRect(seam - 3, 0, 6, view[1]);
        ctx.fillStyle = "#7d7884"; ctx.fillRect(seam - 3, 0, 1, view[1]);
        shown = [...tagsOf(a, -shift).filter((q) => q.x < seam), ...tagsOf(b, offB).filter((q) => q.x >= seam)];
        out = e < 0.5 ? a : b;
      } else {
        out = renderScene(ctx, index, progressOf(index, y, vh), view, t, still);
        shown = tagsOf(out);
      }
      vignette(ctx, view);

      const pos: Partial<Record<Tagged, { x: number; y: number }>> = {};
      lastShown.current = { tags: shown, scale };
      for (const q of shown) if (q.who in NAMES) pos[q.who as Tagged] = { x: q.x * scale, y: q.y * scale };
      // etiketler çakışmasın ve ekran kenarında kesilmesin: önce aynı satırdakiler yana itilir, sonra kenara kıstırılır
      const live = (Object.keys(pos) as Tagged[]).filter((k) => k !== "duldul").map((k) => ({ k, q: pos[k]!, w: tags.current[k]?.offsetWidth ?? 80 }));
      live.sort((a, b) => a.q.x - b.q.x);
      // her çift karşılaştırılır: aradaki farklı satırdaki bir etiket (ör. uçan ejderha) eşleşmeyi bozmasın
      for (let pass = 0; pass < 3; pass++) for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
        const [a, b] = live[i].q.x <= live[j].q.x ? [live[i], live[j]] : [live[j], live[i]];
        if (Math.abs(a.q.y - b.q.y) > 24) continue;
        const need = (a.w + b.w) / 2 + 6 - (b.q.x - a.q.x);
        if (need > 0) { a.q.x -= need / 2; b.q.x += need / 2; }
      }
      for (const { q, w } of live) if (q.x > -40 && q.x < window.innerWidth + 40) q.x = Math.max(w / 2 + 6, Math.min(window.innerWidth - w / 2 - 6, q.x));
      for (const k of Object.keys(NAMES) as Tagged[]) {
        const tag = tags.current[k], q = pos[k];
        const inView = !!q && q.x > -40 && q.x < window.innerWidth + 40 && q.y > 0;
        if (tag) {
          tag.style.opacity = inView ? "1" : "0";
          // Düldül'ün etiketi kedinin altında durur, Cengiz'in yüzünü örtmez
          if (q) tag.style.transform = k === "duldul"
            ? `translate(${Math.round(q.x)}px, ${Math.round(q.y + 16 * scale)}px) translate(-50%, 0)`
            : `translate(${Math.round(q.x)}px, ${Math.round(q.y)}px) translate(-50%, -100%)`;
        }
        const bub = bubbles.current[k];
        const said = out.bubbles?.find((x) => x.who === k);
        if (bub) {
          bub.style.opacity = said && inView ? "1" : "0";
          if (said && q) {
            if (bub.textContent !== said.text) bub.textContent = said.text;
            // iki balon aynı anda açıksa Ayşenur'unki bir kat yukarıda durur, üst üste binmez
            const lift = k === "aysenur" && (out.bubbles?.length ?? 0) > 1 ? 34 : 0;
            bub.style.transform = `translate(${Math.round(q.x)}px, ${Math.round(q.y - 26 - lift)}px) translate(-50%, -100%)`;
          }
        }
      }
      // ses karışımı sahneye ve fırtınaya göre değişir; şimşekten kısa süre sonra gök gürler
      if (soundRef.current && frameNo++ % 10 === 0) {
        const id = SCENES[index].id, pNow = progressOf(index, y, vh);
        const indoorRain = ["kutuphane", "somine", "final"].includes(id) ? 0.35 : 0;
        setMix({
          rain: id === "yolculuk" ? weather.storm : weather.storm * 0.55 + indoorRain,
          fire: id === "somine" || id === "final" ? 0.9 : id === "kutuphane" ? 0.12 : 0,
          purr: id === "final" && pNow > 0.88 ? 0.6 : 0,
        });
      }
      if (soundRef.current) {
        const strike = lastStrike(t, weather.storm);
        if (strike > lastThunder && t - strike < 0.3) { lastThunder = strike; thunder(1.2 + (strike % 1), Math.min(1, weather.storm)); }
      }
      if (caption.current) {
        caption.current.style.opacity = out.caption ? "1" : "0";
        if (out.caption && caption.current.textContent !== out.caption) caption.current.textContent = out.caption;
      }
      if (title.current) title.current.style.opacity = String(Math.max(0, 1 - y / (vh * 0.4)));
      // finale yaklaşırken arayüz sadeleşir
      const nowCalm = index >= SCENES.length - 2;
      if (nowCalm !== lastCalm) { lastCalm = nowCalm; setCalm(nowCalm); }
      const nowFar = y > vh * 0.8;
      if (nowFar !== lastFar) { lastFar = nowFar; setFar(nowFar); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); disposeAmbient(); };
  }, []);

  // ortam sesleri varsayılan açık: tarayıcı sesi ancak dokunuş, tık ya da tuşla başlatır.
  // Telefonda parmağı basmak (pointerdown) izin sayılmaz, kaldırmak sayılır; bu yüzden ses başlayana kadar her etkileşimde yeniden denenir.
  useEffect(() => {
    const events = ["pointerdown", "pointerup", "touchend", "click", "keydown"] as const;
    const off = () => events.forEach((e) => window.removeEventListener(e, unlock, true));
    const unlock = () => {
      if (!soundRef.current || ambientRunning()) return;
      startAmbient(volRef.current).then(() => { if (ambientRunning()) { setAudible(true); off(); } }, () => {});
    };
    events.forEach((e) => window.addEventListener(e, unlock, true));
    return off;
  }, []);

  // otomatik oynat: hikâye kendiliğinden kayar; kullanıcı tekerlek/dokunma/tuşla kaydırırsa durur
  useEffect(() => {
    if (!auto) return;
    let raf = 0, last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // saniyede yaklaşık 1 ekranın %108'i: sahneler izlenebilir hızda akar
      window.scrollBy(0, window.innerHeight * 1.08 * dt);
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) { setAuto(false); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const stop = () => setAuto(false);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("wheel", stop); window.removeEventListener("touchmove", stop); };
  }, [auto]);

  const toggleSound = () => {
    // açık görünüp tarayıcı engellediyse bu dokunuş sesi başlatır, kapatmaz
    const on = sound && !audible ? true : !sound;
    setSound(on); soundRef.current = on;
    if (on) startAmbient(volume).then(() => setAudible(ambientRunning()), () => {});
    else { stopAmbient(); setAudible(false); }
  };

  // dokunulabilir küçük ayrıntılar: Düldül, papağan, yün yumağı, sandık
  const onTap = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, [role=dialog]")) return;
    const { tags: list, scale } = lastShown.current;
    const x = e.clientX / scale, y = e.clientY / scale;
    for (const q of list) {
      if (!["duldul", "parrot", "yarn", "chest", "map", "book", "chest2", "wizardBook"].includes(q.who)) continue;
      const r = q.who === "map" ? 28 : 11;
      if (Math.abs(q.x - x) > r || y < q.y - (q.who === "map" ? 18 : 4) || y > q.y + 16) continue;
      if (q.who === "duldul") { tapPet("duldul"); replay("cape"); }
      else if (q.who === "parrot") { tapPet("parrot"); replay("meet"); }
      else if (q.who === "yarn") replay("yarn");
      else if (q.who === "chest") replay("chestOut");
      else if (q.who === "wizardBook") open("ilerleme");
      else replay(q.who as "map" | "book" | "chest2");
      return;
    }
  };

  const open = (id: SheetId) => {
    setSheet(id);
  };

  return (
    <div className={s.root} onPointerDown={onTap}>
      <canvas ref={canvas} className={s.canvas} aria-hidden="true" />
      {(Object.keys(NAMES) as Tagged[]).map((k) => (
        <div key={k}>
          <div ref={(el) => { tags.current[k] = el; }} className={`${s.tag} ${s[k]}`}>{NAMES[k]}</div>
          <div ref={(el) => { bubbles.current[k] = el; }} className={s.bubble} aria-live="polite" />
        </div>
      ))}

      <div ref={caption} className={s.caption} aria-live="polite" />
      <nav className={s.nav} aria-label="Hesap">
        <button type="button" className={`${s.logoBtn} ${calm && !sheet ? s.calm : ""}`} onClick={toTop} aria-label="Başa dön">
          <img className={s.logo} src="/logo.png" alt="" width={1200} height={305} />
        </button>
        <span className={s.navRight}>
          {profileName && <ProfileChip name={profileName} />}
          <Link href={entry.href} className={s.cta}>{entry.label} <span aria-hidden="true">→</span></Link>
        </span>
      </nav>

      {SCENES.map((scene, i) => (
        <section key={scene.id} ref={(el) => { sections.current[i] = el; }} className={s.scene} style={{ height: `calc(${scene.vh}svh * var(--pace))` }}>
          {i === 0 && (
            <div ref={title} className={s.title}>
              <h1><img className={s.logoBig} src="/logo.png" alt="İkimizin Rutini" width={1200} height={305} /></h1>
              <p>Cengiz ve Ayşenur&apos;un büyülü bir günü</p>
              <span className={s.hint}>Aşağı kaydır <i aria-hidden="true">▼</i></span>
              <Link href={entry.href} className={s.skip}>Hikâyeyi atla: {entry.label.toLocaleLowerCase("tr")}</Link>
            </div>
          )}
          {i === SCENES.length - 1 && (
            <div className={s.end}>
              <p className={s.endKicker}>Hikâyenin sonu</p>
              <p className={s.endTitle}>Şimdi sıra sizde: bugünün rutini sizi bekliyor.</p>
              <div className={s.endActions}>
                <Link href={entry.href} className={s.cta}>{entry.label} <span aria-hidden="true">→</span></Link>
                {profileName && <Link href="/profil-sec" className={s.ghost}>Profil değiştir ⇄</Link>}
                <button type="button" className={s.ghost} onClick={() => { setAuto(false); toTop(); }}>↑ Başa dön</button>
              </div>
            </div>
          )}
        </section>
      ))}

      <div className={s.sound}>
        {far && <button onClick={() => { setAuto(false); toTop(); }} aria-label="Başa dön">↑<span className={s.wide}> Başa dön</span></button>}
        <button onClick={() => setAuto((a) => !a)} aria-pressed={auto}>{auto ? "❚❚ Durdur" : <>▶ <span className={s.wide}>Otomatik </span>oynat</>}</button>
        <button onClick={toggleSound} aria-pressed={sound}>{sound ? "🔊" : "🔇"} <span className={s.wide}>Ortam sesleri: </span>{sound ? (audible ? "Açık" : "Açmak için dokun") : "Kapalı"}</button>
        {sound && (
          <label>
            <span className={s.srOnly}>Ses seviyesi</span>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => { const v = Number(e.target.value); setVol(v); volRef.current = v; setVolume(v); }} />
          </label>
        )}
      </div>

      {sheet && <Sheet id={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
