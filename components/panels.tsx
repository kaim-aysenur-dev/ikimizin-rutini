"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CARE, CARE_GROUPS, MEALS, NAMES, PEOPLE, SPORT, WATER_TARGET, type CareGroup, type Exercise } from "@/lib/plan";
import { MONTHS, WEEKDAYS, addDays, longDate, monthGrid, shiftMonth, todayIst, weekOf, weekday } from "@/lib/gun";
import { addWater, getDay, isDone, plannedTasks, progress, setSets, toggle, toggleTask, useDay, useVersion } from "@/lib/store";
import type { Person } from "@/lib/scenes/types";
import { readProfile } from "@/lib/profile";
import s from "./panels.module.css";

/* --------------------------------- ortak --------------------------------- */

// Bugün tarayıcıda hesaplanır (sunucuda önceden hesaplanmaz); gün değişince kendiliğinden yenilenir.
// İlk karede null döner, paneller o an boş kalır.
function useToday() {
  const [d, setD] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setD(todayIst());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return d;
}

export function Panel({ id, title, children, wide }: { id: string; title: string; children: ReactNode; wide?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div id={id} className={`${s.panel} ${wide ? s.wide : ""}`}>
      <button className={s.head} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <h2>{title}</h2>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className={s.body}>{children}</div>}
    </div>
  );
}

function Tabs({ who, set }: { who: Person; set: (p: Person) => void }) {
  return (
    <div className={s.tabs} role="tablist">
      {PEOPLE.map((p) => (
        <button key={p} role="tab" aria-selected={who === p} className={`${s.tab} ${s[p]}`} onClick={() => set(p)}>{NAMES[p]}</button>
      ))}
    </div>
  );
}

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

