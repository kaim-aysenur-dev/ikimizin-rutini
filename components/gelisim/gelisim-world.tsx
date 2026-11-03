"use client";

import { useEffect, useRef, useState } from "react";
import { PixelCanvas } from "@/components/pixel-canvas";
import { api } from "@/lib/api-client";
import { type Anchor, type Cat, type Hero, ORIGIN, VIEW, drawItemPreview, drawScene } from "@/lib/gelisim-scene";
import { toTile } from "@/lib/iso";
import { GARDEN_DOORS, type Placed, ROOM_DOOR, SIZE, blockedSet, canPlace } from "@/lib/room";
import { ROOM_ITEMS, type Scope, itemById } from "@/lib/room-items";
import { TIERS } from "@/lib/scenes/hall";
import { tierOf } from "@/lib/xp";

type Profile = { id: string; name: string; level: number };
type Where = { scope: "oda"; owner: string } | { scope: "bahce" };
type Mode = { kind: "walk" } | { kind: "place"; itemId: string } | { kind: "edit" };
type Remote = Hero & { userId: string; ti: number; tj: number };

const whoOf = (name: string): Hero["who"] => (/ay[sş]enur/i.test(name) ? "aysenur" : "cengiz");
const look = (level: number) => { const t = TIERS[tierOf(level)]; return { outfit: t.outfit, tint: t.tint }; };
const SPEED = 3; // kare / saniye
const KEYS: Record<string, [number, number]> = {
  w: [-1, -1], arrowup: [-1, -1], s: [1, 1], arrowdown: [1, 1], a: [-1, 1], arrowleft: [-1, 1], d: [1, -1], arrowright: [1, -1],
};

