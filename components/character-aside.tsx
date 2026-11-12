"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PixelCanvas } from "@/components/pixel-canvas";
import { AREA_NAME, type Area, CARE_EVENT, CARE_FX, type CareEventDetail, type CareFxDetail, type CareState, areaWord, bump, careOf } from "@/lib/care";
import { todayIstanbul } from "@/lib/dates";
import { DOLL_SIZE, drawDoll } from "@/lib/doll";
import type { FigureFx } from "@/lib/figure";
import type { Outfit } from "@/lib/outfit";
import { PORTRAIT_SIZE, drawPortrait } from "@/lib/portrait";

type Base = "cilt" | "spor" | "beslenme";
type Section = Base | "yoga";
type Step = { id: string; label: string; productName: string | null; slot: string };
type Bar = { label: string; value: number | null; word: string };
const DAILY = new Set(["sabah", "aksam", "dus"]);
const AREAS: Area[] = ["yuz", "sac", "dis", "vucut"];
const level = (v: number | null) => (v === null ? "yok" : v >= 0.8 ? "iyi" : v >= 0.55 ? "orta" : v >= 0.3 ? "dusuk" : "kotu");
const word = (v: number | null, good: string, mid: string, low: string, none: string) => (v === null ? none : v >= 0.75 ? good : v >= 0.4 ? mid : low);
const up = (v: number | null, k = 0.15) => Math.min(1, (v ?? 0) + k);

/** Sporda karakter spor kıyafetiyle görünür (kendi renkleriyle): Ayşenur crop, tayt ve at kuyruğu; Cengiz atlet ve şort */
function sporty(o: Outfit, who: "cengiz" | "aysenur"): Outfit {
  return {
    ...o,
    top: { kind: who === "aysenur" ? "crop" : "atlet", color: o.top.color },
    bottom: { kind: who === "aysenur" ? "tayt" : "sort", color: who === "aysenur" ? "#24202a" : "#2f3b6b" },
    shoes: { kind: "spor", color: "#f2ede4" },
    acc: o.acc.filter((a) => a.kind === "saat" || a.kind === "kulaklik" || a.kind === "kupe"),
    hair: who === "aysenur" ? "atkuyrugu" : o.hair,
  };
}

/**
 * Bölümün sağında duran karakter: Cilt (bakım), Yüz yogası, Spor ve Beslenme'de o bölümün düzeni karakterde görünür
 * ve kayıt yapılınca (adım işaretleme, seans, su, öğün) karakterde animasyon oynar. Aşağı kaydırırken yerinde kalır.
 */
