// Karakter kişiselleştirme: VERİ ve açılma kuralları (hem tarayıcı hem sunucu).
// Unvanlar: kazanılan her rozetin adı + zindan şeflerini yenince kazanılan unvanlar. İz efektleri ve binekler seviye,
// birliktelik ve zindan bölümleriyle açılır. Yeni unvan, iz ya da binek için listeye bir satır eklemek yeter.
import { BADGES } from "./badges";
import { STAGES } from "./dungeon-stages";
import type { Stats } from "./xp";

export type Unlock = { level?: number; stage?: number; together?: number };
export type Progress = { level: number; stats: Stats | null; cleared: number[] };
export const unlocked = (u: Unlock, p: Progress) =>
  (u.level === undefined || p.level >= u.level) && (u.stage === undefined || p.cleared.includes(u.stage)) && (u.together === undefined || (p.stats?.together ?? 0) >= u.together);
const hintOf = (u: Unlock) => [u.level && `Seviye ${u.level}`, u.stage && `${STAGES.find((s) => s.id === u.stage)?.name ?? ""} bölümünü geç`, u.together && `${u.together} gün birlikte`].filter(Boolean).join(" · ");

/* --------------------------------- unvanlar --------------------------------- */

export type Title = { id: string; name: string; source: string; ok: (p: Progress) => boolean; hint: string };
export const TITLES: Title[] = [
  ...BADGES.map((b) => ({ id: `rozet:${b.id}`, name: b.name, source: `${b.icon} ${b.group}`, ok: (p: Progress) => !!p.stats && b.ok(p.stats, p.level), hint: b.hint })),
  ...STAGES.map((s) => ({ id: `zindan:${s.id}`, name: s.title, source: `${s.emoji} Ay Kapısı`, ok: (p: Progress) => p.cleared.includes(s.id), hint: `${s.name}: ${s.champion.name}'i yen` })),
];
export const titleById = (id: string | null | undefined) => (id ? TITLES.find((t) => t.id === id) ?? null : null);

/* ------------------------------- iz efektleri ------------------------------- */

export type TrailId = "yaprak" | "kivilcim" | "kalp" | "yildiz" | "buz" | "ates" | "golge" | "kan" | "gokkusagi";
export type Trail = { id: TrailId; name: string; icon: string; unlock: Unlock; colors: string[] };
export const TRAILS: Trail[] = [
  { id: "yaprak", name: "Sonbahar yaprakları", icon: "🍂", unlock: { level: 5 }, colors: ["#c8784a", "#e2a83e", "#8a4a2a"] },
  { id: "kivilcim", name: "Kıvılcım", icon: "✨", unlock: { level: 15 }, colors: ["#ffe08a", "#f0a24a"] },
  { id: "kalp", name: "Kalpler", icon: "💗", unlock: { together: 7 }, colors: ["#e48aa0", "#d8485a"] },
  { id: "buz", name: "Buz kristali", icon: "❄️", unlock: { stage: 9 }, colors: ["#bfe6f5", "#8ad8ff", "#ffffff"] },
  { id: "yildiz", name: "Yıldız tozu", icon: "🌟", unlock: { level: 30 }, colors: ["#fff6c8", "#c8b8ff", "#f3d48a"] },
  { id: "ates", name: "Alev izi", icon: "🔥", unlock: { stage: 13 }, colors: ["#ffe08a", "#f0703a", "#c8463a"] },
  { id: "golge", name: "Gölge dumanı", icon: "🌑", unlock: { level: 60 }, colors: ["#3a2a5a", "#5a4a8a", "#1a1426"] },
  { id: "kan", name: "Kan ayı", icon: "🌕", unlock: { stage: 16 }, colors: ["#e8304a", "#8a1424"] },
  { id: "gokkusagi", name: "Gökkuşağı", icon: "🌈", unlock: { level: 90 }, colors: ["#e8485a", "#f0a24a", "#f3d48a", "#5fae6e", "#5a9ad8", "#9a6ad6"] },
];
export const trailById = (id: string | null | undefined) => TRAILS.find((t) => t.id === id) ?? null;

