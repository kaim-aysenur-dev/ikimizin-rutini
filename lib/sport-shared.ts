// Spor aktiviteleri: sunucu ve tarayıcı tarafında ortak tipler ve yardımcılar.

export const ACTIVITY_COLORS = ["pm", "am", "bad", "shower", "ok", "week"] as const;
export type ActivityColor = (typeof ACTIVITY_COLORS)[number];

export const COLOR_LABEL: Record<ActivityColor, string> = {
  pm: "Mor",
  am: "Sarı",
  bad: "Kiremit",
  shower: "Mavi",
  ok: "Yeşil",
  week: "Erik",
};

export const INTENSITIES = ["hafif", "orta", "zor"] as const;
export type Intensity = (typeof INTENSITIES)[number];
export const INTENSITY_LABEL: Record<Intensity, string> = { hafif: "Hafif", orta: "Orta", zor: "Zor" };

export type ActivityType = { id: string; name: string; color: ActivityColor; tracksRounds: boolean; logsSets: boolean };

export type SportGoal = { daysPerWeek: number; minTypeId: string | null; minTypeDays: number | null };

export type Video = {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  typeId: string | null;
  minutes: number | null;
  level: Intensity | null;
  times: number;
  lastDay: string | null;
};

export type SessionItem = {
  id: string;
  day: string;
  minutes: number | null;
  rounds: number | null;
  intensity: Intensity | null;
  note: string;
  typeName: string | null;
  color: ActivityColor;
  videoTitle: string | null;
};

export type WeekProgress = {
  days: { day: string; color: ActivityColor | null }[];
  done: number;
  typedDone: number;
  weeksStreak: number;
};

/** Boş listede tek dokunuşla eklenebilen öneriler */
export const TYPE_PRESETS: Omit<ActivityType, "id">[] = [
  { name: "Pilates", color: "pm", tracksRounds: false, logsSets: false },
  { name: "Dans kardiyo", color: "am", tracksRounds: false, logsSets: false },
  { name: "Boks", color: "bad", tracksRounds: true, logsSets: false },
  { name: "Ağırlık", color: "shower", tracksRounds: false, logsSets: true },
  { name: "Yürüyüş", color: "ok", tracksRounds: false, logsSets: false },
  { name: "Koşu", color: "week", tracksRounds: false, logsSets: false },
];

/** YouTube linkinden 11 karakterlik video kimliği (watch, youtu.be, shorts, embed, live) */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v");
    if (!id) {
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
      id = m?.[1] ?? null;
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const youtubeThumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
