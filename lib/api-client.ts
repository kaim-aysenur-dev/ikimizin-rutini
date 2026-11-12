// Tarayıcı tarafı küçük fetch yardımcısı: JSON gönderir, hata mesajını Türkçe olarak fırlatır.
import { CARE_FX, type CareFxDetail } from "./care";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth/")) {
      window.location.assign(`/giris?sonra=${encodeURIComponent(window.location.pathname)}`);
    }
    throw new ApiError(data?.error ?? "Bir şeyler ters gitti. Tekrar dene.", res.status);
  }
  if (typeof window !== "undefined") notifyCare(url, options.method ?? (options.body === undefined ? "GET" : "POST"), options.body);
  return data as T;
}

// Yüz yogası, spor, su ve öğün kaydı: yan paneldeki karakter tepki versin (kayıt hangi bileşenden yapılırsa yapılsın)
function notifyCare(url: string, method: string, body: unknown) {
  const b = (body ?? {}) as { workoutDone?: unknown; done?: unknown; water?: unknown };
  const effect: CareFxDetail["effect"] | null =
    url === "/api/face-yoga/sessions" && method === "POST" ? "yoga"
    : (url === "/api/sport/sessions" && method === "POST") || url === "/api/sport/sets" || (url === "/api/sport/activity" && b.workoutDone === true) ? "spor"
    : url === "/api/nutrition/meal-check" && b.done === true ? "yemek"
    : url === "/api/nutrition/day" && typeof b.water === "number" ? "su" : null;
  if (effect) window.dispatchEvent(new CustomEvent<CareFxDetail>(CARE_FX, { detail: { effect, water: typeof b.water === "number" ? b.water : undefined } }));
}
