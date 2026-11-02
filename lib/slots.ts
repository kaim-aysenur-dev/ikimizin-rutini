export const SLOTS = ["sabah", "aksam", "dus", "haftalik", "gerektiginde"] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABEL: Record<Slot, string> = {
  sabah: "Sabah",
  aksam: "Akşam",
  dus: "Duş",
  haftalik: "Haftalık",
  gerektiginde: "Gerektiğinde",
};

/** Her gün yapılması beklenen gruplar; işaretlenmezse "Yapılmadı" sayılır */
export const DAILY_SLOTS: readonly Slot[] = ["sabah", "aksam", "dus"];

export function isSlot(value: unknown): value is Slot {
  return typeof value === "string" && (SLOTS as readonly string[]).includes(value);
}

export const SKIN_METRICS = {
  kuruluk: "Kuruluk",
  yaglanma: "Yağlanma",
  sivilce: "Sivilce",
  hassasiyet: "Hassasiyet",
  tiras: "Tıraş tahrişi",
} as const;
export type SkinMetric = keyof typeof SKIN_METRICS;
export const ALL_SKIN_METRICS = Object.keys(SKIN_METRICS) as SkinMetric[];

/** Ürün formundaki hazır sayaç süreleri (saniye) */
export const TIMER_PRESETS = [30, 60, 120, 180, 300, 600, 900, 1200, 1800, 3600];

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sn`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} dk`;
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
