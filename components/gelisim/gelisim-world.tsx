"use client";

import { useEffect, useRef, useState } from "react";
import { PixelIcon } from "@/components/pixel-icon";
import { StudyDesk, type StudyTab } from "@/components/gelisim/study-desk";
import { api } from "@/lib/api-client";
import { type Anchor, type Cat, type Hero, type Theme, drawItemPreview, drawScene } from "@/lib/gelisim-scene";
import { type Origin, toTile } from "@/lib/iso";
import { formatClock } from "@/lib/slots";
import { isDesk, isShelf } from "@/lib/study";
import { CASTLE, CASTLE_ENTRY, FRONT_DOOR, type Floor, HOUSES, type Placed, SIZE, STAIRS, arrivalAt, atEntry, atGate, blockedSet, canPlace, castlePlan, footprint, gardenSolid, houseStep, maxCopies, roomAt, roomIn, sizeOf, stairsTarget, stepIn } from "@/lib/room";
import { ARMORY_STATIONS, CASTLE_DECOR, castleBlocked, castleInteractive } from "@/lib/castle";
import { type Equipment, NO_EQUIPMENT, sanitizeEquipment, toggleEquip } from "@/lib/equipment";
import { FIST, armorStats, spellStats, weaponStats } from "@/lib/combat-stats";
import { type Effect, type Fighter, type Target, attack, cast, newFighter, stepEffects, tick as tickFighter } from "@/lib/combat";
import { type Action, ACTION_TTL, actionHistory, captureAction, replayEffects, unseenActions } from "@/lib/combat-sync";
import { CombatHud, type HudSpell } from "@/components/gelisim/combat-hud";
import { TARGETS } from "@/lib/castle";
import { type GearKind } from "@/lib/gear";
import { ArmoryPanel } from "@/components/gelisim/armory-panel";
import { lastStormStrike, strikePower } from "@/lib/gelisim-storm";
import { ambientRunning, setMix, startAmbient, stopAmbient, thunder } from "@/lib/ambient";
import { CATS, type Cat as ItemCat, ROOM_ITEMS, type Scope, isFlat, itemById } from "@/lib/room-items";
import { TIERS } from "@/lib/scenes/hall";
import { levelOf, tierOf, xpToLevel } from "@/lib/xp";
import { XP_EVENT } from "@/components/xp-badge";

type Profile = { id: string; name: string; level: number; xp?: number };
type Where = { scope: "oda"; owner: string } | { scope: "bahce" } | { scope: "sato"; floor: Floor };
type Mode = { kind: "walk" } | { kind: "place"; itemId: string } | { kind: "edit" } | { kind: "rotate" };
type Remote = Hero & { userId: string; ti: number; tj: number; swingAt?: number };

const TARGET_HP = 300;

const whoOf = (name: string): Theme => (/ay[sş]enur/i.test(name) ? "aysenur" : "cengiz");
const look = (level: number) => { const t = TIERS[tierOf(level)]; return { outfit: t.outfit, tint: t.tint }; };
/** Görünüm: kuşanılmış zırh varsa onun kademesi, yoksa seviyenin kademesi; elde kuşanılmış silah */
const lookFor = (level: number, eq: Equipment | undefined) => {
  const a = eq?.armor ? armorStats(eq.armor) : null;
  const base = a ? { outfit: TIERS[a.tier].outfit, tint: TIERS[a.tier].tint } : look(level);
  return { ...base, gear: { weapon: eq?.weapon ?? null } };
};
const placeOf = (w: Where) => (w.scope === "oda" ? `ev:${w.owner}` : w.scope === "sato" && w.floor > 1 ? `sato:${w.floor}` : w.scope);
const floorOf = (w: Where): Floor => (w.scope === "sato" ? w.floor : 1);
const SATO_SEATS: Record<Floor, Placed[]> = { 1: castleInteractive(1), 2: castleInteractive(2), 3: castleInteractive(3) };
const SATO_CUSHION = CASTLE_DECOR.find((d) => d.id === "kedi-minderi");
const SOUND_KEY = "gelisim-firtina-sesi";
// sahnedeki isim etiketleri (çizimden gelen noktalara oturur)
const TAGS = { cengiz: "Cengiz", aysenur: "Ayşenur", duldul: "Düldül", parrot: "Papağan", gandalf: "Gandalf", gimli: "Gimli", legolas: "Legolas", jon: "Jon Snow", sato: "Şato" };
const leave = (place: string) => { void fetch("/api/gelisim/konum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ here: false, place }), keepalive: true }); };
const SPEED = 3.2; // kare / saniye

// İstanbul saatine göre gece: 21-05 tam gece, akşam ve sabah geçişli
function nightNow(): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 12) + Number(parts.find((p) => p.type === "minute")?.value ?? 0) / 60;
  if (h >= 21 || h < 5) return 1;
  if (h >= 18) return (h - 18) / 3;
  if (h < 8) return 1 - (h - 5) / 3;
  return 0;
}

// oturulabilen eşyalar: oturuş yüksekliği (piksel), eşyanın kendi alanındaki yerler ve oturanın baktığı yön
// (yataklarda ayakların yönü; baş karşı tarafta). Yataklarda uzanılır; çift kişilik yatakta ve koltukta iki kişi yan yana.
type Seat = { lift: number; sleep?: boolean; slots: [number, number][]; face: [number, number] };
const seatOf = (id: string): Seat | null =>
  id === "yatak" ? { lift: 8, sleep: true, slots: [[1.08, 0.5]], face: [1, 0] }
  : id.startsWith("tek-yatak-") ? { lift: 7, sleep: true, slots: [[1.08, 0.5]], face: [1, 0] }
  : id.startsWith("cift-yatak-") ? { lift: 8, sleep: true, slots: [[1.08, 0.52], [1.08, 1.48]], face: [1, 0] }
  : id.startsWith("kose-koltuk-") ? { lift: 6, slots: [[0.6, 0.6], [1.5, 0.6], [2.4, 0.6]], face: [0, 1] }
  : id.startsWith("koltuk-") ? { lift: 6, slots: [[0.6, 0.6], [1.4, 0.6]], face: [0, 1] }
  : id.startsWith("berjer-") ? { lift: 6, slots: [[0.5, 0.6]], face: [0, 1] }
  : id.startsWith("sandalye-") || id.startsWith("calisma-sandalyesi-") ? { lift: 7, slots: [[0.5, 0.55]], face: [0, 1] }
  : id === "taht" ? { lift: 7, slots: [[0.55, 0.5]], face: [1, 0] }
  : id === "bank" || id.startsWith("bahce-banki-") ? { lift: 6, slots: [[0.6, 0.55], [1.4, 0.55]], face: [0, 1] }
  : null;
type Near = { kind: "sit" | "piano" | "mail" | "desk" | "shelf" | "stairs" | "station"; label: string; i: number; j: number; itemId?: string; to?: Floor; gearKind?: GearKind; p?: Placed };
const STATION_LABEL: Record<GearKind, string> = { Zırh: "Zırh askısı", Silah: "Silah rafı", Büyü: "Büyü kürsüsü" };
// masada oturulan yer (önü) ve oturanın baktığı yön (masaya doğru)
const deskSeat = (id: string): { slot: [number, number]; face: [number, number] } => {
  const w = itemById.get(id)?.size[0] ?? 1;
  return { slot: [w / 2, 1.42], face: [0, -1] };
};
// eşyanın kendi alanındaki bir nokta ve yön, dönüşe göre dünyada
function placeLocal(p: Placed, x: number, y: number): [number, number] {
  const [W, D] = itemById.get(p.itemId)?.size ?? [1, 1], r = (p.rot ?? 0) & 3;
  if (r & 2) { x = W - x; y = D - y; }
  return r & 1 ? [p.tx + y, p.ty + x] : [p.tx + x, p.ty + y];
}
function faceDir(p: Placed, [a, b]: [number, number]): 1 | -1 {
  const r = (p.rot ?? 0) & 3;
  if (r & 2) { a = -a; b = -b; }
  if (r & 1) [a, b] = [b, a];
  return a - b >= 0 ? 1 : -1;
}
const depthOfPlaced = (p: Placed) => { const [w, d] = sizeOf(p.itemId, p.rot); return p.tx + w - 0.5 + p.ty + d - 0.5; };
/** Canlı konumda gönderilen duruş */
const poseOf = (h: Hero, desk: StudyTab | null) =>
  !h.sit ? null : `${desk ? (desk === "kitaplik" ? "read" : "desk") : h.sit.sleep ? "lie" : "sit"}:${Math.round(h.sit.lift)}`;

