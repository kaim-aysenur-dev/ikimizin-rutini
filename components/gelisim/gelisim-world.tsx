"use client";

import { useEffect, useRef, useState } from "react";
import { PixelCanvas } from "@/components/pixel-canvas";
import { api } from "@/lib/api-client";
import { type Anchor, type Cat, type Hero, type Theme, drawItemPreview, drawScene } from "@/lib/gelisim-scene";
import { type Origin, toTile } from "@/lib/iso";
import { FRONT_DOOR, HOUSES, type Placed, SIZE, blockedSet, canPlace, gardenSolid, houseStep, roomAt } from "@/lib/room";
import { ROOM_ITEMS, type Scope, itemById } from "@/lib/room-items";
import { TIERS } from "@/lib/scenes/hall";
import { tierOf } from "@/lib/xp";

type Profile = { id: string; name: string; level: number };
type Where = { scope: "oda"; owner: string } | { scope: "bahce" };
type Mode = { kind: "walk" } | { kind: "place"; itemId: string } | { kind: "edit" };
type Remote = Hero & { userId: string; ti: number; tj: number };

const whoOf = (name: string): Theme => (/ay[sş]enur/i.test(name) ? "aysenur" : "cengiz");
const look = (level: number) => { const t = TIERS[tierOf(level)]; return { outfit: t.outfit, tint: t.tint }; };
const placeOf = (w: Where) => (w.scope === "bahce" ? "bahce" : `ev:${w.owner}`);
const leave = (place: string) => { void fetch("/api/gelisim/konum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ here: false, place }), keepalive: true }); };
const SPEED = 3.2; // kare / saniye
// W A S D ve oklar ekran yönleridir: yukarı = i ve j birlikte azalır
const KEYS: Record<string, [number, number]> = {
  w: [-1, -1], arrowup: [-1, -1], s: [1, 1], arrowdown: [1, 1], a: [-1, 1], arrowleft: [-1, 1], d: [1, -1], arrowright: [1, -1],
};

// Gelişim: kendi evin (altı oda) ve ortak bahçe. Kamera seni izler; envanterden eşya koyarsın; aynı yerdekiler birbirini canlı görür.
export function GelisimWorld({ me, profiles, initialPlaced }: { me: string; profiles: Profile[]; initialPlaced: Placed[] }) {
  const meP = profiles.find((p) => p.id === me)!;
  const [where, setWhere] = useState<Where>({ scope: "oda", owner: me });
  const [placed, setPlaced] = useState(initialPlaced);
  const [mode, setMode] = useState<Mode>({ kind: "walk" });
  const [tab, setTab] = useState<Scope>("oda");
  const [invOpen, setInvOpen] = useState(false);
  const [roomName, setRoomName] = useState("Giriş holü");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hero = useRef<Hero>({ who: whoOf(meP.name), i: 3, j: 2.5, dir: 1, dist: 0, moving: false, ...look(meP.level) });
  const keys = useRef(new Set<string>());
  const pad = useRef<[number, number] | null>(null);
  const hover = useRef<[number, number] | null>(null); // tuval pikseli
  const others = useRef<Remote[]>([]);
  const cat = useRef<Cat & { goal: [number, number]; wait: number }>({ i: 14, j: 14, dir: 1, dist: 0, moving: false, goal: [14, 14], wait: 2 });
  const fade = useRef<{ t: number; to: Where | null; spawn: [number, number] } | null>(null);
  const cam = useRef<Origin & { snap: boolean }>({ ox: 0, oy: 0, snap: true });
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tagRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const live = useRef({ where, placed, mode });
  live.current = { where, placed, mode };

  const themeOf = (id: string) => whoOf(profiles.find((p) => p.id === id)?.name ?? "");
  const scenePlaced = (w: Where, all: Placed[]) => all.filter((p) => (w.scope === "bahce" ? p.scope === "bahce" : p.scope === "oda" && p.userId === w.owner));
  const ownerName = where.scope === "oda" ? profiles.find((p) => p.id === where.owner)?.name.split(" ")[0] ?? "" : "";
  const visiting = where.scope === "oda" && where.owner !== me;
  const canEditHere = where.scope === "bahce" || !visiting;
  const inside = (p: Placed, [hi, hj]: [number, number]) => {
    const it = itemById.get(p.itemId); if (!it) return false;
    return hi >= p.tx && hi < p.tx + it.size[0] && hj >= p.ty && hj < p.ty + it.size[1];
  };
  const camOrigin = (): Origin => ({ ox: Math.round(cam.current.ox), oy: Math.round(cam.current.oy) });

  // klavye
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.target instanceof Element && e.target.closest("input, textarea, select")) return;
      if (k === "escape") setMode({ kind: "walk" });
      if (k === "e") setInvOpen((v) => !v);
      if (KEYS[k]) { keys.current.add(k); if (k.startsWith("arrow")) e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);

  // canlı konum: yarım saniyede bir; aynı yerdeki (bahçe ya da aynı ev) diğerini getirir
  useEffect(() => {
    const place = placeOf(where);
    let stop = false;
    const tick = async () => {
      const h = hero.current;
      try {
        const res = await api<{ others: { userId: string; x: number; y: number; dir: number; moving: boolean }[] }>("/api/gelisim/konum", { body: { here: true, place, x: h.i, y: h.j, dir: h.dir, moving: h.moving } });
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
    const onHide = () => leave(place);
    window.addEventListener("pagehide", onHide);
    return () => { stop = true; window.clearInterval(id); window.removeEventListener("pagehide", onHide); others.current = []; };
  }, [where, profiles]);
  useEffect(() => () => leave(placeOf(live.current.where)), []);

  // tuval sahne alanını doldurur: geniş ekranda 4, masaüstünde 3, telefonda 2 kat büyütülmüş piksel
  useEffect(() => {
    const el = stage.current!, cv = canvas.current!;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const k = r.width >= 1300 ? 4 : r.width >= 700 ? 3 : 2;
      cv.width = Math.max(120, Math.ceil(r.width / k)); cv.height = Math.max(100, Math.ceil(r.height / k));
      cv.getContext("2d")!.imageSmoothingEnabled = false;
      cam.current.snap = true;
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // oyun döngüsü: bir kez kurulur, değişen durumu live.current üzerinden okur
  useEffect(() => {
    const cv = canvas.current!, c = cv.getContext("2d")!;
    let raf = 0, last = 0, lastRoom = "";
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0); last = t;
      const { where: wh, placed: all, mode: md } = live.current;
      const scope = wh.scope;
      const here = scenePlaced(wh, all);
      const { w, d } = SIZE[scope];
      const blocked = blockedSet(scope, here);
      const h = hero.current;

      let di = 0, dj = 0;
      for (const k of keys.current) { const v = KEYS[k]; if (v) { di += v[0]; dj += v[1]; } }
      if (pad.current) { di += pad.current[0]; dj += pad.current[1]; }
      const len = Math.hypot(di, dj);
      h.moving = len > 0 && !fade.current;
      if (h.moving) {
        const step = (SPEED * dt) / len;
        const free = (i: number, j: number) => {
          const ci = Math.floor(i), cj = Math.floor(j), fi = Math.floor(h.i), fj = Math.floor(h.j);
          if (scope === "oda") {
            const atDoor = cj === FRONT_DOOR.j && i < 1;
            if (i < (atDoor ? -0.1 : 0.3) || j < 0.3 || i > w - 0.3 || j > d - 0.3) return false;
            // başka kareye geçerken aynı oda ya da kapı boşluğu olmalı
            if ((ci !== fi || cj !== fj) && ci >= 0 && !houseStep([fi, fj], [ci, cj])) return false;
          } else {
            const atDoor = HOUSES.some((hs) => ci === hs.door.i && j > hs.door.j - 0.2 && j < hs.door.j + 0.5);
            if (i < 0.3 || i > w - 0.3 || j > d - 0.3 || j < 0.3) return false;
            if (!atDoor && gardenSolid(ci, cj)) return false;
          }
          return !blocked.has(`${ci},${cj}`);
        };
        const ni = h.i + di * step, nj = h.j + dj * step;
        if (free(ni, h.j)) h.i = ni;
        if (free(h.i, nj)) h.j = nj;
        h.dist += step * len * 8;
        const sx = di - dj; if (sx !== 0) h.dir = sx > 0 ? 1 : -1;
      }
      // kapılar: evin ön kapısı bahçedeki evin önüne, bahçedeki ev kapısı o evin holüne
      if (!fade.current) {
        if (scope === "oda" && h.i < 0.1 && Math.floor(h.j) === FRONT_DOOR.j) {
          const k = Math.max(0, profiles.findIndex((p) => p.id === wh.owner));
          const door = HOUSES[Math.min(k, HOUSES.length - 1)].door;
          fade.current = { t: 0, to: { scope: "bahce" }, spawn: [door.i + 0.5, door.j + 1.4] };
        } else if (scope === "bahce") {
          const k = HOUSES.findIndex((hs) => Math.floor(h.i) === hs.door.i && h.j < hs.door.j + 0.15);
          const owner = profiles[k]?.id;
          if (owner) fade.current = { t: 0, to: { scope: "oda", owner }, spawn: [1.4, FRONT_DOOR.j + 0.5] };
        }
      }
      let darken = 0;
      if (fade.current) {
        const f = fade.current; f.t += dt;
        // basılı tuş sıfırlanır: yoksa yeni sahnede aynı yöne yürüyüp kapıdan geri dönülür
        if (f.to && f.t >= 0.25) {
          leave(placeOf(live.current.where));
          setWhere(f.to); live.current.where = f.to; h.i = f.spawn[0]; h.j = f.spawn[1];
          f.to = null; f.t = 0.25; keys.current.clear(); pad.current = null; cam.current.snap = true;
        }
        darken = f.t < 0.25 ? f.t / 0.25 : Math.max(0, 1 - (f.t - 0.25) / 0.25);
        if (!f.to && f.t >= 0.5) fade.current = null;
      }
      const cur = live.current.where;
      const rn = cur.scope === "oda" ? roomAt(Math.floor(h.i), Math.floor(h.j))?.name ?? "" : "Bahçe";
      if (rn && rn !== lastRoom) { lastRoom = rn; setRoomName(rn); }

      // kamera: karakteri yumuşakça izler
      const tx = cv.width / 2 - (h.i - h.j) * 8, ty = cv.height / 2 - (h.i + h.j) * 4 + 14;
      const cc = cam.current;
      if (cc.snap) { cc.ox = tx; cc.oy = ty; cc.snap = false; } else { const k = 1 - Math.pow(0.0015, dt); cc.ox += (tx - cc.ox) * k; cc.oy += (ty - cc.oy) * k; }
      const o = camOrigin();

      // Düldül bahçede dolaşır: yakındaki boş bir kareye yürür, biraz oturur
      let catState: Cat | null = null;
      if (cur.scope === "bahce") {
        const k = cat.current;
        const gi = k.goal[0] + 0.5 - k.i, gj = k.goal[1] + 0.5 - k.j, gl = Math.hypot(gi, gj);
        if (gl < 0.1) {
          k.moving = false; k.wait -= dt;
          if (k.wait <= 0) {
            for (let tries = 0; tries < 10; tries++) {
              const a = Math.floor(k.i) - 4 + Math.floor(Math.random() * 9), b = Math.floor(k.j) - 4 + Math.floor(Math.random() * 9);
              if (a > 0 && b > 8 && a < SIZE.bahce.w - 1 && b < SIZE.bahce.d - 1 && !gardenSolid(a, b) && !blocked.has(`${a},${b}`)) { k.goal = [a, b]; break; }
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

      for (const r of others.current) {
        const ri = r.ti - r.i, rj = r.tj - r.j, rl = Math.hypot(ri, rj);
        if (rl > 3) { r.i = r.ti; r.j = r.tj; } else if (rl > 0.01) { const st = Math.min(rl, SPEED * 1.2 * dt); r.i += (ri / rl) * st; r.j += (rj / rl) * st; r.dist += st * 8; }
        r.moving = rl > 0.05 || r.moving;
      }

      let ghost = null, pick: string | null = null;
      const hv = hover.current ? toTile(o, hover.current[0], hover.current[1]) : null;
      if (hv && md.kind === "place") {
        const it = itemById.get(md.itemId)!;
        const gx = Math.floor(hv[0] - (it.size[0] - 1) / 2), gy = Math.floor(hv[1] - (it.size[1] - 1) / 2);
        const around = cur.scope === "oda" ? here : all.filter((p) => p.scope === "bahce");
        ghost = { itemId: md.itemId, tx: gx, ty: gy, ok: canPlace(cur.scope, md.itemId, gx, gy, around) };
      } else if (hv && md.kind === "edit") {
        pick = here.find((p) => p.userId === me && inside(p, hv))?.id ?? null;
      }

      const anchors = drawScene(c, t, {
        scope: cur.scope, cam: o, theme: cur.scope === "oda" ? themeOf(cur.owner) : "cengiz",
        houseThemes: profiles.slice(0, HOUSES.length).map((p) => whoOf(p.name)),
        placed: scenePlaced(cur, all), heroes: [h, ...others.current], ghost, pick, cat: catState,
      });
      if (darken > 0) { c.fillStyle = `rgba(20,16,30,${darken.toFixed(2)})`; c.fillRect(0, 0, cv.width, cv.height); }
      placeTags(anchors, cv.width);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const placeTags = (anchors: Anchor[], viewW: number) => {
    const r = stage.current?.getBoundingClientRect(); if (!r) return;
    const k = r.width / viewW;
    for (const [key, el] of Object.entries(tagRefs.current)) {
      if (!el) continue;
      const a = anchors.find((x) => x.key === key);
      el.style.display = a ? "" : "none";
      if (a) el.style.transform = `translate(${Math.round(a.x * k)}px, ${Math.round(a.y * k)}px) translate(-50%, -100%)`;
    }
  };

  const pointer = (e: React.PointerEvent) => {
    const cv = canvas.current!, r = cv.getBoundingClientRect();
    hover.current = [((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height];
  };

  const onDown = async (e: React.PointerEvent) => {
    pointer(e);
    if (busy || !hover.current) return;
    const { where: wh, placed: all, mode: md } = live.current;
    const hv = toTile(camOrigin(), hover.current[0], hover.current[1]);
    const scope = wh.scope;
    if (md.kind === "place") {
      const it = itemById.get(md.itemId)!;
      const tx = Math.floor(hv[0] - (it.size[0] - 1) / 2), ty = Math.floor(hv[1] - (it.size[1] - 1) / 2);
      const around = scope === "oda" ? scenePlaced(wh, all) : all.filter((p) => p.scope === "bahce");
      if (!canPlace(scope, md.itemId, tx, ty, around)) { setMsg("Buraya konamaz: kare dolu, iki odaya taşıyor ya da kapı önü."); return; }
      setBusy(true);
      try {
        const res = await api<{ item: Placed }>("/api/gelisim/esya", { body: { itemId: md.itemId, scope, tx, ty } });
        setPlaced((p) => [...p, res.item]);
        setMode({ kind: "walk" });
        setMsg(`${it.name} yerleştirildi.`);
      } catch (err) { setMsg(err instanceof Error ? err.message : "Yerleştirilemedi."); }
      setBusy(false);
    } else if (md.kind === "edit") {
      const p = scenePlaced(wh, all).find((q) => q.userId === me && inside(q, hv));
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
  useEffect(() => { setTab(where.scope === "bahce" ? "bahce" : "oda"); }, [where.scope]);

  const mine = new Set(placed.filter((p) => p.userId === me).map((p) => p.itemId));
  const padBtn = (v: [number, number], label: string, cls: string, glyph: string) => (
    <button type="button" className={`gw-pad-btn ${cls}`} aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); pad.current = v; }} onPointerUp={() => (pad.current = null)} onPointerLeave={() => (pad.current = null)} onPointerCancel={() => (pad.current = null)}>
      {glyph}
    </button>
  );
  const houseNames = profiles.slice(0, HOUSES.length).map((p) => `${p.name.split(" ")[0]}'in evi`);

  return (
    <div className="gw">
      <div className="gw-bar">
        <span className="gw-where">
          {where.scope === "bahce" ? "🌳 Ortak bahçe" : visiting ? `🚪 ${ownerName}'in evi · ${roomName} · misafirsin` : `🏠 Evin · ${roomName}`}
        </span>
        <span className="gw-hint">W A S D ile yürü · kapılardan geç · E: envanter</span>
        {canEditHere && (
          <button type="button" className={`btn ${mode.kind === "edit" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode(mode.kind === "edit" ? { kind: "walk" } : { kind: "edit" })}>
            {mode.kind === "edit" ? "Bitir" : "Eşya kaldır"}
          </button>
        )}
        <button type="button" className={`btn ${invOpen ? "btn-primary" : "btn-ghost"}`} onClick={() => setInvOpen((v) => !v)} aria-expanded={invOpen}>🎒 Envanter</button>
      </div>

      <div className={`gw-stage${mode.kind !== "walk" ? " is-editing" : ""}`} ref={stage} onPointerMove={pointer} onPointerDown={onDown} onPointerLeave={() => (hover.current = null)}>
        <canvas ref={canvas} className="gw-canvas" role="img" aria-label={where.scope === "bahce" ? "Ortak bahçe" : "Ev"} />
        {(["cengiz", "aysenur", "duldul", "parrot"] as const).map((k) => (
          <span key={k} ref={(el) => { tagRefs.current[k] = el; }} className={`hall-tag is-${k}`} style={{ display: "none" }} aria-hidden="true">
            {k === "cengiz" ? "Cengiz" : k === "aysenur" ? "Ayşenur" : k === "duldul" ? "Düldül" : "Papağan"}
          </span>
        ))}
        {houseNames.map((n, k) => (
          <span key={n} ref={(el) => { tagRefs.current[`ev${k}`] = el; }} className="hall-tag is-house" style={{ display: "none" }} aria-hidden="true">{n}</span>
        ))}
        {mode.kind === "place" && <p className="gw-tip">{itemById.get(mode.itemId)?.name}: koymak için bir kareye dokun · Esc ile vazgeç</p>}
        {mode.kind === "edit" && <p className="gw-tip">Geri almak istediğin eşyaya dokun</p>}
        {msg && <p className="gw-msg" role="status">{msg}</p>}

        <section className={`card gw-inv${invOpen ? " is-open" : ""}`} aria-labelledby="envanter" onPointerDown={(e) => e.stopPropagation()} onPointerMove={(e) => e.stopPropagation()}>
          <div className="gw-inv-head">
            <h2 id="envanter">Envanter</h2>
            <button type="button" className="btn btn-quiet gw-inv-close" onClick={() => setInvOpen(false)} aria-label="Envanteri kapat">✕</button>
          </div>
          <div className="chips" role="tablist">
            <button type="button" role="tab" className="chip" aria-selected={tab === "oda"} onClick={() => setTab("oda")}>Ev eşyaları</button>
            <button type="button" role="tab" className="chip" aria-selected={tab === "bahce"} onClick={() => setTab("bahce")}>Bahçe eşyaları</button>
          </div>
          <p className="muted">{tab === "oda" ? "Ev eşyalarını kendi evinde istediğin odaya koyarsın." : "Bahçe eşyaları ortak bahçeye konur; ikiniz de görürsünüz."}</p>
          <ul className="gw-items">
            {ROOM_ITEMS.filter((it) => it.scope === tab).map((it) => {
              const locked = it.level > meP.level;
              const isPlaced = mine.has(it.id);
              const rightPlace = tab === where.scope && canEditHere;
              const row = placed.find((p) => p.userId === me && p.itemId === it.id);
              return (
                <li key={it.id} className={`gw-item${locked ? " is-locked" : ""}${mode.kind === "place" && mode.itemId === it.id ? " is-active" : ""}`}>
                  <PixelCanvas draw={(c, w, h, t) => drawItemPreview(c, w, h, it.id, t)} size={[48, 40]} scale={2} fps={locked ? 1 : 6} className="gw-item-icon" />
                  <div>
                    <b>{locked ? "???" : it.name}</b>
                    <small>{locked ? `🔒 Seviye ${it.level}` : isPlaced ? "Yerleştirildi" : `Lv ${it.level} · ${it.size[0]}×${it.size[1]}`}</small>
                  </div>
                  {!locked && !isPlaced && (
                    <button type="button" className="btn btn-primary" disabled={!rightPlace || busy}
                      title={rightPlace ? undefined : tab === "oda" ? "Önce kendi evine git" : "Önce bahçeye çık"}
                      onClick={() => { setMode({ kind: "place", itemId: it.id }); setInvOpen(false); }}>
                      Yerleştir
                    </button>
                  )}
                  {!locked && isPlaced && row && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => takeBack(row)}>Geri al</button>}
                </li>
              );
            })}
          </ul>
          {!(tab === where.scope && canEditHere) && <p className="muted gw-note">{tab === "oda" ? "Ev eşyası koymak için kendi evine dön." : "Bahçe eşyası koymak için evinin kapısından bahçeye çık."}</p>}
        </section>
      </div>

      <div className="gw-pad" aria-label="Yön tuşları">
        {padBtn([-1, -1], "Yukarı", "up", "▲")}
        {padBtn([-1, 1], "Sola", "left", "◀")}
        {padBtn([1, -1], "Sağa", "right", "▶")}
        {padBtn([1, 1], "Aşağı", "down", "▼")}
      </div>
    </div>
  );
}