// Gelişim: kendi izometrik odan, kapıdan ortak bahçe. W A S D (telefonda oklar) ile yürünür, envanterden eşya konur.
export function GelisimWorld({ me, profiles, initialPlaced }: { me: string; profiles: Profile[]; initialPlaced: Placed[] }) {
  const meP = profiles.find((p) => p.id === me)!;
  const [where, setWhere] = useState<Where>({ scope: "oda", owner: me });
  const [placed, setPlaced] = useState(initialPlaced);
  const [mode, setMode] = useState<Mode>({ kind: "walk" });
  const [tab, setTab] = useState<Scope>("oda");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // oyun durumu: her karede değişir, React'e girmez
  const hero = useRef<Hero>({ who: whoOf(meP.name), i: 3.5, j: 4.5, dir: 1, dist: 0, moving: false, ...look(meP.level) });
  const keys = useRef(new Set<string>());
  const pad = useRef<[number, number] | null>(null);
  const hover = useRef<[number, number] | null>(null);
  const others = useRef<Remote[]>([]);
  const cat = useRef<Cat & { goal: [number, number]; wait: number }>({ i: 6, j: 7, dir: 1, dist: 0, moving: false, goal: [6, 7], wait: 2 });
  const fade = useRef<{ t: number; to: Where | null; spawn: [number, number] } | null>(null);
  const last = useRef(0);
  const canvasEl = useRef<HTMLDivElement>(null);
  const tagRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const live = useRef({ where, placed, mode });
  live.current = { where, placed, mode };

  const scenePlaced = (w: Where, all: Placed[]) => all.filter((p) => (w.scope === "bahce" ? p.scope === "bahce" : p.scope === "oda" && p.userId === w.owner));
  const ownerName = where.scope === "oda" ? profiles.find((p) => p.id === where.owner)?.name ?? "" : "";
  const visiting = where.scope === "oda" && where.owner !== me;

  // klavye: W A S D ve oklar; Esc yerleştirmeyi bırakır
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.target instanceof Element && e.target.closest("input, textarea, select")) return;
      if (k === "escape") setMode({ kind: "walk" });
      if (KEYS[k]) { keys.current.add(k); if (k.startsWith("arrow")) e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);

  // bahçede canlı konum: yarım saniyede bir yaz ve diğerini al; bahçeden çıkınca ya da sayfadan ayrılınca sil
  useEffect(() => {
    if (where.scope !== "bahce") return;
    let stop = false;
    const tick = async () => {
      const h = hero.current;
      try {
        const res = await api<{ others: { userId: string; x: number; y: number; dir: number; moving: boolean }[] }>("/api/gelisim/konum", { body: { here: true, x: h.i, y: h.j, dir: h.dir, moving: h.moving } });
        if (stop) return;
        others.current = res.others.map((o) => {
          const prev = others.current.find((p) => p.userId === o.userId);
          const prof = profiles.find((p) => p.id === o.userId);
          return { userId: o.userId, who: whoOf(prof?.name ?? ""), ...look(prof?.level ?? 1), i: prev?.i ?? o.x, j: prev?.j ?? o.y, ti: o.x, tj: o.y, dir: o.dir === -1 ? -1 : 1, dist: prev?.dist ?? 0, moving: o.moving };
        });
      } catch { /* bağlantı koparsa bir sonraki turda yeniden dener */ }
    };
    tick();
    const id = window.setInterval(tick, 500);
    const leave = () => { void fetch("/api/gelisim/konum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ here: false }), keepalive: true }); };
    window.addEventListener("pagehide", leave);
    return () => { stop = true; window.clearInterval(id); window.removeEventListener("pagehide", leave); leave(); others.current = []; };
  }, [where.scope, profiles]);

  const go = (to: Where, spawn: [number, number]) => { if (!fade.current) fade.current = { t: 0, to, spawn }; };

  // her kare: hareket, çarpışma, kapılar, kedi, uzaktaki kişi, çizim
  const draw = (c: CanvasRenderingContext2D, _w: number, _h: number, t: number) => {
    const dt = Math.min(0.05, last.current ? t - last.current : 0); last.current = t;
    const { where: wh, placed: all, mode: md } = live.current;
    const scope = wh.scope;
    const here = scenePlaced(wh, all);
    const { w, d } = SIZE[scope];
    const blocked = blockedSet(scope, here);
    const h = hero.current;

    // yön: klavye ya da dokunmatik oklar (ekranda yukarı = i ve j birlikte azalır)
    let di = 0, dj = 0;
    for (const k of keys.current) { const v = KEYS[k]; if (v) { di += v[0]; dj += v[1]; } }
    if (pad.current) { di += pad.current[0]; dj += pad.current[1]; }
    const len = Math.hypot(di, dj);
    h.moving = len > 0 && !fade.current;
    if (h.moving) {
      const step = (SPEED * dt) / len;
      const free = (i: number, j: number) => {
        const doorGap = scope === "oda" ? Math.floor(j) === ROOM_DOOR.j && i > -0.2 : GARDEN_DOORS.some((g) => Math.floor(i) === g.i) && j > -0.2;
        const minI = scope === "oda" && doorGap ? -0.1 : 0.3, minJ = scope === "bahce" && doorGap ? -0.1 : 0.3;
        if (i < minI || j < minJ || i > w - 0.3 || j > d - 0.3) return false;
        return !blocked.has(`${Math.floor(i)},${Math.floor(j)}`);
      };
      const ni = h.i + di * step, nj = h.j + dj * step;
      if (free(ni, h.j)) h.i = ni;
      if (free(h.i, nj)) h.j = nj;
      h.dist += step * len * 8;
      const sx = di - dj; if (sx !== 0) h.dir = sx > 0 ? 1 : -1;
    }
    // kapılar
    if (!fade.current) {
      if (scope === "oda" && h.i < 0.12) {
        const k = Math.max(0, profiles.findIndex((p) => p.id === wh.owner));
        const door = GARDEN_DOORS[Math.min(k, GARDEN_DOORS.length - 1)];
        go({ scope: "bahce" }, [door.i + 0.5, 1.7]);
      } else if (scope === "bahce" && h.j < 0.12) {
        const k = GARDEN_DOORS.findIndex((g) => Math.floor(h.i) === g.i);
        const owner = profiles[k]?.id;
        if (owner) go({ scope: "oda", owner }, [1.5, ROOM_DOOR.j + 0.5]);
      }
    }
    // geçiş: kararıp yeni sahnede açılır
    let shade = 0;
    if (fade.current) {
      const f = fade.current; f.t += dt;
      // basılı tuş sıfırlanır: yoksa yeni sahnede aynı yöne yürüyüp kapıdan geri dönülür
      if (f.to && f.t >= 0.25) { setWhere(f.to); h.i = f.spawn[0]; h.j = f.spawn[1]; f.to = null; f.t = 0.25; keys.current.clear(); pad.current = null; }
      shade = f.t < 0.25 ? f.t / 0.25 : Math.max(0, 1 - (f.t - 0.25) / 0.25);
      if (!f.to && f.t >= 0.5) fade.current = null;
    }

    // Düldül bahçede dolaşır: rastgele boş kareye yürür, biraz oturur
    let catState: Cat | null = null;
    if (scope === "bahce") {
      const k = cat.current;
      const gi = k.goal[0] + 0.5 - k.i, gj = k.goal[1] + 0.5 - k.j, gl = Math.hypot(gi, gj);
      if (gl < 0.1) {
        k.moving = false; k.wait -= dt;
        if (k.wait <= 0) {
          for (let tries = 0; tries < 8; tries++) {
            const a = 1 + Math.floor(Math.random() * (w - 2)), b = 2 + Math.floor(Math.random() * (d - 3));
            if (!blocked.has(`${a},${b}`)) { k.goal = [a, b]; break; }
          }
          k.wait = 2 + Math.random() * 4;
        }
      } else {
        const st = Math.min(gl, 1.6 * dt);
        k.i += (gi / gl) * st; k.j += (gj / gl) * st; k.dist += st * 8; k.moving = true;
        if (gi - gj !== 0) k.dir = gi - gj > 0 ? 1 : -1;
      }
      catState = k;
    }

    // uzaktaki kişi: son bilinen konuma yumuşakça kayar
    const remote = scope === "bahce" ? others.current : [];
    for (const r of remote) {
      const ri = r.ti - r.i, rj = r.tj - r.j, rl = Math.hypot(ri, rj);
      if (rl > 3) { r.i = r.ti; r.j = r.tj; } else if (rl > 0.01) { const st = Math.min(rl, SPEED * 1.2 * dt); r.i += (ri / rl) * st; r.j += (rj / rl) * st; r.dist += st * 8; }
      r.moving = rl > 0.05 || r.moving;
    }

    // yerleştirme önizlemesi ve düzenleme seçimi
    let ghost = null, pick: string | null = null;
    const hv = hover.current;
    if (hv && md.kind === "place") {
      const it = itemById.get(md.itemId)!;
      const tx = Math.floor(hv[0] - (it.size[0] - 1) / 2), ty = Math.floor(hv[1] - (it.size[1] - 1) / 2);
      const around = scope === "oda" ? here : all.filter((p) => p.scope === "bahce");
      ghost = { itemId: md.itemId, tx, ty, ok: canPlace(scope, md.itemId, tx, ty, around) };
    } else if (hv && md.kind === "edit") {
      pick = here.find((p) => p.userId === me && footprintHas(p, hv))?.id ?? null;
    }

    const anchors = drawScene(c, t, { scope, placed: here, heroes: [h, ...remote], ghost, pick, cat: catState });
    if (shade > 0) { c.fillStyle = `rgba(20,16,30,${shade.toFixed(2)})`; c.fillRect(0, 0, c.canvas.width, c.canvas.height); }
    placeTags(anchors, VIEW[scope][0]);
  };

  const footprintHas = (p: Placed, [hi, hj]: [number, number]) => {
    const it = itemById.get(p.itemId); if (!it) return false;
    return hi >= p.tx && hi < p.tx + it.size[0] && hj >= p.ty && hj < p.ty + it.size[1];
  };

  // isim etiketleri: tuval ölçeğine göre DOM'da
  const placeTags = (anchors: Anchor[], viewW: number) => {
    const box = canvasEl.current?.getBoundingClientRect(); if (!box) return;
    const k = box.width / viewW;
    for (const [key, el] of Object.entries(tagRefs.current)) {
      if (!el) continue;
      const a = anchors.find((x) => x.key === key);
      el.style.display = a ? "" : "none";
      if (a) el.style.transform = `translate(${Math.round(a.x * k)}px, ${Math.round(a.y * k)}px) translate(-50%, -100%)`;
    }
  };

  // fare/dokunuş: tuvaldeki kare
  const tileAt = (e: React.PointerEvent) => {
    const r = canvasEl.current!.getBoundingClientRect();
    const [vw, vh] = VIEW[live.current.where.scope];
    const x = ((e.clientX - r.left) / r.width) * vw, y = ((e.clientY - r.top) / r.height) * vh;
    const [i, j] = toTile(ORIGIN[live.current.where.scope], x, y);
    return [i, j] as [number, number];
  };

  const onPointer = async (e: React.PointerEvent) => {
    hover.current = tileAt(e);
    if (e.type !== "pointerdown" || busy) return;
    const { where: wh, placed: all, mode: md } = live.current;
    const scope = wh.scope;
    if (md.kind === "place") {
      const it = itemById.get(md.itemId)!;
      const [hi, hj] = hover.current;
      const tx = Math.floor(hi - (it.size[0] - 1) / 2), ty = Math.floor(hj - (it.size[1] - 1) / 2);
      const around = scope === "oda" ? scenePlaced(wh, all) : all.filter((p) => p.scope === "bahce");
      if (!canPlace(scope, md.itemId, tx, ty, around)) { setMsg("Buraya konamaz: kare dolu ya da kapı önünde."); return; }
      setBusy(true);
      try {
        const res = await api<{ item: Placed }>("/api/gelisim/esya", { body: { itemId: md.itemId, scope, tx, ty } });
        setPlaced((p) => [...p, res.item]);
        setMode({ kind: "walk" });
        setMsg(`${it.name} yerleştirildi.`);
      } catch (err) { setMsg(err instanceof Error ? err.message : "Yerleştirilemedi."); }
      setBusy(false);
    } else if (md.kind === "edit") {
      const p = scenePlaced(wh, all).find((q) => q.userId === me && footprintHas(q, hover.current!));
      if (p) await takeBack(p);
    }
  };

  const takeBack = async (p: Placed) => {
    setBusy(true);
    try {
      await api(`/api/gelisim/esya/${p.id}`, { method: "DELETE" });
      setPlaced((all) => all.filter((q) => q.id !== p.id));
      setMsg(`${itemById.get(p.itemId)?.name} envantere döndü.`);
    } catch (err) { setMsg(err instanceof Error ? err.message : "Geri alınamadı."); }
    setBusy(false);
  };

  useEffect(() => { if (!msg) return; const id = window.setTimeout(() => setMsg(null), 2600); return () => window.clearTimeout(id); }, [msg]);
  useEffect(() => { if (where.scope === "bahce") setTab("bahce"); else if (!visiting) setTab("oda"); }, [where.scope, visiting]);

  const mine = new Set(placed.filter((p) => p.userId === me).map((p) => p.itemId));
  const canEditHere = where.scope === "bahce" || !visiting;
  const padBtn = (v: [number, number], label: string, cls: string) => (
    <button type="button" className={`gw-pad-btn ${cls}`} aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); pad.current = v; }} onPointerUp={() => (pad.current = null)} onPointerLeave={() => (pad.current = null)} onPointerCancel={() => (pad.current = null)}>
      {label === "Yukarı" ? "▲" : label === "Aşağı" ? "▼" : label === "Sola" ? "◀" : "▶"}
    </button>
  );

  return (
    <div className="gw">
      <div className="gw-bar">
        <span className="gw-where">{where.scope === "bahce" ? "🌳 Ortak bahçe" : visiting ? `🚪 ${ownerName}'in odası · misafirsin` : "🏠 Odan"}</span>
        <span className="gw-hint">W A S D ile yürü · kapıdan geç</span>
        {canEditHere && (
          <button type="button" className={`btn ${mode.kind === "edit" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode(mode.kind === "edit" ? { kind: "walk" } : { kind: "edit" })}>
            {mode.kind === "edit" ? "Düzenlemeyi bitir" : "Eşya kaldır"}
          </button>
        )}
      </div>

      <div className={`gw-stage${mode.kind !== "walk" ? " is-editing" : ""}`} ref={canvasEl} onPointerMove={onPointer} onPointerDown={onPointer} onPointerLeave={() => (hover.current = null)}>
        <PixelCanvas draw={draw} size={VIEW[where.scope]} scale={3} fps={30} className="gw-canvas" label={where.scope === "bahce" ? "Ortak bahçe" : "Oda"} />
        {(["cengiz", "aysenur", "duldul", "parrot"] as const).map((k) => (
          <span key={k} ref={(el) => { tagRefs.current[k] = el; }} className={`hall-tag is-${k}`} style={{ display: "none" }} aria-hidden="true">
            {k === "cengiz" ? "Cengiz" : k === "aysenur" ? "Ayşenur" : k === "duldul" ? "Düldül" : "Papağan"}
          </span>
        ))}
        {mode.kind === "place" && <p className="gw-tip">{itemById.get(mode.itemId)?.name}: koymak için bir kareye dokun · Esc ile vazgeç</p>}
        {mode.kind === "edit" && <p className="gw-tip">Geri almak istediğin eşyaya dokun</p>}
        {msg && <p className="gw-msg" role="status">{msg}</p>}
      </div>

      <div className="gw-pad" aria-label="Yön tuşları">
        {padBtn([-1, -1], "Yukarı", "up")}
        {padBtn([-1, 1], "Sola", "left")}
        {padBtn([1, -1], "Sağa", "right")}
        {padBtn([1, 1], "Aşağı", "down")}
      </div>

      <section className="card gw-inv" aria-labelledby="envanter">
        <div className="gw-inv-head">
          <h2 id="envanter">Envanter</h2>
          <div className="chips" role="tablist">
            <button type="button" role="tab" className="chip" aria-selected={tab === "oda"} onClick={() => setTab("oda")}>Oda eşyaları</button>
            <button type="button" role="tab" className="chip" aria-selected={tab === "bahce"} onClick={() => setTab("bahce")}>Bahçe eşyaları</button>
          </div>
        </div>
        <p className="muted">{tab === "oda" ? "Oda eşyalarını kendi odanda yerleştirirsin." : "Bahçe eşyaları ortak bahçeye konur; ikiniz de görürsünüz."} Seviye atladıkça yenileri açılır.</p>
        <ul className="gw-items">
          {ROOM_ITEMS.filter((it) => it.scope === tab).map((it) => {
            const locked = it.level > meP.level;
            const isPlaced = mine.has(it.id);
            const rightPlace = tab === where.scope && canEditHere;
            const placedRow = placed.find((p) => p.userId === me && p.itemId === it.id);
            return (
              <li key={it.id} className={`gw-item${locked ? " is-locked" : ""}${mode.kind === "place" && mode.itemId === it.id ? " is-active" : ""}`}>
                <PixelCanvas draw={(c, w, h, t) => drawItemPreview(c, w, h, it.id, t)} size={[48, 40]} scale={2} fps={locked ? 1 : 6} className="gw-item-icon" />
                <div>
                  <b>{locked ? "???" : it.name}</b>
                  <small>{locked ? `🔒 Seviye ${it.level}` : isPlaced ? "Yerleştirildi" : `Lv ${it.level} · ${it.size[0]}×${it.size[1]}`}</small>
                </div>
                {!locked && !isPlaced && (
                  <button type="button" className="btn btn-primary" disabled={!rightPlace || busy}
                    title={rightPlace ? undefined : tab === "oda" ? "Önce kendi odana git" : "Önce bahçeye çık"}
                    onClick={() => { setMode({ kind: "place", itemId: it.id }); canvasEl.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                    Yerleştir
                  </button>
                )}
                {!locked && isPlaced && placedRow && (
                  <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => takeBack(placedRow)}>Geri al</button>
                )}
              </li>
            );
          })}
        </ul>
        {!(tab === where.scope && canEditHere) && <p className="muted gw-note">{tab === "oda" ? "Oda eşyası koymak için kendi odana dön." : "Bahçe eşyası koymak için kapıdan bahçeye çık."}</p>}
      </section>
    </div>
  );
}