export function CharacterAside({ base, who, name, initial, steps = [], outfit }: { base: Base; who: "cengiz" | "aysenur"; name: string; initial: CareState; steps?: Step[]; outfit: Outfit }) {
  const path = usePathname();
  const section: Section = base === "cilt" && path.startsWith("/cilt/yuz-yogasi") ? "yoga" : base;
  const [state, setState] = useState(initial);
  const [toast, setToast] = useState<string | null>(null);
  const fx = useRef<FigureFx[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const lastWater = useRef<number | null>(null);
  const look = section === "spor" ? sporty(outfit, who) : outfit;

  const play = (kind: FigureFx["kind"], text: string) => {
    const now = performance.now() / 1000;
    fx.current = [...fx.current.filter((f) => now - f.at < 4), { kind, at: now }];
    setToast(text);
  };

  useEffect(() => {
    const onCare = (e: Event) => {
      const { day, itemId, done } = (e as CustomEvent<CareEventDetail>).detail;
      if (day !== todayIstanbul()) return;
      const step = steps.find((s) => s.id === itemId);
      if (!step) return;
      const { area, effect } = careOf(`${step.label} ${step.productName ?? ""}`);
      const same = steps.filter((s) => DAILY.has(s.slot) && careOf(`${s.label} ${s.productName ?? ""}`).area === area).length;
      setState((st) => ({ ...st, areas: { ...st.areas, [area]: bump(st.areas[area], done, same) } }));
      if (done) play(effect, `✨ ${step.productName ?? step.label}`);
    };
    const onFx = (e: Event) => {
      const { effect, water } = (e as CustomEvent<CareFxDetail>).detail;
      if (effect === "su") {
        const prev = lastWater.current; lastWater.current = water ?? null;
        if (prev !== null && water !== undefined && water <= prev) return; // bardak geri alındı
        setState((st) => ({ ...st, habits: { ...st.habits, water: up(st.habits.water, 0.08) } }));
        play("su", "💧 Bir bardak su");
      } else if (effect === "yemek") { setState((st) => ({ ...st, habits: { ...st.habits, meals: up(st.habits.meals, 0.08) } })); play("yemek", "🍽️ Afiyet olsun"); }
      else if (effect === "spor") { setState((st) => ({ ...st, habits: { ...st.habits, sport: up(st.habits.sport, 0.12) } })); play("spor", "💪 Harika iş"); }
      else { setState((st) => ({ ...st, habits: { ...st.habits, yoga: up(st.habits.yoga, 0.2) } })); play("yoga", "🧘 Yüz yogası tamam"); }
    };
    window.addEventListener(CARE_EVENT, onCare); window.addEventListener(CARE_FX, onFx);
    return () => { window.removeEventListener(CARE_EVENT, onCare); window.removeEventListener(CARE_FX, onFx); };
  }, [steps]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(null), 3200); return () => window.clearTimeout(id); }, [toast]);

  const h = state.habits, face = state.areas.yuz;
  const cfg: Record<Section, { title: string; head: string; bars: Bar[]; hint: string }> = {
    cilt: {
      title: "🪞 Bakım aynası",
      head: face === null ? "Rutinine yüz bakımı ekleyince cildin burada değişir." : state.neglect >= 2 ? `${state.neglect} gündür bakım yok: cilt yorgun.` : face >= 0.8 ? "Düzenli bakım yüzüne yansıyor: ışıl ışıl." : face >= 0.55 ? "Cildin iyi; birkaç gün düzen ışıltıyı getirir." : "Cilt bakım istiyor: bugünkü adımlarla toparlanır.",
      bars: AREAS.map((a) => ({ label: AREA_NAME[a], value: state.areas[a], word: areaWord(a, state.areas[a]) })),
      hint: "Bir adımı işaretle, aynada uygulandığını gör. Son 10 günün düzenine bakar.",
    },
    yoga: {
      title: "🧘 Yüz yogası",
      head: h.yoga === null ? "İlk seansını yap: yüzün burada tepki verir." : h.yoga >= 0.6 ? "Düzenli yüz yogası çene hattına ve ışıltına yansıyor." : "Haftada 3 seans yüzü sıkılaştırır; bir seans daha?",
      bars: [{ label: "Yoga", value: h.yoga, word: word(h.yoga, "düzenli: yüz tonlu", "ara sıra", "uzun zamandır yok", "henüz seans yok") }, { label: "Cilt", value: face, word: areaWord("yuz", face) }],
      hint: "Seansı bitirince karakter yanaklarını şişirip gülümser. Son 10 güne bakar.",
    },
    spor: {
      title: "💪 Formun",
      head: (h.sport ?? 0) >= 0.75 ? "Haftada 3 spor: enerjin yüzüne vuruyor." : (h.sport ?? 0) >= 0.4 ? "İyi gidiyorsun; bir seans daha formu oturtur." : "Son günlerde spor az: kısa bir seansla başla.",
      bars: [{ label: "Spor", value: h.sport, word: word(h.sport, "haftada 3: formda", "ara sıra", "az", "kayıt yok") }, { label: "Su", value: h.water, word: word(h.water, "yeterli", "biraz eksik", "az", "takip yok") }],
      hint: "Seans ya da set kaydedince ter bandını takar. Son 10 güne bakar.",
    },
    beslenme: {
      title: "🥗 Beslenme",
      head: h.water !== null && h.water < 0.4 ? "Su az: dudaklar kurudu, ten donuk." : (h.meals ?? 1) < 0.35 ? "Öğünler atlanıyor: yüz solgun." : "Su ve öğünler yerinde: cilt nemli ve canlı.",
      bars: [{ label: "Su", value: h.water, word: word(h.water, "hedefte: nemli ışıltı", "biraz eksik", "az: dudaklar kuru", "takip yok") }, { label: "Öğün", value: h.meals, word: word(h.meals, "düzenli", "ara sıra atlanıyor", "çok atlanıyor", "takip yok") }],
      hint: "Su bardağı ekleyince içer, öğün işaretleyince yer. Son 7 güne bakar.",
    },
  };
  const c = cfg[section], full = section === "spor";

  return (
    <aside className="card side-char" aria-label={`${name}: ${c.title}`}>
      <div className={`side-frame${full ? " is-full" : ""}`}>
        <PixelCanvas key={full ? "boy" : "yuz"} size={full ? DOLL_SIZE : PORTRAIT_SIZE} scale={full ? 2 : 3} fps={20} className="side-canvas" label={`${name}`}
          draw={(cx, w, hh, t) => (full ? drawDoll : drawPortrait)(cx, w, hh, t, { who, state: stateRef.current, outfit: look, fx: fx.current })} />
        {toast && <span className="mirror-toast" role="status">{toast}</span>}
      </div>
      <div className="side-info">
        <h2>{c.title}</h2>
        <p className="mirror-head">{c.head}</p>
        <ul className="mirror-bars">
          {c.bars.map((b) => (
            <li key={b.label}>
              <span>{b.label}</span>
              <span className="mirror-bar" data-level={level(b.value)}><i style={{ width: `${Math.round((b.value ?? 0) * 100)}%` }} /></span>
              <small>{b.word}</small>
            </li>
          ))}
        </ul>
        <p className="muted mirror-hint">{c.hint}</p>
      </div>
    </aside>
  );
}
