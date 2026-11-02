// Tarayıcı tarafı küçük fetch yardımcısı: JSON gönderir, hata mesajını Türkçe olarak fırlatır.

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
  return data as T;
}