function Timer({ secs, label = "Sayaç" }: { secs: number; label?: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (left === null || left <= 0) return;
    const id = setTimeout(() => setLeft((l) => (l === null ? null : l - 1)), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const running = left !== null && left > 0;
  return (
    <button className={`${s.timer} ${left === 0 ? s.timerDone : ""}`} onClick={() => setLeft(running ? null : secs)} aria-label={`${label} ${mmss(secs)}`}>
      {left === null ? `⏱ ${mmss(secs)}` : left === 0 ? "✓ Bitti" : mmss(left)}
    </button>
  );
}

function Check({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button className={`${s.check} ${on ? s.on : ""}`} onClick={onChange} aria-pressed={on} aria-label={label}>
      {on ? "✓" : ""}
    </button>
  );
}

function Bar({ done, total }: { done: number; total: number }) {
  const k = total ? done / total : 0;
  return <span className={s.bar} aria-hidden="true"><i style={{ width: `${Math.round(k * 100)}%` }} /></span>;
}

/* ---------------------------------- Günüm ---------------------------------- */

export function DayPanel() {
  const today = useToday();
  useVersion();
  if (!today) return null;
  return (
    <Panel id="gunum" title="Günüm">
      <p className={s.sub}>{longDate(today)}</p>
      <div className={s.cols}>
        {PEOPLE.map((p) => {
          const r = getDay(today, p);
          const tasks = plannedTasks(today, p);
          const kind = (k: string) => { const ts = tasks.filter((t) => t.kind === k); return [ts.filter((t) => isDone(r, p, t.id)).length, ts.length] as const; };
          const sportDay = SPORT[p].days.includes(weekday(today));
          const rows: [string, string, number, number][] = [
            ["Bakım", "", ...kind("Bakım")],
            [SPORT[p].title, sportDay ? "" : "Dinlenme günü", ...kind("Spor")],
            ["Öğün", "", ...kind("Beslenme")],
            ["Su", `${r.water} / ${WATER_TARGET} bardak`, Math.min(r.water, WATER_TARGET), WATER_TARGET],
          ];
          return (
            <div key={p} className={s.col}>
              <h3 className={s[p]}>{NAMES[p]}</h3>
              <ul className={s.list}>
                {rows.map(([k, note, d, t]) => (
                  <li key={k}><span>{k}</span><b>{note || `${d} / ${t}`}</b>{t > 0 && <Bar done={d} total={t} />}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ---------------------------------- Spor ---------------------------------- */

function ExerciseRow({ ex, who, date }: { ex: Exercise; who: Person; date: string }) {
  const r = useDay(date, who);
  const n = r.sets[ex.id] ?? 0;
  const amount = ex.reps ? `${ex.reps} tekrar` : `${mmss(ex.secs ?? 0)}`;
  return (
    <li className={`${s.ex} ${n >= ex.sets ? s.exDone : ""}`}>
      <div className={s.exHead}>
        <b>{ex.name}</b>
        <span>{ex.sets} set × {amount}{ex.rest ? ` · ${ex.rest} sn dinlenme` : ""}</span>
      </div>
      <div className={s.exRow}>
        <div className={s.sets} role="group" aria-label={`${ex.name} setleri`}>
          {Array.from({ length: ex.sets }, (_, i) => (
            <button key={i} className={i < n ? s.setOn : ""} aria-pressed={i < n} aria-label={`${i + 1}. set`} onClick={() => setSets(date, who, ex.id, i < n ? i : i + 1)}>{i + 1}</button>
          ))}
        </div>
        {ex.secs ? <Timer secs={ex.secs} label="Süre" /> : null}
        {ex.rest ? <Timer secs={ex.rest} label="Dinlenme" /> : null}
      </div>
    </li>
  );
}

export function SportPanel() {
  const today = useToday();
  const [who, setWho] = useState<Person>(() => readProfile() ?? "cengiz");
  if (!today) return null;
  return <SportBody today={today} who={who} setWho={setWho} />;
}

function SportBody({ today, who, setWho }: { today: string; who: Person; setWho: (p: Person) => void }) {
  const prog = SPORT[who];
  const day = prog.days.includes(weekday(today));
  const r = useDay(today, who);
  const done = prog.items.filter((e) => (r.sets[e.id] ?? 0) >= e.sets).length;
  return (
    <Panel id="spor-panel" title="Spor">
      <Tabs who={who} set={setWho} />
      <p className={s.sub}>{prog.title} · {prog.days.map((d) => WEEKDAYS[d]).join(", ")}</p>
      {!day && <p className={s.note}>Bugün {prog.title.toLowerCase()} günü değil; yine de çalışırsan işaretleyebilirsin.</p>}
      <p className={s.sum}>Tamamlanan: {done} / {prog.items.length} <Bar done={done} total={prog.items.length} /></p>
      <ul className={s.exList}>{prog.items.map((e) => <ExerciseRow key={e.id} ex={e} who={who} date={today} />)}</ul>
    </Panel>
  );
}

/* --------------------------------- İlerleme --------------------------------- */

export function ProgressPanel() {
  const today = useToday();
  useVersion();
  if (!today) return null;
  const week = weekOf(today);
  return (
    <Panel id="ilerleme" title="İlerleme">
      <p className={s.sub}>Bu hafta</p>
      {PEOPLE.map((p) => {
        const days = week.map((d) => progress(d, p));
        const done = days.reduce((a, d) => a + d.done, 0), total = days.reduce((a, d) => a + d.total, 0);
        return (
          <div key={p} className={s.week}>
            <h3 className={s[p]}>{NAMES[p]} <small>%{total ? Math.round((done / total) * 100) : 0}</small></h3>
            <div className={s.weekBars}>
              {week.map((d, i) => (
                <div key={d} className={`${s.wb} ${d === today ? s.wbToday : ""}`} title={`${longDate(d)}: ${days[i].done}/${days[i].total}`}>
                  <i style={{ height: `${days[i].total ? Math.round((days[i].done / days[i].total) * 100) : 0}%` }} className={days[i].full ? s.full : ""} />
                  <span>{WEEKDAYS[i][0]}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Panel>
  );
}

/* --------------------------------- Beslenme --------------------------------- */

export function NutritionPanel() {
  const today = useToday();
  const [who, setWho] = useState<Person>(() => readProfile() ?? "cengiz");
  if (!today) return null;
  return <NutritionBody today={today} who={who} setWho={setWho} />;
}

function NutritionBody({ today, who, setWho }: { today: string; who: Person; setWho: (p: Person) => void }) {
  const r = useDay(today, who);
  const meals = MEALS[who];
  const sum = (ids: string[]) => meals.filter((m) => ids.includes(m.id)).flatMap((m) => m.foods).reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, f: a.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const plan = sum(meals.map((m) => m.id));
  const eaten = sum(meals.filter((m) => r.done.includes(`meal:${m.id}`)).map((m) => m.id));
  return (
    <Panel id="beslenme-panel" title="Beslenme">
      <Tabs who={who} set={setWho} />
      <div className={s.macros}>
        <div><b>{eaten.kcal}</b><span>/ {plan.kcal} kcal</span></div>
        <div><b>{eaten.p} g</b><span>protein</span></div>
        <div><b>{eaten.c} g</b><span>karbonhidrat</span></div>
        <div><b>{eaten.f} g</b><span>yağ</span></div>
      </div>
      <ul className={s.meals}>
        {meals.map((m) => {
          const id = `meal:${m.id}`;
          const kcal = m.foods.reduce((a, f) => a + f.kcal, 0);
          return (
            <li key={m.id}>
              <div className={s.mealHead}>
                <Check on={r.done.includes(id)} onChange={() => toggle(today, who, id)} label={`${m.label} yendi`} />
                <b>{m.label}</b><span>{kcal} kcal</span>
              </div>
              <ul className={s.foods}>{m.foods.map((f) => <li key={f.name}><span>{f.name}</span><span>{f.portion}</span><span>{f.kcal} kcal</span></li>)}</ul>
            </li>
          );
        })}
      </ul>
      <div className={s.water}>
        <span>Su</span>
        <button onClick={() => addWater(today, who, -1)} aria-label="Bir bardak azalt">−</button>
        <div className={s.glasses} aria-label={`${r.water} / ${WATER_TARGET} bardak`}>
          {Array.from({ length: WATER_TARGET }, (_, i) => <i key={i} className={i < r.water ? s.full : ""} />)}
        </div>
        <button onClick={() => addWater(today, who, 1)} aria-label="Bir bardak ekle">+</button>
        <b>{r.water}/{WATER_TARGET}</b>
      </div>
    </Panel>
  );
}

/* ----------------------------------- Bakım ----------------------------------- */

export function CarePanel() {
  const today = useToday();
  const [who, setWho] = useState<Person>(() => readProfile() ?? "cengiz");
  const [group, setGroup] = useState<CareGroup>("aksam");
  if (!today) return null;
  return <CareBody today={today} who={who} setWho={setWho} group={group} setGroup={setGroup} />;
}

function CareBody({ today, who, setWho, group, setGroup }: { today: string; who: Person; setWho: (p: Person) => void; group: CareGroup; setGroup: (g: CareGroup) => void }) {
  const r = useDay(today, who);
  const items = CARE[who].filter((i) => i.group === group);
  return (
    <Panel id="bakim-panel" title="Bakım">
      <Tabs who={who} set={setWho} />
      <div className={s.groups}>
        {CARE_GROUPS.map((g) => <button key={g.id} className={group === g.id ? s.groupOn : ""} onClick={() => setGroup(g.id)}>{g.label}</button>)}
      </div>
      <ul className={s.care}>
        {items.map((i) => {
          const id = `care:${i.id}`;
          return (
            <li key={i.id}>
              <Check on={r.done.includes(id)} onChange={() => toggle(today, who, id)} label={`${i.label} yapıldı`} />
              <div className={s.careText}>
                <b>{i.label}</b>
                <span className={s.product}>{i.product}{i.brand ? ` · ${i.brand}` : ""}</span>
                <span>{i.how}</span>
                {i.note && <span className={s.warn}>{i.note}</span>}
              </div>
              {i.secs ? <Timer secs={i.secs} label="Bekleme" /> : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ----------------------------------- Takvim ----------------------------------- */

export function CalendarPanel() {
  const today = useToday();
  return today ? <CalendarBody today={today} /> : null;
}

function CalendarBody({ today }: { today: string }) {
  useVersion();
  const [ym, setYm] = useState<[number, number]>(() => { const [y, m] = today.split("-").map(Number); return [y, m - 1]; });
  const [sel, setSel] = useState(today);
  const cells = monthGrid(ym[0], ym[1]);
  const back = () => { const [y, m] = today.split("-").map(Number); setYm([y, m - 1]); setSel(today); };

  const mark = (who: Person, id: string) => toggleTask(sel, who, id);

  // aylık özet: gerçek kayıtlardan
  const monthDays = cells.filter((d): d is string => !!d && d <= today);
  const fullDays = (p: Person) => monthDays.filter((d) => progress(d, p).full).length;
  const both = monthDays.filter((d) => progress(d, "cengiz").full && progress(d, "aysenur").full).length;

  return (
    <Panel id="takvim-panel" title="Takvim" wide>
      <div className={s.calHead}>
        <button onClick={() => setYm(shiftMonth(ym[0], ym[1], -1))} aria-label="Önceki ay">◂</button>
        <b>{MONTHS[ym[1]]} {ym[0]}</b>
        <button onClick={() => setYm(shiftMonth(ym[0], ym[1], 1))} aria-label="Sonraki ay">▸</button>
        <button className={s.todayBtn} onClick={back}>Bugüne dön</button>
      </div>
      <div className={s.cal} role="grid">
        {WEEKDAYS.map((w) => <div key={w} className={s.wd}>{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const a = progress(d, "cengiz"), b = progress(d, "aysenur");
          const cls = [s.day, d === today ? s.isToday : "", d === sel ? s.isSel : "", d > today ? s.future : ""].join(" ");
          return (
            <button key={d} className={cls} onClick={() => setSel(d)} aria-label={`${longDate(d)}: Cengiz ${a.done}/${a.total}, Ayşenur ${b.done}/${b.total}`}>
              <span className={s.num}>{Number(d.slice(8))}{a.full && b.full && <i className={s.heart} aria-hidden="true">♥</i>}</span>
              {([["cengiz", "C", a], ["aysenur", "A", b]] as const).map(([p, ini, q]) => (
                <span key={p} className={`${s.who} ${q.full ? s.whoFull : q.done ? s.whoPart : ""}`}>
                  <span className={s.long}>{NAMES[p]}</span><span className={s.short}>{ini}</span> {q.full ? "✓" : q.done ? <><span className={s.long}>{q.done}/{q.total}</span><span className={s.short}>◐</span></> : ""}
                </span>
              ))}
            </button>
          );
        })}
      </div>
      <p className={s.sum}>Bu ay tamamlanan gün · Cengiz {fullDays("cengiz")} · Ayşenur {fullDays("aysenur")} · ikisi birden {both}</p>
      <div className={s.detail}>
        <h3>{longDate(sel)}</h3>
        <div className={s.cols}>
          {PEOPLE.map((p) => {
            const r = getDay(sel, p);
            const tasks = plannedTasks(sel, p);
            const pr = progress(sel, p);
            return (
              <div key={p} className={s.col}>
                <h4 className={s[p]}>{NAMES[p]} <small>{pr.done}/{pr.total}</small></h4>
                <ul className={s.tasks}>
                  {tasks.map((t) => (
                    <li key={t.id}>
                      <Check on={isDone(r, p, t.id)} onChange={() => mark(p, t.id)} label={`${NAMES[p]}: ${t.label}`} />
                      <span><small>{t.kind}</small>{t.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <p className={s.sub}>Önceki gün: <button className={s.link} onClick={() => setSel(addDays(sel, -1))}>◂ {Number(addDays(sel, -1).slice(8))}</button> · Sonraki: <button className={s.link} onClick={() => setSel(addDays(sel, 1))}>{Number(addDays(sel, 1).slice(8))} ▸</button></p>
    </Panel>
  );
}
