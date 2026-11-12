"use client";

import { useEffect, useRef, useState } from "react";
import { PixelCanvas } from "@/components/pixel-canvas";
import { AREA_NAME, type Area, CARE_EVENT, type CareEventDetail, type CareState, areaWord, bump, careOf, studyWord } from "@/lib/care";
import { todayIstanbul } from "@/lib/dates";
import { PORTRAIT_SIZE, type PortraitFx, type PortraitLook, drawPortrait } from "@/lib/portrait";

type Step = { id: string; label: string; productName: string | null; slot: string };
const AREAS: Area[] = ["yuz", "sac", "dis", "vucut"];
const DAILY = new Set(["sabah", "aksam", "dus"]);

/**
 * Bakım aynası: karakterin yüzü yakından. Rutindeki bir adım işaretlenince yüzde uygulanır (köpük, serum, krem...);
 * son günlerde bakım yapılmadıkça cilt matlaşır, göz altları morarır, sivilce ve kuruluk çıkar; düzenli bakımda ışıldar.
 */
export function FaceMirror({ who, name, initial, steps, look }: { who: "cengiz" | "aysenur"; name: string; initial: CareState; steps: Step[]; look: PortraitLook }) {
  const [state, setState] = useState(initial);
  const [last, setLast] = useState<string | null>(null);
  const fx = useRef<PortraitFx[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  // işaretlenen adım: bugünse yüzde oynar ve bölgesinin puanı anında değişir
  useEffect(() => {
    const onCare = (e: Event) => {
      const { day, itemId, done } = (e as CustomEvent<CareEventDetail>).detail;
      if (day !== todayIstanbul()) return;
      const step = steps.find((s) => s.id === itemId);
      if (!step) return;
      const { area, effect } = careOf(`${step.label} ${step.productName ?? ""}`);
      const same = steps.filter((s) => DAILY.has(s.slot) && careOf(`${s.label} ${s.productName ?? ""}`).area === area).length;
      setState((st) => ({ ...st, areas: { ...st.areas, [area]: bump(st.areas[area], done, same) } }));
      if (!done) return;
      fx.current = [...fx.current.filter((f) => performance.now() / 1000 - f.at < 4), { kind: effect, at: performance.now() / 1000 }];
      setLast(step.productName ?? step.label);
    };
    window.addEventListener(CARE_EVENT, onCare);
    return () => window.removeEventListener(CARE_EVENT, onCare);
  }, [steps]);
  useEffect(() => { if (!last) return; const id = window.setTimeout(() => setLast(null), 3500); return () => window.clearTimeout(id); }, [last]);

  const face = state.areas.yuz;
  const headline = face === null ? "Rutinine yüz bakımı ekleyince cildin burada değişir."
    : state.neglect >= 2 ? `${state.neglect} gündür bakım yok: cilt yorgun görünüyor.`
    : face >= 0.8 ? "Düzenli bakım yüzüne yansıyor: ışıl ışıl." : face >= 0.55 ? "Cildin iyi; birkaç gün düzen ışıltıyı getirir." : "Cilt bakım istiyor: bugünkü adımlarla toparlanır.";

  return (
    <section className="card mirror" aria-labelledby="mirror-title">
      <div className="mirror-frame">
        <PixelCanvas size={PORTRAIT_SIZE} scale={4} fps={24} className="mirror-canvas" label={`${name} aynada`}
          draw={(c, w, h, t) => drawPortrait(c, w, h, t, { who, state: stateRef.current, look, fx: fx.current })} />
        {last && <span className="mirror-toast" role="status">✨ {last}</span>}
      </div>
      <div className="mirror-info">
        <h2 id="mirror-title">🪞 Bakım aynası</h2>
        <p className="mirror-head">{headline}</p>
        <ul className="mirror-bars">
          {AREAS.map((a) => {
            const v = state.areas[a];
            return (
              <li key={a}>
                <span>{AREA_NAME[a]}</span>
                <span className="mirror-bar" data-level={v === null ? "yok" : v >= 0.8 ? "iyi" : v >= 0.55 ? "orta" : v >= 0.3 ? "dusuk" : "kotu"}>
                  <i style={{ width: `${Math.round((v ?? 0) * 100)}%` }} />
                </span>
                <small>{areaWord(a, v)}</small>
              </li>
            );
          })}
        </ul>
        <p className="mirror-mind">🧠 {studyWord(state.study)}</p>
        <p className="muted mirror-hint">Bir adımı işaretle, aynada uygulandığını gör. Son 10 günün düzenine bakar; bakım yapmadığın günler yüzde birikir.</p>
      </div>
    </section>
  );
}