/** Kalkış: oturmadan önce durulan boş kareye dönülür */
function standUp(h: Hero) {
  const from = h.sit?.from;
  if (from) { h.i = from[0]; h.j = from[1]; }
  h.sit = undefined;
}

// piyano: kısa bir melodi (dokunuştan sonra çaldığı için tarayıcı izin verir)
function tune() {
  try {
    const a = new AudioContext();
    [523, 587, 659, 784, 659, 880].forEach((f, k) => {
      const at = a.currentTime + k * 0.18, o = a.createOscillator(), g = a.createGain();
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.08, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      o.connect(g).connect(a.destination); o.start(at); o.stop(at + 0.55);
    });
    window.setTimeout(() => void a.close(), 2000);
  } catch { /* ses yoksa sessiz çalar */ }
}
// W A S D ve oklar ekran yönleridir: yukarı = i ve j birlikte azalır
const KEYS: Record<string, [number, number]> = {
  w: [-1, -1], arrowup: [-1, -1], s: [1, 1], arrowdown: [1, 1], a: [-1, 1], arrowleft: [-1, 1], d: [1, -1], arrowright: [1, -1],
};

// Gelişim: kendi evin (altı oda) ve ortak bahçe. Kamera seni izler; envanterden eşya koyarsın; aynı yerdekiler birbirini canlı görür.
// startIn: "bahce" ise oyun kişinin kapısının önünde, bahçede başlar
export function GelisimWorld({ me, profiles, initialPlaced, startIn = "oda", initialStudyTimer = null, initialEquipment = {} }: {
  me: string; profiles: Profile[]; initialPlaced: Placed[]; startIn?: Scope; initialStudyTimer?: { label: string; startedAt: string } | null; initialEquipment?: Record<string, Equipment>;
}) {
  const meP = profiles.find((p) => p.id === me)!;
  const [xp, setXp] = useState(() => meP.xp ?? xpToLevel(meP.level));
  const progress = levelOf(xp), playerLevel = progress.level;
  const [toolsOpen, setToolsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1), fitRef = useRef<() => void>(() => {});
  const shortcutRef = useRef<(key: string) => void>(() => {});
  const modalRef = useRef(false);
  const changeZoom = (value: number) => {
    const next = Math.round(Math.max(0.7, Math.min(1.3, value)) * 1000) / 1000;
    zoomRef.current = next; setZoom(next); fitRef.current();
  };
  useEffect(() => { setXp(meP.xp ?? xpToLevel(meP.level)); }, [meP.xp, meP.level]);
  useEffect(() => {
    const onXp = (event: Event) => { const delta = Number((event as CustomEvent).detail); if (Number.isFinite(delta)) setXp((value) => Math.max(0, value + delta)); };
    window.addEventListener(XP_EVENT, onXp);
    return () => window.removeEventListener(XP_EVENT, onXp);
  }, []);
  const myDoor = HOUSES[Math.min(Math.max(0, profiles.findIndex((p) => p.id === me)), HOUSES.length - 1)].door;
  const [where, setWhere] = useState<Where>(startIn === "bahce" ? { scope: "bahce" } : { scope: "oda", owner: me });
  const [placed, setPlaced] = useState(initialPlaced);
  const [mode, setMode] = useState<Mode>({ kind: "walk" });
  const [tab, setTab] = useState<Scope>("oda");
  const [catFilter, setCatFilter] = useState<ItemCat | "Tümü">("Tümü");
  const [q, setQ] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [roomName, setRoomName] = useState("Giriş holü");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [near, setNear] = useState<Near | null>(null);
  const [rot, setRot] = useState(0); // yerleştirilecek eşyanın yönü
  const [unread, setUnread] = useState(0);
  const [mailOpen, setMailOpen] = useState(false);
  // çalışma odası: masa ve kitaplık paneli, çalışan sayaç
  const [study, setStudy] = useState<StudyTab | null>(null);
  const [studyTimer, setStudyTimer] = useState(initialStudyTimer);
  const [clock, setClock] = useState(0);
  // fırtına sesi: tarayıcı ancak dokunuşla başlatır; tercih hatırlanır
  const [sound, setSound] = useState(false);
  // kuşanılanlar (kişi kimliğine göre); diğer kişininki konum eşitlemesiyle güncellenir
  const [equipment, setEquipment] = useState<Record<string, Equipment>>(initialEquipment);
  const myEq = equipment[me] ?? NO_EQUIPMENT;
  const [armory, setArmory] = useState<GearKind | null>(null);
  const [equipBusy, setEquipBusy] = useState(false);
  // tam ekran: tarayıcının tam ekranı; desteklenmezse sayfayı kaplayan yerleşim
  const root = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState<"off" | "native" | "page">("off");
  const fullRef = useRef(full);
  const fullTried = useRef(false); // yalnız ilk tık tam ekrana geçirir
  const stairLock = useRef<{ until: number; i: number; j: number } | null>(null); // kat değişince merdiven kısa süre kilitli
  fullRef.current = full;
  const enterFull = async () => {
    const el = root.current;
    if (!el) return;
    try {
      if (!el.requestFullscreen) throw new Error("desteklenmiyor");
      await el.requestFullscreen({ navigationUI: "hide" });
      setFull("native");
    } catch { setFull("page"); }
  };
  const exitFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    setFull("off");
  };
  // dövüş: can, mana, efektler, talim hedefleri; gösterge saniyede 10 kez yenilenir
  const fighter = useRef<Fighter>(newFighter(playerLevel, initialEquipment[me] ?? NO_EQUIPMENT));
  const effects = useRef<Effect[]>([]);
  const targets = useRef<Target[]>(TARGETS.map((t) => ({ id: t.id, i: t.i, j: t.j, hp: TARGET_HP, maxHp: TARGET_HP, hitAt: -9 })));
  const recentActions = useRef<Action[]>([]);
  const lastActionAt = useRef(0);
  const remoteSeen = useRef<Record<string, Set<number>>>({});
  const remoteEffects = useRef<Effect[]>([]);
  const shareAction = (kind: Action["kind"], id: string, fx: Effect[]) => {
    const at = Math.max(Date.now(), lastActionAt.current + 1);
    lastActionAt.current = at;
    recentActions.current = [...recentActions.current.filter((a) => at - a.at < ACTION_TTL), captureAction(kind, id, at, fx)].slice(-32);
  };
  const eqRef = useRef(myEq);
  eqRef.current = myEq;
  const [hud, setHud] = useState({ hp: fighter.current.hp, maxHp: fighter.current.maxHp, mana: fighter.current.mana, maxMana: fighter.current.maxMana, shield: 0, spells: [] as HudSpell[] });
  // masa başında oturuyoruz: avatar masada, sayaç açıkken odadan çıkılmaz
  const [atDesk, setAtDesk] = useState<StudyTab | null>(null);
  const zoomed = atDesk === "masa";
  const beforeDeskZoom = useRef<number | null>(null);
  useEffect(() => {
    if (zoomed) { beforeDeskZoom.current = zoomRef.current; changeZoom(Math.max(zoomRef.current, 1.15)); }
    else if (beforeDeskZoom.current !== null) { changeZoom(beforeDeskZoom.current); beforeDeskZoom.current = null; }
  }, [zoomed]);
  const [partnerStudy, setPartnerStudy] = useState<{ label: string; startedAt: string; reading: boolean } | null>(null);

  const hero = useRef<Hero>({ who: whoOf(meP.name), i: startIn === "bahce" ? myDoor.i + 0.5 : 3, j: startIn === "bahce" ? myDoor.j + 1.4 : 2.5, dir: 1, dist: 0, moving: false, ...lookFor(playerLevel, initialEquipment[me]) });
  const keys = useRef(new Set<string>());
  const pad = useRef<[number, number] | null>(null);
  const hover = useRef<[number, number] | null>(null); // tuval pikseli
  const others = useRef<Remote[]>([]);
  const cat = useRef<Cat & { goal: [number, number]; wait: number }>({ i: 14, j: 28, dir: 1, dist: 0, moving: false, goal: [14, 28], wait: 2 });
  const fade = useRef<{ t: number; to: Where | null; spawn: [number, number] } | null>(null);
  const cam = useRef<Origin & { snap: boolean }>({ ox: 0, oy: 0, snap: true });
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tagRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const nearRef = useRef<Near | null>(null);
  const music = useRef<{ i: number; j: number; t0: number } | null>(null);
  const night = useRef(nightNow());
  const live = useRef({ where, placed, mode, rot, sound });
  live.current = { where, placed, mode, rot, sound };
  const liveUnread = useRef(0);
  liveUnread.current = unread;
  const deskSit = useRef<StudyTab | null>(null); // oyun döngüsü için atDesk'in kopyası
  const studyLock = useRef(false); // masa başında ve sayaç açık: yürünmez
  const locked = !!studyTimer && !!atDesk;
  studyLock.current = locked;

  // J / sol tık / ⚔: silah vuruşu (yalnız 2. kattaki hedefler hasar alır)
  const nowSec = () => performance.now() / 1000;
  const doAttack = () => {
    const h = hero.current, wh = live.current.where;
    if (fade.current || deskSit.current || modalRef.current) return; // masada çalışırken dövüşülmez (odak kilidi bozulmasın)
    if (h.sit) standUp(h);
    const eq = eqRef.current;
    const fx = attack(fighter.current, eq, { i: h.i, j: h.j, dir: h.dir }, wh.scope === "sato" && wh.floor === 2 ? targets.current : [], nowSec());
    if (!fx.length) return;
    effects.current.push(...fx);
    shareAction("vurus", eq.weapon ?? "yumruk", fx);
  };
  // 1–4: kuşanılan büyüler
  const doCast = (slot: number) => {
    const h = hero.current, wh = live.current.where, eq = eqRef.current;
    if (fade.current || deskSit.current || modalRef.current || !eq.spells[slot]) return;
    if (h.sit) standUp(h);
    const partnerNear = others.current.some((r) => Math.hypot(r.i - h.i, r.j - h.j) < 2.2);
    const fx = cast(fighter.current, eq, slot, { i: h.i, j: h.j, dir: h.dir }, wh.scope === "sato" && wh.floor === 2 ? targets.current : [], nowSec(), partnerNear);
    if (!fx.length) { const s = spellStats(eq.spells[slot]); if (s && fighter.current.mana < s.mana) setMsg("Mana yetmiyor."); return; }
    effects.current.push(...fx);
    shareAction("buyu", eq.spells[slot], fx);
  };

  // F / ✋: yakındaki şeyle etkileşim
  const interact = () => {
    const h = hero.current, nb = nearRef.current;
    if (h.sit && deskSit.current) { setStudy(deskSit.current); return; } // masadayken F paneli açar
    if (h.sit) { standUp(h); return; }
    if (!nb) return;
    // oturmadan önceki boş kare saklanır: eşyanın kareleri dolu sayıldığından kalkınca oraya dönülür.
    // Birden çok yeri olan eşyada (çift kişilik yatak, koltuk) diğerinin oturmadığı en yakın yer seçilir.
    if (nb.kind === "sit" && nb.p) {
      const seat = seatOf(nb.p.itemId)!;
      const spots = seat.slots.map(([x, y]) => placeLocal(nb.p!, x, y))
        .filter(([a, b]) => !others.current.some((r) => r.sit && Math.hypot(r.ti - a, r.tj - b) < 0.45))
        .sort((u, v) => Math.hypot(u[0] - h.i, u[1] - h.j) - Math.hypot(v[0] - h.i, v[1] - h.j));
      if (!spots.length) { setMsg(seat.sleep ? "Yatakta yer kalmadı." : "Burası dolu."); return; }
      h.sit = { lift: seat.lift, sleep: seat.sleep, from: [h.i, h.j], at: performance.now() / 1000, depth: depthOfPlaced(nb.p) + 0.02 };
      [h.i, h.j] = spots[0]; h.dir = faceDir(nb.p, seat.face); h.moving = false;
    }
    else if (nb.kind === "piano") { music.current = { i: nb.i, j: nb.j, t0: performance.now() / 1000 }; tune(); }
    else if (nb.kind === "mail") setMailOpen(true);
    else if (nb.kind === "station" && nb.gearKind) setArmory(nb.gearKind);
    else if (nb.kind === "stairs" && nb.to && !fade.current) {
      const from = floorOf(live.current.where);
      fade.current = { t: 0, to: { scope: "sato", floor: nb.to }, spawn: arrivalAt(nb.to, nb.to > from) };
    }
    else if (nb.kind === "desk" || nb.kind === "shelf") {
      // masaya otur: avatar masanın önüne geçip ona döner (ön kare doluysa durduğu yerde), panel açılır
      const tab: StudyTab = nb.kind === "desk" ? "masa" : "kitaplik";
      const from: [number, number] = [h.i, h.j];
      if (nb.kind === "desk" && nb.p) {
        const ds = deskSeat(nb.p.itemId), [si, sj] = placeLocal(nb.p, ...ds.slot);
        const wh = live.current.where, here = scenePlaced(wh, live.current.placed);
        const okSpot = wh.scope === "oda" && !blockedSet("oda", here).has(`${Math.floor(si)},${Math.floor(sj)}`)
          && roomAt(Math.floor(si), Math.floor(sj))?.name === roomAt(Math.floor(h.i), Math.floor(h.j))?.name;
        if (okSpot) { h.i = si; h.j = sj; }
        h.dir = faceDir(nb.p, ds.face);
      } else {
        const sx = (nb.i - h.i) - (nb.j - h.j); if (sx !== 0) h.dir = sx > 0 ? 1 : -1;
      }
      h.moving = false; h.sit = { lift: 4, from, at: performance.now() / 1000 };
      deskSit.current = tab; setAtDesk(tab); setStudy(tab);
    }
  };
  const leaveDesk = () => {
    if (studyLock.current) return;
    standUp(hero.current); deskSit.current = null; setAtDesk(null);
  };

  const seatDepth = (i: number, j: number) => {
    const fi = Math.floor(i), fj = Math.floor(j);
    const under = scenePlaced(live.current.where, live.current.placed).filter((p) => !isFlat(p.itemId) && footprint(p.itemId, p.tx, p.ty, p.rot).some(([a, b]) => a === fi && b === fj));
    return under.length ? Math.max(...under.map(depthOfPlaced)) + 0.02 : undefined;
  };
  const themeOf = (id: string) => whoOf(profiles.find((p) => p.id === id)?.name ?? "");
  const scenePlaced = (w: Where, all: Placed[]) => (w.scope === "sato" ? [] : all.filter((p) => (w.scope === "bahce" ? p.scope === "bahce" : p.scope === "oda" && p.userId === w.owner)));
  const ownerName = where.scope === "oda" ? profiles.find((p) => p.id === where.owner)?.name.split(" ")[0] ?? "" : "";
  const visiting = where.scope === "oda" && where.owner !== me;
  const canEditHere = where.scope === "bahce" || (where.scope === "oda" && !visiting);
  const inside = (p: Placed, [hi, hj]: [number, number]) => {
    if (!itemById.get(p.itemId)) return false;
    const [w, d] = sizeOf(p.itemId, p.rot);
    return hi >= p.tx && hi < p.tx + w && hj >= p.ty && hj < p.ty + d;
  };
  const camOrigin = (): Origin => ({ ox: Math.round(cam.current.ox), oy: Math.round(cam.current.oy) });

  // Kısayollar güncel eylemlere gider; yazı yazarken ve pencerelerde oyun girdisi alınmaz.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey || e.altKey || e.target instanceof Element && e.target.closest("input,textarea,select,[contenteditable=true]")) return;
      if (k === "escape") { if (!e.repeat) shortcutRef.current(k); return; }
      if (modalRef.current) return;
      if (["r", "x", "t", "v", "m", "e", "g", "h", "b", "+", "=", "-", "0"].includes(k)) {
        e.preventDefault(); if (!e.repeat) shortcutRef.current(k); return;
      }
      if (k === "f" || k === " ") { e.preventDefault(); if (!e.repeat) interact(); }
      if (k === "j") { e.preventDefault(); doAttack(); }
      if (/^[1-4]$/.test(k)) { e.preventDefault(); doCast(Number(k) - 1); }
      if (KEYS[k]) {
        keys.current.add(k); if (k.startsWith("arrow")) e.preventDefault();
        if (studyLock.current && !e.repeat) setMsg("Çalışırken masadan kalkılmaz: önce sayacı bitir.");
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);

  // canlı konum: yarım saniyede bir; aynı yerdeki (bahçe ya da aynı ev) diğerini getirir
  useEffect(() => {
    const place = placeOf(where);
    let stop = false, inFlight = false;
    const joinedAt = Date.now();
    remoteSeen.current = {};
    const tick = async () => {
      if (stop || inFlight) return;
      inFlight = true;
      const h = hero.current;
      const sent = actionHistory(recentActions.current, Date.now());
      try {
        const res = await api<{
          others: { userId: string; x: number; y: number; dir: number; moving: boolean; equipment?: Equipment; action?: Action | null; pose?: string | null; focus?: boolean }[];
          unread?: number; timers?: { userId: string; label: string; startedAt: string; reading: boolean }[];
        }>("/api/gelisim/konum", { body: { here: true, place, x: h.i, y: h.j, dir: h.dir, moving: h.moving, action: sent ?? undefined, pose: poseOf(h, deskSit.current) } });
        if (stop) return;
        setUnread(res.unread ?? 0);
        const pt = res.timers?.[0];
        setPartnerStudy((cur) => (pt ? (cur?.startedAt === pt.startedAt && cur.label === pt.label ? cur : { label: pt.label, startedAt: pt.startedAt, reading: pt.reading }) : null));
        others.current = res.others.map((o) => {
          const prev = others.current.find((p) => p.userId === o.userId);
          const prof = profiles.find((p) => p.id === o.userId);
          // duruş: "lie:8" uzanıyor, "sit:6" oturuyor, "desk:4" masada, "read:4" kitaplıkta
          const [kind, lift] = (o.pose ?? "").split(":");
          const seated = !o.moving && ["sit", "lie", "desk", "read"].includes(kind);
          const sit = seated ? { lift: Number(lift) || 0, sleep: kind === "lie", at: prev?.sit ? prev.sit.at : performance.now() / 1000, depth: seatDepth(o.x, o.y) } : undefined;
          const study = seated && (kind === "desk" || kind === "read") ? { reading: kind === "read", focus: !!o.focus } : undefined;
          // karşının yeni saldırısı: savuruşu ya da büyüsü burada da oynar (hasar yalnız kendi ekranında)
          let swingAt = prev?.swingAt;
          const seen = remoteSeen.current[o.userId] ??= new Set<number>();
          for (const act of unseenActions(o.action, seen, joinedAt)) {
            const now = nowSec();
            if (act.kind === "vurus") swingAt = now;
            remoteEffects.current.push(...replayEffects(act, now));
          }
          return { userId: o.userId, who: whoOf(prof?.name ?? ""), ...lookFor(prof?.level ?? 1, sanitizeEquipment(o.equipment, prof?.level ?? 1)), i: prev?.i ?? o.x, j: prev?.j ?? o.y, ti: o.x, tj: o.y, dir: o.dir === -1 ? -1 : 1, dist: prev?.dist ?? 0, moving: o.moving, swingAt, sit, study };
        });
      } catch { /* bağlantı koparsa kısa olay geçmişiyle yeniden dener */ }
      finally { inFlight = false; }
    };
    tick();
    const id = window.setInterval(tick, 500);
    const onHide = () => leave(place);
    window.addEventListener("pagehide", onHide);
    return () => { stop = true; window.clearInterval(id); window.removeEventListener("pagehide", onHide); others.current = []; remoteEffects.current = []; };
  }, [where, profiles]);
  useEffect(() => () => leave(placeOf(live.current.where)), []);

  useEffect(() => { const id = window.setInterval(() => (night.current = nightNow()), 60_000); return () => window.clearInterval(id); }, []);

  // tuval sahne alanını doldurur: geniş ekranda 4, masaüstünde 3, telefonda 2 kat büyütülmüş piksel
  useEffect(() => {
    const el = stage.current!, cv = canvas.current!;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const k = (r.width >= 1300 ? 4 : r.width >= 700 ? 3 : 2) * zoomRef.current;
      cv.width = Math.max(120, Math.ceil(r.width / k)); cv.height = Math.max(100, Math.ceil(r.height / k));
      cv.getContext("2d")!.imageSmoothingEnabled = false;
      cam.current.snap = true;
    };
    fitRef.current = fit; fit();
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.deltaY === 0) return;
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1);
      changeZoom(zoomRef.current * Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.001));
    };
    cv.addEventListener("wheel", wheel, { passive: false });
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => { ro.disconnect(); cv.removeEventListener("wheel", wheel); fitRef.current = () => {}; };
  }, []);

  // oyun döngüsü: bir kez kurulur, değişen durumu live.current üzerinden okur
  useEffect(() => {
    const cv = canvas.current!, c = cv.getContext("2d")!;
    let raf = 0, last = 0, lastRoom = "", heard = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0); last = t;
      const { where: wh, placed: all, mode: md, rot: pr } = live.current;
      const scope = wh.scope;
      const here = scenePlaced(wh, all);
      const { w, d } = SIZE[scope];
      const floor = floorOf(wh);
      const blocked = scope === "sato" ? castleBlocked(floor) : blockedSet(scope, here);
      const h = hero.current;

      let di = 0, dj = 0;
      if (!studyLock.current) {
        for (const k of keys.current) { const v = KEYS[k]; if (v) { di += v[0]; dj += v[1]; } }
        if (pad.current) { di += pad.current[0]; dj += pad.current[1]; }
      }
      const len = Math.hypot(di, dj);
      h.moving = len > 0 && !fade.current;
      if (h.moving && h.sit) { standUp(h); if (deskSit.current) { deskSit.current = null; setAtDesk(null); } }
      // masa başında: önünde defter/kitap, sayaç açıksa odak ışığı
      h.study = deskSit.current && h.sit ? { reading: deskSit.current === "kitaplik", focus: studyLock.current } : undefined;
      if (h.moving) {
        const step = (SPEED * dt) / len;
        const free = (i: number, j: number) => {
          const ci = Math.floor(i), cj = Math.floor(j), fi = Math.floor(h.i), fj = Math.floor(h.j);
          if (scope === "oda") {
            const atDoor = cj === FRONT_DOOR.j && i < 1;
            if (i < (atDoor ? -0.1 : 0.3) || j < 0.3 || i > w - 0.3 || j > d - 0.3) return false;
            // başka kareye geçerken aynı oda ya da kapı boşluğu olmalı
            if ((ci !== fi || cj !== fj) && ci >= 0 && !houseStep([fi, fj], [ci, cj])) return false;
          } else if (scope === "sato") {
            const atDoor = floor === 1 && atEntry(cj) && i < 1;
            if (i < (atDoor ? -0.1 : 0.3) || j < 0.3 || i > w - 0.3 || j > d - 0.3) return false;
            if ((ci !== fi || cj !== fj) && ci >= 0 && !stepIn(castlePlan(floor), [fi, fj], [ci, cj])) return false;
          } else {
            const atDoor = HOUSES.some((hs) => ci === hs.door.i && j > hs.door.j - 0.2 && j < hs.door.j + 0.5)
              || (atGate(ci) && j > CASTLE.j1 - 0.2 && j < CASTLE.j1 + 0.5);
            if (i < 0.3 || i > w - 0.3 || j > d - 0.3 || j < 0.3) return false;
            if (!atDoor && gardenSolid(ci, cj)) return false;
          }
          // dolu bir karenin içinde kalındıysa (ör. üstüne eşya kondu) dışarı yürünebilsin
          if (blocked.has(`${fi},${fj}`)) return ci !== fi || cj !== fj ? !blocked.has(`${ci},${cj}`) : true;
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
        } else if (scope === "sato" && floor === 1 && h.i < 0.1 && atEntry(Math.floor(h.j))) {
          // şatodan çıkış: bahçede şato kapısının önü
          fade.current = { t: 0, to: { scope: "bahce" }, spawn: [CASTLE.gate.i + CASTLE.gate.width / 2, CASTLE.j1 + 1.4] };
        } else if (scope === "bahce") {
          const k = HOUSES.findIndex((hs) => Math.floor(h.i) === hs.door.i && h.j < hs.door.j + 0.15);
          const owner = profiles[k]?.id;
          if (owner) fade.current = { t: 0, to: { scope: "oda", owner }, spawn: [1.4, FRONT_DOOR.j + 0.5] };
          else if (atGate(Math.floor(h.i)) && h.j < CASTLE.j1 + 0.15) fade.current = { t: 0, to: { scope: "sato", floor: 1 }, spawn: [1.4, CASTLE_ENTRY.j + CASTLE_ENTRY.width / 2] };
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
          recentActions.current = []; remoteEffects.current = [];
          effects.current = []; // uçuştaki mermiler yeni sahneye taşınmaz
          stairLock.current = { until: t + 0.8, i: h.i, j: h.j };
        }
        darken = f.t < 0.25 ? f.t / 0.25 : Math.max(0, 1 - (f.t - 0.25) / 0.25);
        if (!f.to && f.t >= 0.5) fade.current = null;
      }
      const cur = live.current.where;
      const rn = cur.scope === "oda" ? roomAt(Math.floor(h.i), Math.floor(h.j))?.name ?? "" : cur.scope === "sato" ? roomIn(castlePlan(cur.floor), Math.floor(h.i), Math.floor(h.j))?.name ?? "" : "Bahçe";
      if (rn && rn !== lastRoom) { lastRoom = rn; setRoomName(rn); }

      // kamera: karakteri yumuşakça izler
      const tx = cv.width / 2 - (h.i - h.j) * 8, ty = cv.height / 2 - (h.i + h.j) * 4 + 14;
      const cc = cam.current;
      if (cc.snap) { cc.ox = tx; cc.oy = ty; cc.snap = false; } else { const k = 1 - Math.pow(0.0015, dt); cc.ox += (tx - cc.ox) * k; cc.oy += (ty - cc.oy) * k; }
      const o = camOrigin();

      // yakındaki etkileşim: oturulacak eşya, piyano ya da posta kutusu
      let nb: Near | null = null, best = 1.3;
      if (h.sit && deskSit.current) {
        nb = deskSit.current === "masa" ? { kind: "desk", label: "Masayı aç", i: h.i, j: h.j } : { kind: "shelf", label: "Kitaplığı aç", i: h.i, j: h.j };
      } else if (!h.sit) {
        for (const p of cur.scope === "sato" ? SATO_SEATS[cur.floor] : scenePlaced(cur, all)) {
          if (!itemById.get(p.itemId)) continue;
          const [sw, sd] = sizeOf(p.itemId, p.rot);
          const ci = p.tx + sw / 2, cj = p.ty + sd / 2, dd = Math.hypot(ci - h.i, cj - h.j);
          if (dd >= best + Math.max(sw, sd) / 2) continue;
          if (seatOf(p.itemId)) { nb = { kind: "sit", label: seatOf(p.itemId)!.sleep ? "Uzan" : "Otur", i: ci, j: cj, itemId: p.itemId, p }; best = dd; }
          else if (p.itemId.startsWith("piyano-")) { nb = { kind: "piano", label: "Piyano çal", i: ci, j: cj }; best = dd; }
          else if (isDesk(p.itemId)) { nb = { kind: "desk", label: "Masaya otur", i: ci, j: cj, itemId: p.itemId, p }; best = dd; }
          else if (isShelf(p.itemId)) { nb = { kind: "shelf", label: "Kitaplığı aç", i: ci, j: cj }; best = dd; }
        }
        // zırh odası istasyonları: yanında F ile o türün listesi açılır
        if (cur.scope === "sato" && cur.floor === 3) for (const st of ARMORY_STATIONS) {
          const dd = Math.hypot(st.i - h.i, st.j - h.j);
          if (dd < 1.7 && dd < best + 0.3) { nb = { kind: "station", label: STATION_LABEL[st.kind], i: st.i, j: st.j, gearKind: st.kind }; best = dd; }
        }
        // merdiven: önünde F ile kat değişir
        if (cur.scope === "sato") for (const st of STAIRS) {
          if (st.floor !== cur.floor) continue;
          const to = stairsTarget(cur.floor, st.dir), dd = Math.hypot(st.spawn[0] - h.i, st.spawn[1] - h.j);
          const lock = stairLock.current, locked = !!lock && (t < lock.until || Math.hypot(h.i - lock.i, h.j - lock.j) < 0.6);
          if (lock && !locked) stairLock.current = null;
          if (to && !locked && dd < 1.6 && dd < best + 0.3) { nb = { kind: "stairs", label: st.dir === "up" ? `Yukarı çık (${to}. kat)` : `Aşağı in (${to}. kat)`, i: st.i + 1, j: st.j + 1, to }; best = dd; }
        }
        if (cur.scope === "bahce") HOUSES.forEach((hs) => {
          const mi = hs.door.i + 1.6, mj = hs.door.j + 0.6, dd = Math.hypot(mi - h.i, mj - h.j);
          if (dd < 1.4 && dd < best + 0.2) { nb = { kind: "mail", label: "Posta kutusu", i: mi, j: mj }; best = dd; }
        });
      }
      if ((nb?.label ?? null) !== (nearRef.current?.label ?? null)) setNear(nb);
      nearRef.current = nb;

      // Düldül: evde minderi varsa orada uyur; bahçede dolaşır, yakındaki boş bir kareye yürür, biraz oturur
      let catState: Cat | null = null;
      const cushion = cur.scope === "oda" ? scenePlaced(cur, all).find((p) => p.itemId === "kedi-minderi") : undefined;
      if (cushion) catState = { i: cushion.tx + 0.5, j: cushion.ty + 0.6, dir: -1, dist: 0, moving: false, sleep: true };
      if (cur.scope === "sato" && cur.floor === 1 && SATO_CUSHION) catState = { i: SATO_CUSHION.tx + 0.5, j: SATO_CUSHION.ty + 0.6, dir: -1, dist: 0, moving: false, sleep: true };
      if (cur.scope === "bahce") {
        const k = cat.current;
        const gi = k.goal[0] + 0.5 - k.i, gj = k.goal[1] + 0.5 - k.j, gl = Math.hypot(gi, gj);
        if (gl < 0.1) {
          k.moving = false; k.wait -= dt;
          if (k.wait <= 0) {
            for (let tries = 0; tries < 10; tries++) {
              const a = Math.floor(k.i) - 4 + Math.floor(Math.random() * 9), b = Math.floor(k.j) - 4 + Math.floor(Math.random() * 9);
              if (a > 0 && b > CASTLE.j1 + 1 && a < SIZE.bahce.w - 1 && b < SIZE.bahce.d - 1 && !gardenSolid(a, b) && !blocked.has(`${a},${b}`)) { k.goal = [a, b]; break; }
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
        const [sw, sd] = sizeOf(md.itemId, pr);
        const gx = Math.floor(hv[0] - (sw - 1) / 2), gy = Math.floor(hv[1] - (sd - 1) / 2);
        const around = cur.scope === "oda" ? here : all.filter((p) => p.scope === "bahce");
        ghost = { itemId: md.itemId, tx: gx, ty: gy, rot: pr, ok: cur.scope !== "sato" && canPlace(cur.scope, md.itemId, gx, gy, around, pr) };
      } else if (hv && (md.kind === "edit" || md.kind === "rotate")) {
        pick = here.find((p) => p.userId === me && inside(p, hv))?.id ?? null;
      }

      // dövüş: can/mana dolar, mermiler uçar, savuruş ilerler
      const fgt = fighter.current;
      tickFighter(fgt, dt, t);
      effects.current = stepEffects(effects.current, cur.scope === "sato" && cur.floor === 2 ? targets.current : [], t);
      remoteEffects.current = stepEffects(remoteEffects.current, cur.scope === "sato" && cur.floor === 2 ? targets.current : [], t);
      const wpn = (eqRef.current.weapon && weaponStats(eqRef.current.weapon)) || FIST, since = t - fgt.comboAt;
      h.gear = { weapon: eqRef.current.weapon, swing: since >= 0 && since < wpn.cooldown ? since / wpn.cooldown : 0 };
      h.shield = fgt.shield > 0;
      for (const r of others.current) if (r.gear) r.gear = { ...r.gear, swing: r.swingAt !== undefined && t - r.swingAt < 0.35 ? (t - r.swingAt) / 0.35 : 0 };
      const targetState = cur.scope === "sato" && cur.floor === 2
        ? Object.fromEntries(targets.current.map((tg) => [tg.id, { hit: Math.max(0, 1 - (t - tg.hitAt) / 0.3), hp: tg.hp / tg.maxHp }])) : undefined;

      const anchors = drawScene(c, t, {
        scope: cur.scope, cam: o, theme: cur.scope === "oda" ? themeOf(cur.owner) : "cengiz",
        houseThemes: profiles.slice(0, HOUSES.length).map((p) => whoOf(p.name)),
        placed: scenePlaced(cur, all), heroes: [h, ...others.current], ghost, pick, cat: catState,
        night: night.current, music: music.current, floor: cur.scope === "sato" ? cur.floor : undefined,
        targetState, effects: [...effects.current, ...remoteEffects.current], now: t,
        mailHeart: liveUnread.current > 0 ? Math.max(0, profiles.findIndex((p) => p.id === me)) : null,
      });
      // gök gürültüsü: her şimşekten sonra bir kez, uzaklığa göre gecikmeli; içeride boğuk
      const strike = lastStormStrike(t);
      if (strike > heard) {
        if (heard > 0 && live.current.sound && ambientRunning() && t - strike < 0.5) {
          const p = strikePower(strike);
          thunder(0.3 + (1 - p) * 1.6, p * (cur.scope === "bahce" ? 1 : 0.55));
        }
        heard = strike;
      }
      if (deskSit.current === "masa" && h.sit) {
        const sx = o.ox + (h.i - h.j) * 8, sy = o.oy + (h.i + h.j) * 4 - 12;
        const g = c.createRadialGradient(sx, sy, 26, sx, sy, Math.max(70, cv.width * 0.42));
        g.addColorStop(0, "rgba(8,6,18,0)"); g.addColorStop(1, `rgba(8,6,18,${studyLock.current ? 0.86 : 0.7})`);
        c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
      }
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
    if (e.button !== 0) return;
    pointer(e);
    if (busy || !hover.current) return;
    const { where: wh, placed: all, mode: md } = live.current;
    const hv = toTile(camOrigin(), hover.current[0], hover.current[1]);
    const scope = wh.scope;
    if (md.kind === "walk" && !fullTried.current && fullRef.current === "off") { fullTried.current = true; void enterFull(); return; } // ilk tık: tam ekran
    if (md.kind === "walk") { doAttack(); return; } // yürürken tık: silah vuruşu
    if (scope === "sato") return; // şatoya eşya konmaz
    if (md.kind === "place") {
      const it = itemById.get(md.itemId)!;
      const pr = live.current.rot;
      const [sw, sd] = sizeOf(md.itemId, pr);
      const tx = Math.floor(hv[0] - (sw - 1) / 2), ty = Math.floor(hv[1] - (sd - 1) / 2);
      const around = scope === "oda" ? scenePlaced(wh, all) : all.filter((p) => p.scope === "bahce");
      if (!canPlace(scope, md.itemId, tx, ty, around, pr)) { setMsg("Buraya konamaz: kare dolu, iki odaya taşıyor ya da kapı önü."); return; }
      setBusy(true);
      try {
        const res = await api<{ item: Placed }>("/api/gelisim/esya", { body: { itemId: md.itemId, scope, tx, ty, rot: pr } });
        setPlaced((p) => [...p, res.item]);
        // daha konabiliyorsa yerleştirme açık kalır (ör. halı döşerken)
        const count = all.filter((q) => q.userId === me && q.itemId === md.itemId).length + 1;
        if (count >= maxCopies(md.itemId)) setMode({ kind: "walk" });
        setMsg(`${it.name} yerleştirildi.`);
      } catch (err) { setMsg(err instanceof Error ? err.message : "Yerleştirilemedi."); }
      setBusy(false);
    } else if (md.kind === "edit") {
      const p = scenePlaced(wh, all).find((q) => q.userId === me && inside(q, hv));
      if (p) await takeBack(p);
    } else if (md.kind === "rotate") {
      const p = scenePlaced(wh, all).find((q) => q.userId === me && inside(q, hv));
      if (!p) return;
      setBusy(true);
      try {
        const res = await api<{ item: Placed }>(`/api/gelisim/esya/${p.id}`, { method: "PATCH" });
        setPlaced((cur) => cur.map((q) => (q.id === p.id ? res.item : q)));
      } catch (err) { setMsg(err instanceof Error ? err.message : "Döndürülemedi."); }
      setBusy(false);
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

  useEffect(() => { if (!studyTimer && !partnerStudy) return; setClock(Date.now()); const id = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(id); }, [studyTimer, partnerStudy]);
  useEffect(() => { if (!msg) return; const id = window.setTimeout(() => setMsg(null), 2600); return () => window.clearTimeout(id); }, [msg]);
  useEffect(() => { setTab(where.scope === "bahce" ? "bahce" : "oda"); }, [where.scope]);

  // fırtına sesi: dışarıda tam yağmur, içeride boğuk; şatonun ateşli salonlarında çıtırtı
  const fireRoom = where.scope === "sato" && (roomName === "Şömine odası" || roomName === "Büyük salon");
  useEffect(() => {
    if (!sound) return;
    setMix({ rain: where.scope === "bahce" ? 1 : 0.4, fire: fireRoom ? 0.6 : 0, purr: 0 });
  }, [sound, where.scope, fireRoom]);
  useEffect(() => {
    let want = false;
    try { want = localStorage.getItem(SOUND_KEY) === "1"; } catch { /* tercih okunamadı */ }
    if (!want) return;
    // tarayıcı ilk dokunuşta izin verir: o ana kadar bekler
    const go = () => { startAmbient(0.7).then(() => setSound(true), () => undefined); window.removeEventListener("pointerdown", go); window.removeEventListener("keydown", go); };
    window.addEventListener("pointerdown", go); window.addEventListener("keydown", go);
    return () => { window.removeEventListener("pointerdown", go); window.removeEventListener("keydown", go); };
  }, []);
  useEffect(() => () => stopAmbient(), []);
  const toggleSound = async () => {
    const next = !sound;
    try { localStorage.setItem(SOUND_KEY, next ? "1" : "0"); } catch { /* kaydedilemedi */ }
    if (next) { try { await startAmbient(0.7); setSound(true); } catch { setMsg("Ses başlatılamadı."); } }
    else { stopAmbient(); setSound(false); }
  };

  // kendi görünümün kuşandıklarına göre güncellenir
  useEffect(() => {
    Object.assign(hero.current, lookFor(playerLevel, myEq));
    // yeni zırh ek can verir: oranlar korunur
    const old = fighter.current, f = newFighter(playerLevel, myEq);
    f.hp = Math.round(f.maxHp * (old.hp / old.maxHp)); f.mana = Math.min(f.maxMana, old.mana); f.spellReady = old.spellReady; f.shield = old.shield; f.shieldUntil = old.shieldUntil;
    fighter.current = f;
  }, [myEq, playerLevel]);
  useEffect(() => {
    const id = window.setInterval(() => {
      const f = fighter.current, now = nowSec(), eq = eqRef.current;
      setHud({
        hp: f.hp, maxHp: f.maxHp, mana: f.mana, maxMana: f.maxMana, shield: f.shield,
        spells: eq.spells.map((id2) => { const s = spellStats(id2); return { id: id2, mana: s?.mana ?? 0, cooldown: s?.cooldown ?? 1, readyIn: Math.max(0, (f.spellReady[id2] ?? 0) - now) }; }),
      });
    }, 100);
    return () => window.clearInterval(id);
  }, []);
  const onEquip = async (gearId: string) => {
    const before = myEq;
    setEquipment((all) => ({ ...all, [me]: sanitizeEquipment(toggleEquip(before, gearId), playerLevel) })); // iyimser
    setEquipBusy(true);
    try {
      const res = await api<{ equipment: Equipment }>("/api/gelisim/kusan", { body: { gearId } });
      setEquipment((all) => ({ ...all, [me]: res.equipment }));
    } catch (err) {
      setEquipment((all) => ({ ...all, [me]: before }));
      setMsg(err instanceof Error ? err.message : "Kuşanılamadı.");
    }
    setEquipBusy(false);
  };

  // tarayıcı tam ekranından Esc ile çıkınca; sayfa içi tam ekranda Esc ile çıkış
  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement && fullRef.current === "native") setFull("off"); };
    document.addEventListener("fullscreenchange", onChange);
    return () => { document.removeEventListener("fullscreenchange", onChange); };
  }, []);

  modalRef.current = !!(study || mailOpen || armory);
  useEffect(() => { if (study || mailOpen || armory || invOpen) { keys.current.clear(); pad.current = null; } }, [study, mailOpen, armory, invOpen]);
  const toggleRotate = () => {
    if (mode.kind === "place") setRot((v) => (v + 1) % 4);
    else if (canEditHere) setMode(mode.kind === "rotate" ? { kind: "walk" } : { kind: "rotate" });
  };
  const toggleRemove = () => { if (canEditHere) setMode(mode.kind === "edit" ? { kind: "walk" } : { kind: "edit" }); };
  const toggleStudy = () => setStudy((v) => v ? null : atDesk ?? "masa");
  const toggleFull = () => fullRef.current === "off" ? void enterFull() : exitFull();
  shortcutRef.current = (key) => {
    if (key === "escape") {
      if (armory) setArmory(null); else if (study) setStudy(null); else if (mailOpen) setMailOpen(false);
      else if (invOpen) setInvOpen(false); else if (helpOpen) setHelpOpen(false);
      else if (mode.kind !== "walk") setMode({ kind: "walk" }); else if (toolsOpen) setToolsOpen(false);
      else if (fullRef.current === "page") exitFull();
    } else if (key === "r") toggleRotate();
    else if (key === "x") toggleRemove();
    else if (key === "t") toggleStudy();
    else if (key === "v") toggleFull();
    else if (key === "m") void toggleSound();
    else if (key === "e") setInvOpen((v) => !v);
    else if (key === "h") setHelpOpen((v) => !v);
    else if (key === "b" && atDesk && !locked) leaveDesk();
    else if (key === "g" && !locked) window.location.assign("/maceralar");
    else if (key === "+" || key === "=") changeZoom(zoomRef.current + 0.05);
    else if (key === "-") changeZoom(zoomRef.current - 0.05);
    else if (key === "0") changeZoom(1);
  };

  const countOf = (id: string) => placed.filter((p) => p.userId === me && p.itemId === id).length;
  const padBtn = (v: [number, number], label: string, cls: string, glyph: string) => (
    <button type="button" className={`gw-pad-btn ${cls}`} aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); pad.current = v; }} onPointerUp={() => (pad.current = null)} onPointerLeave={() => (pad.current = null)} onPointerCancel={() => (pad.current = null)}>
      {glyph}
    </button>
  );
  const houseNames = profiles.slice(0, HOUSES.length).map((p) => `${p.name.split(" ")[0]}'in evi`);

  return (
    <div className={`gw${full !== "off" ? " is-full" : ""}`} ref={root}>
      <div className={`gw-stage${mode.kind !== "walk" ? " is-editing" : ""}`} ref={stage} onPointerMove={pointer} onPointerDown={onDown} onPointerLeave={() => (hover.current = null)}>
        <CombatHud {...hud} name={meP.name} progress={progress} onCast={doCast} />
        <nav className={`gw-tools${toolsOpen ? " is-open" : ""}`} aria-label="Oyun araçları" onPointerDown={(e) => e.stopPropagation()} onPointerMove={(e) => e.stopPropagation()}>
          <button type="button" className="btn gw-tools-toggle" aria-expanded={toolsOpen} aria-controls="gw-tool-list" aria-label="Oyun araçlarını aç veya kapat" onClick={() => setToolsOpen((v) => !v)}>☰ <span className="gw-tools-label">Araçlar</span></button>
          <div className="gw-tool-list" id="gw-tool-list">
            <p className="gw-tool-location">{where.scope === "bahce" ? "🌳 Ortak bahçe" : where.scope === "sato" ? `🏰 Şato · ${where.floor}. kat · ${roomName}` : visiting ? `🚪 ${ownerName}'in evi · ${roomName}` : `🏠 Evin · ${roomName}`}</p>
            <a className="btn btn-ghost gw-tool" href="/maceralar" aria-keyshortcuts="G" aria-disabled={locked} onClick={(e) => { if (locked) e.preventDefault(); }}><span>⚔ Maceralar</span><kbd>G</kbd></a>
            {canEditHere && <button type="button" className={`btn gw-tool ${mode.kind === "rotate" ? "btn-primary" : "btn-ghost"}`} aria-pressed={mode.kind === "rotate"} aria-keyshortcuts="R" onClick={toggleRotate} title="Eşyayı döndür (R)"><span>↻ {mode.kind === "rotate" ? "Döndürmeyi bitir" : "Döndür"}</span><kbd>R</kbd></button>}
            {canEditHere && <button type="button" className={`btn gw-tool ${mode.kind === "edit" ? "btn-primary" : "btn-ghost"}`} aria-pressed={mode.kind === "edit"} aria-keyshortcuts="X" onClick={toggleRemove} title="Eşyayı envantere geri al (X)"><span>{mode.kind === "edit" ? "Kaldırmayı bitir" : "Eşya kaldır"}</span><kbd>X</kbd></button>}
            <button type="button" className={`btn gw-tool ${studyTimer ? "btn-primary gw-study-chip" : "btn-ghost"}${locked ? " is-locked" : ""}`} aria-keyshortcuts="T" onClick={toggleStudy} title="Çalışma paneli (T)"><span>⏱ {studyTimer ? <>{studyTimer.label} <span className="num">{formatClock(Math.max(0, (clock - new Date(studyTimer.startedAt).getTime()) / 1000))}</span></> : "Çalışma"}</span><kbd>T</kbd></button>
            <button type="button" className="btn btn-ghost gw-tool" onClick={toggleFull} aria-keyshortcuts="V" aria-pressed={full !== "off"} title="Tam ekran (V)"><span>{full === "off" ? "⛶ Tam ekran" : "✕ Küçült"}</span><kbd>V</kbd></button>
            <button type="button" className={`btn gw-tool ${sound ? "btn-primary" : "btn-ghost"}`} onClick={() => void toggleSound()} aria-keyshortcuts="M" aria-pressed={sound} title="Yağmur ve gök gürültüsü (M)"><span>{sound ? "🔊" : "🔇"} Fırtına</span><kbd>M</kbd></button>
            <button type="button" className={`btn gw-tool ${invOpen ? "btn-primary" : "btn-ghost"}`} onClick={() => setInvOpen((v) => !v)} aria-keyshortcuts="E" aria-expanded={invOpen}><span>🎒 Envanter</span><kbd>E</kbd></button>
            {atDesk && !locked && <button type="button" className="btn btn-ghost gw-tool" onClick={leaveDesk} aria-keyshortcuts="B"><span>Masadan kalk</span><kbd>B</kbd></button>}
            <div className="gw-zoom" role="group" aria-label="Kamera yakınlaştırması">
              <button type="button" onClick={() => changeZoom(zoom - 0.05)} disabled={zoom <= 0.7} aria-label="Uzaklaştır" title="Uzaklaştır (-)">−</button>
              <button type="button" onClick={() => changeZoom(1)} aria-label="Yakınlaştırmayı sıfırla" title="Normal görünüme dön (0)">{Math.round(zoom * 100)}%</button>
              <button type="button" onClick={() => changeZoom(zoom + 0.05)} disabled={zoom >= 1.3} aria-label="Yakınlaştır" title="Yakınlaştır (+)">+</button>
            </div>
            <button type="button" className="btn btn-ghost gw-tool" aria-expanded={helpOpen} aria-keyshortcuts="H" onClick={() => setHelpOpen((v) => !v)}><span>Kısayollar</span><kbd>H</kbd></button>
            {helpOpen && <p className="gw-tool-help">WASD / oklar: yürü<br />F: etkileşim · J / tık: saldırı<br />1–4: büyü · tekerlek: yakınlaştır<br />Esc: pencereyi / işlemi kapat</p>}
          </div>
        </nav>
        {(locked || atDesk || near) && <p className="gw-interaction" role="status">{locked ? "🔒 Çalışıyorsun · F: paneli aç" : atDesk ? "F: çalışma panelini aç · yürüyünce kalkarsın" : `F: ${near?.label}`}</p>}
        <canvas ref={canvas} className="gw-canvas" role="img" aria-label={where.scope === "bahce" ? "Ortak bahçe" : where.scope === "sato" ? "Şato" : "Ev"} />
        {(Object.entries(TAGS) as [string, string][]).map(([k, label]) => (
          <span key={k} ref={(el) => { tagRefs.current[k] = el; }} className={`hall-tag is-${k}${k === "sato" ? " is-house" : ""}`} style={{ display: "none" }} aria-hidden="true">
            {label}
          </span>
        ))}
        {houseNames.map((n, k) => (
          <span key={n} ref={(el) => { tagRefs.current[`ev${k}`] = el; }} className="hall-tag is-house" style={{ display: "none" }} aria-hidden="true">{n}</span>
        ))}
        {mode.kind === "place" && <p className="gw-tip">{itemById.get(mode.itemId)?.name}: koymak için bir kareye dokun · R ya da ↻ ile döndür · Esc ile vazgeç</p>}
        {mode.kind === "place" && <button type="button" className="gw-rot" onPointerDown={(e) => e.stopPropagation()} onClick={() => setRot((v) => (v + 1) % 4)} aria-label="Döndür">↻</button>}
        {mode.kind === "edit" && <p className="gw-tip">Geri almak istediğin eşyaya dokun</p>}
        {mode.kind === "rotate" && <p className="gw-tip">Döndürmek istediğin eşyaya dokun</p>}
        {msg && <p className="gw-msg" role="status">{msg}</p>}
        {partnerStudy && (
          <p className="gw-partner-study" role="status">
            <span className="gw-ps-dot" aria-hidden="true" />
            <b>{profiles.find((p) => p.id !== me)?.name.split(" ")[0]}</b> şu an <b>{partnerStudy.label}</b> {partnerStudy.reading ? "okuyor" : "çalışıyor"}
            <span className="num">{formatClock(Math.max(0, (clock - new Date(partnerStudy.startedAt).getTime()) / 1000))}</span>
            {studyTimer ? <em>❤️ birlikte · +%50</em> : <em>sen de başla: +%50 XP</em>}
          </p>
        )}

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
          <input className="input" type="search" placeholder="Eşya ara" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Eşya ara" />
          {tab === "oda" && (
            <div className="chips gw-cats" role="group" aria-label="Kategori">
              {(["Tümü", ...CATS.filter((c2) => c2 !== "Bahçe")] as const).map((c2) => (
                <button key={c2} type="button" className="chip" aria-pressed={catFilter === c2} onClick={() => setCatFilter(c2)}>{c2}</button>
              ))}
            </div>
          )}
          <label className="check-row"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Yalnız açılanları göster</label>
          <ul className="gw-items">
            {ROOM_ITEMS.filter((it) => it.scope === tab && (tab === "bahce" || catFilter === "Tümü" || it.cat === catFilter) && (!onlyOpen || it.level <= playerLevel)
              && (!q.trim() || (it.level <= playerLevel && it.name.toLocaleLowerCase("tr").includes(q.trim().toLocaleLowerCase("tr"))))).map((it) => {
              const locked = it.level > playerLevel;
              const count = countOf(it.id), max = maxCopies(it.id), isPlaced = count >= max;
              const rightPlace = tab === where.scope && canEditHere;
              const row = [...placed].reverse().find((p) => p.userId === me && p.itemId === it.id);
              return (
                <li key={it.id} className={`gw-item${locked ? " is-locked" : ""}${mode.kind === "place" && mode.itemId === it.id ? " is-active" : ""}`}>
                  <PixelIcon draw={(c, w, h, t) => drawItemPreview(c, w, h, it.id, t)} size={[48, 44]} scale={2} className="gw-item-icon" />
                  <div>
                    <b>{locked ? "???" : it.name}</b>
                    <small>{locked ? `🔒 Seviye ${it.level}` : `Lv ${it.level} · ${it.size[0]}×${it.size[1]} · ${count}/${max} kondu`}</small>
                  </div>
                  {!locked && !isPlaced && (
                    <button type="button" className="btn btn-primary" disabled={!rightPlace || busy}
                      title={rightPlace ? undefined : tab === "oda" ? "Önce kendi evine git" : "Önce bahçeye çık"}
                      onClick={() => { setMode({ kind: "place", itemId: it.id }); setInvOpen(false); }}>
                      Yerleştir
                    </button>
                  )}
                  {!locked && row && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => takeBack(row)} title="Son konanı envantere geri al">Geri al</button>}
                </li>
              );
            })}
          </ul>
          {!(tab === where.scope && canEditHere) && <p className="muted gw-note">{tab === "oda" ? "Ev eşyası koymak için kendi evine dön." : "Bahçe eşyası koymak için evinin kapısından bahçeye çık."}</p>}
        </section>
      </div>

      <div className={`gw-pad${locked ? " is-locked" : ""}`} aria-label="Yön tuşları">
        {padBtn([-1, -1], "Yukarı", "up", "▲")}
        {padBtn([-1, 1], "Sola", "left", "◀")}
        {padBtn([1, -1], "Sağa", "right", "▶")}
        {padBtn([1, 1], "Aşağı", "down", "▼")}
        <button type="button" className="gw-pad-btn act" aria-label={near ? near.label : "Etkileşim"} onPointerDown={(e) => { e.preventDefault(); interact(); }}>✋</button>
        <button type="button" className="gw-pad-btn atk" aria-label="Saldır" onPointerDown={(e) => { e.preventDefault(); doAttack(); }}>⚔</button>
      </div>
      {study && <StudyDesk me={me} profiles={profiles} tab={study} atDesk={!!atDesk} onClose={() => setStudy(null)} onTimer={setStudyTimer} />}
      {armory && <ArmoryPanel kind={armory} level={playerLevel} equipment={myEq} busy={equipBusy} onToggle={onEquip} onClose={() => setArmory(null)} />}
      {mailOpen && <Mailbox onClose={() => { setMailOpen(false); setUnread(0); }} partner={profiles.find((p) => p.id !== me)?.name.split(" ")[0] ?? "Sevgilin"} />}
    </div>
  );
}

