// Gelişim dünyasının saf yardımcıları ve sabitleri (gelisim-world.tsx'ten ayrıldı; davranış aynı).
import { type StudyTab } from "./study-desk";
import { type Outfit, spriteWear, worldTint } from "@/lib/outfit";
import { type Emote, type Hero, type Theme } from "@/lib/gelisim-scene";
import { sfx } from "@/lib/sfx";
import { MOON_GATE, type Floor, type Placed, sizeOf, type HouseFloor } from "@/lib/room";
import { CASTLE_DECOR, castleInteractive } from "@/lib/castle";
import { type Equipment } from "@/lib/equipment";
import { armorLook, setBonus } from "@/lib/combat-stats";
import { MATS } from "@/lib/gear";
import { type GearKind } from "@/lib/gear";
import { itemById } from "@/lib/room-items";

export type Profile = { id: string; name: string; level: number; xp?: number };
export type Where = { scope: "oda"; owner: string; floor?: HouseFloor } | { scope: "bahce" } | { scope: "sato"; floor: Floor } | { scope: "zindan"; stage: number };
export const GATE_FRONT: [number, number] = [MOON_GATE.i0 + 1.5, MOON_GATE.j1 + 0.6]; // Ay Kapısı'nın önü (zindandan dönüş)
export type Mode = { kind: "walk" } | { kind: "place"; itemId: string } | { kind: "edit" } | { kind: "rotate" };
export type Remote = Hero & { userId: string; ti: number; tj: number; swingAt?: number };
// emote çarkı: altı kişisel, iki ortak (yanındayken)
export const WHEEL: { id: Emote; icon: string; label: string; pair?: boolean }[] = [
  { id: "kalp", icon: "💗", label: "Kalp" }, { id: "el", icon: "👋", label: "El salla" }, { id: "gul", icon: "😂", label: "Gül" },
  { id: "opucuk", icon: "💋", label: "Öpücük" }, { id: "sasir", icon: "😮", label: "Şaşır" }, { id: "uyku", icon: "😴", label: "Uyku" },
  { id: "dans", icon: "💃", label: "Dans", pair: true }, { id: "saril", icon: "🤗", label: "Sarıl", pair: true },
];
export const EMOTE_IDS = new Set<string>(WHEEL.map((w) => w.id));
export const EMOTE_SOUND: Record<Emote, () => void> = { kalp: sfx.pop, el: sfx.pop, gul: sfx.laugh, opucuk: sfx.kiss, sasir: sfx.gasp, uyku: sfx.snore, dans: sfx.chime, saril: sfx.chime };
export const PLACE_NAME = (pl: string) => (pl === "bahce" ? "bahçede" : pl === "sato" ? "şatoda · 1. kat" : pl.startsWith("sato:") ? `şatoda · ${pl.slice(5)}. kat` : "evde");

export const TARGET_HP = 300;