/* ---------------------------------- binekler ---------------------------------- */

export type MountId = "at-kahve" | "at-beyaz" | "at-kara" | "kurt-gri" | "kurt-kar" | "kabus";
export type Mount = { id: MountId; name: string; icon: string; unlock: Unlock; kind: "at" | "kurt"; body: string; dark: string; mane: string; speed: number; eyes?: string };
export const MOUNTS: Mount[] = [
  { id: "at-kahve", name: "Kahverengi at", icon: "🐴", unlock: { level: 5 }, kind: "at", body: "#8a5a36", dark: "#6a4226", mane: "#2a1c16", speed: 1.6 },
  { id: "at-beyaz", name: "Beyaz at", icon: "🦄", unlock: { level: 12 }, kind: "at", body: "#e8e4dc", dark: "#c8c4bc", mane: "#f4f0e8", speed: 1.7 },
  { id: "at-kara", name: "Kara aygır", icon: "🐎", unlock: { level: 25 }, kind: "at", body: "#2a2430", dark: "#1a1620", mane: "#0a080e", speed: 1.8 },
  { id: "kurt-gri", name: "Gri kurt", icon: "🐺", unlock: { stage: 2 }, kind: "kurt", body: "#6a6e7a", dark: "#4a4e5a", mane: "#8a8e9a", speed: 1.75 },
  { id: "kurt-kar", name: "Kar kurdu", icon: "🐺", unlock: { stage: 9 }, kind: "kurt", body: "#e8f0f8", dark: "#c0d0e0", mane: "#ffffff", speed: 1.85, eyes: "#8ad8ff" },
  { id: "kabus", name: "Kâbus atı", icon: "🔥", unlock: { stage: 16 }, kind: "at", body: "#1a1016", dark: "#0a0608", mane: "#e8304a", speed: 2, eyes: "#ff3a4a" },
];
export const mountById = (id: string | null | undefined) => MOUNTS.find((m) => m.id === id) ?? null;

/** Görünüm seçimi (equipment tablosunda saklanır); açılmamış ya da bilinmeyen seçim düşer */
export type Style = { title: string | null; trail: string | null; mount: string | null };
export function sanitizeStyle(s: Partial<Style> | null | undefined, p: Progress | null): Style {
  const t = titleById(s?.title), tr = trailById(s?.trail), m = mountById(s?.mount);
  if (!p) return { title: t?.id ?? null, trail: tr?.id ?? null, mount: m?.id ?? null }; // yalnız biçim denetimi (karşının görünümü)
  return { title: t && t.ok(p) ? t.id : null, trail: tr && unlocked(tr.unlock, p) ? tr.id : null, mount: m && unlocked(m.unlock, p) ? m.id : null };
}
export const unlockHint = hintOf;

// kendi kendini denetler
if (process.env.NODE_ENV !== "production") {
  console.assert(new Set(TITLES.map((t) => t.id)).size === TITLES.length && TITLES.length > 100, "yüzden fazla benzersiz unvan");
  const fresh: Progress = { level: 1, stats: null, cleared: [] }, pro: Progress = { level: 100, stats: null, cleared: STAGES.map((s) => s.id) };
  console.assert(sanitizeStyle({ trail: "gokkusagi", mount: "kabus", title: "zindan:16" }, fresh).trail === null && sanitizeStyle({ trail: "gokkusagi", mount: "kabus", title: "zindan:16" }, pro).mount === "kabus", "açılmayan seçim düşer");
  console.assert(sanitizeStyle({ title: "zindan:16" }, pro).title === "zindan:16" && sanitizeStyle({ title: "uydurma" }, pro).title === null, "unvan denetimi");
  console.assert(MOUNTS.every((m) => m.speed > 1), "binek hızlandırır");
}