type Note = { id: string; body: string; createdAt: string; mine: boolean; read: boolean };

// Posta kutusu: gelen ve giden notlar, yeni not yazma
function Mailbox({ onClose, partner }: { onClose: () => void; partner: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const load = () => api<{ notes: Note[] }>("/api/gelisim/notlar").then((r) => setNotes(r.notes), (e) => setErr(e instanceof Error ? e.message : "Yüklenemedi."));
  useEffect(() => { load(); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true); setErr(null);
    try { await api("/api/gelisim/notlar", { body: { body: text.trim() } }); setText(""); await load(); }
    catch (er) { setErr(er instanceof Error ? er.message : "Gönderilemedi."); }
    setSending(false);
  };
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal gw-mail" role="dialog" aria-modal="true" aria-labelledby="mail-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <h2 id="mail-title">💌 Posta kutusu</h2>
        <form className="stack" onSubmit={send}>
          <label className="field-label" htmlFor="mail-text">{partner} için bir not bırak</label>
          <textarea id="mail-text" className="input" rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="Bugün seni çok düşündüm..." />
          <div className="row"><button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>Kutuya bırak</button><button type="button" className="btn btn-ghost" onClick={onClose}>Kapat</button></div>
        </form>
        {err && <p className="form-error">{err}</p>}
        <ul className="gw-notes">
          {notes === null ? <li className="muted">Yükleniyor...</li> : notes.length === 0 ? <li className="muted">Kutu henüz boş.</li> : notes.map((n) => (
            <li key={n.id} className={n.mine ? "is-mine" : n.read ? undefined : "is-new"}>
              <small>{n.mine ? `Sen → ${partner}` : `${partner} → sen`} · {new Date(n.createdAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{!n.mine && !n.read ? " · yeni" : ""}</small>
              <p>{n.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