export const whoOf = (name: string): Theme => (/ay[sş]enur/i.test(name) ? "aysenur" : "cengiz");
/** Görünüm: kuşanılmış zırh kıyafeti değiştirir (yoksa giydirme ekranındaki gündelik kombin, o da yoksa ev kıyafeti); elde kuşanılmış silah */
export const lookFor = (_level: number, eq: Equipment | undefined, wear?: Outfit | null) => {
  const base = armorLook(eq?.armor), mat = (id: string | null | undefined) => (id ? MATS.find((m) => id.endsWith(`-${m.id}`)) : undefined);
  const gl = mat(eq?.gloves), bt = mat(eq?.boots), lg = mat(eq?.legs);
  // gündelik kombin zırhın altında kalır; eldiven elleri, çizme ayakları malzemesinin rengine boyar
  const casual = wear && !eq?.armor ? worldTint(wear) : {};
  const tint = { ...casual, ...base.tint, ...(gl ? { glove: gl.base } : {}), ...(bt ? { shoe: bt.dk } : {}), ...(lg ? { bottom: lg.base } : {}) };
  // zırh yoksa kombinin ayrıntıları (şapka, gözlük, çanta...) küçük karakterin üstüne çizilir
  return { outfit: base.outfit, tint: Object.keys(tint).length ? tint : undefined, gear: gearOf(eq), wear: wear && !eq?.armor ? spriteWear(wear) : undefined };
};
export const gearOf = (eq: Equipment | undefined) => ({
  weapon: eq?.weapon ?? null, armor: eq?.armor ?? null, helmet: eq?.helmet ?? null, shield: eq?.shield ?? null, cape: eq?.cape ?? null,
  trinket: eq?.trinket ?? null, set: eq ? setBonus(eq)?.mat ?? null : null,
});
export const houseFloorOf = (w: Where): HouseFloor => (w.scope === "oda" ? w.floor ?? 1 : 1);
export const placeOf = (w: Where) => (w.scope === "oda" ? `ev:${w.owner}${houseFloorOf(w) !== 1 ? `:${houseFloorOf(w)}` : ""}` : w.scope === "zindan" ? `zindan:${w.stage}` : w.scope === "sato" && w.floor > 1 ? `sato:${w.floor}` : w.scope);
export const floorOf = (w: Where): Floor => (w.scope === "sato" ? w.floor : 1);
export const SATO_SEATS: Record<Floor, Placed[]> = { 1: castleInteractive(1), 2: castleInteractive(2), 3: castleInteractive(3) };
export const SATO_CUSHION = CASTLE_DECOR.find((d) => d.id === "kedi-minderi");
export const SOUND_KEY = "gelisim-firtina-sesi";
// sahnedeki isim etiketleri (çizimden gelen noktalara oturur)
export const TAGS = { cengiz: "Cengiz", aysenur: "Ayşenur", duldul: "Düldül", parrot: "Papağan", gandalf: "Gandalf", gimli: "Gimli", legolas: "Legolas", jon: "Jon Snow", sato: "Şato" };
export const leave = (place: string) => { void fetch("/api/gelisim/konum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ here: false, place }), keepalive: true }); };
export const SPEED = 3.2; // kare / saniye
export const RESUME_KEY = "gelisim-yer"; // sayfa yenilenince kalınan yer ve konum

// İstanbul saatine göre gece: 21-05 tam gece, akşam ve sabah geçişli
export function nightNow(): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 12) + Number(parts.find((p) => p.type === "minute")?.value ?? 0) / 60;
  if (h >= 21 || h < 5) return 1;
  if (h >= 18) return (h - 18) / 3;
  if (h < 8) return 1 - (h - 5) / 3;
  return 0;
}

// oturulabilen eşyalar: oturuş yüksekliği (piksel), eşyanın kendi alanındaki yerler ve oturanın baktığı yön
// (yataklarda ayakların yönü; baş karşı tarafta). Yataklarda uzanılır; çift kişilik yatakta ve koltukta iki kişi yan yana.
// h: oturağın üst yüzü (piksel; eşyanın çiziminden) ya da yatağın şilte yüksekliği. Oturanın ayakları yerde, kalçası
// tam bu yükseklikte durur; yer minderin ön kısmıdır (ayaklar önden sarkar, oturan sırtlığa değil mindere oturur).
export type Seat = { h: number; sleep?: boolean; slots: [number, number][]; face: [number, number] };
export const seatOf = (id: string): Seat | null =>
  id === "yatak" ? { h: 8, sleep: true, slots: [[1.08, 0.5]], face: [1, 0] }
  : id.startsWith("tek-yatak-") ? { h: 7, sleep: true, slots: [[1.08, 0.5]], face: [1, 0] }
  : id.startsWith("cift-yatak-") ? { h: 8, sleep: true, slots: [[1.08, 0.52], [1.08, 1.48]], face: [1, 0] }
  : id.startsWith("kose-koltuk-") ? { h: 8, slots: [[0.6, 0.72], [1.5, 0.72], [2.4, 0.72]], face: [0, 1] }
  : id.startsWith("koltuk-") ? { h: 8, slots: [[0.62, 0.72], [1.38, 0.72]], face: [0, 1] }
  : id.startsWith("berjer-") ? { h: 6, slots: [[0.5, 0.7]], face: [0, 1] }
  : id.startsWith("sandalye-") || id.startsWith("calisma-sandalyesi-") ? { h: 8, slots: [[0.5, 0.62]], face: [0, 1] }
  : id === "taht" ? { h: 9, slots: [[0.7, 0.5]], face: [1, 0] }
  : id === "bank" || id.startsWith("bahce-banki-") ? { h: 8, slots: [[0.6, 0.66], [1.4, 0.66]], face: [0, 1] }
  : null;
export const DESK_SEAT = 7; // masada sandalye yoksa taburenin yüksekliği
export type Near = { kind: "sit" | "piano" | "mail" | "desk" | "shelf" | "stairs" | "station" | "hold" | "wardrobe" | "gate" | "board" | "merchant"; label: string; i: number; j: number; itemId?: string; to?: Floor; hto?: HouseFloor; gearKind?: GearKind; p?: Placed };
export const STATION_LABEL: Record<GearKind, string> = { Zırh: "Zırh askısı", Silah: "Silah rafı", Büyü: "Büyü kürsüsü" };
// masada oturulan yer (önü) ve oturanın baktığı yön (masaya doğru)
export const deskSeat = (id: string): { slot: [number, number]; face: [number, number] } => {
  const w = itemById.get(id)?.size[0] ?? 1;
  return { slot: [w / 2, 1.42], face: [0, -1] };
};
// eşyanın kendi alanındaki bir nokta ve yön, dönüşe göre dünyada
export function placeLocal(p: Placed, x: number, y: number): [number, number] {
  const [W, D] = itemById.get(p.itemId)?.size ?? [1, 1], r = (p.rot ?? 0) & 3;
  if (r & 2) { x = W - x; y = D - y; }
  return r & 1 ? [p.tx + y, p.ty + x] : [p.tx + x, p.ty + y];
}
/** yatakta başın yönü: ayaklar öne (ekranda aşağı) bakıyorsa baş arkada, yukarıda (1), tersi -1 */
export function lieTilt(p: Placed, [a, b]: [number, number]): 1 | -1 {
  const r = (p.rot ?? 0) & 3;
  if (r & 2) { a = -a; b = -b; }
  return a + b > 0 ? 1 : -1;
}
export function faceDir(p: Placed, [a, b]: [number, number]): 1 | -1 {
  const r = (p.rot ?? 0) & 3;
  if (r & 2) { a = -a; b = -b; }
  if (r & 1) [a, b] = [b, a];
  return a - b >= 0 ? 1 : -1;
}
export const depthOfPlaced = (p: Placed) => { const [w, d] = sizeOf(p.itemId, p.rot); return p.tx + w - 0.5 + p.ty + d - 0.5; };
/** Canlı konumda gönderilen duruş */
export const poseOf = (h: Hero, desk: StudyTab | null) =>
  !h.sit ? null : `${desk ? (desk === "kitaplik" ? "read" : "desk") : h.sit.sleep ? "lie" : "sit"}:${Math.round(h.sit.sleep ? h.sit.lift : h.sit.seat ?? DESK_SEAT)}${h.sit.sleep && h.sit.tilt === -1 ? ":-1" : ""}`;

/** Kalkış: oturmadan önce durulan boş kareye dönülür */
export function standUp(h: Hero) {
  const from = h.sit?.from;
  if (from) { h.i = from[0]; h.j = from[1]; }
  h.sit = undefined;
}

// piyano: kısa bir melodi (dokunuştan sonra çaldığı için tarayıcı izin verir)
export function tune() {
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
export const KEYS: Record<string, [number, number]> = {
  w: [-1, -1], arrowup: [-1, -1], s: [1, 1], arrowdown: [1, 1], a: [-1, 1], arrowleft: [-1, 1], d: [1, -1], arrowright: [1, -1],
};
