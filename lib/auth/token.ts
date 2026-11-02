// Oturum çerezi: `<rastgele kimlik>.<HMAC-SHA256 imzası>`
// Web Crypto kullanır; hem proxy'de hem sunucuda çalışır.

export const SESSION_COOKIE = "oturum";
/** "Beni hatırla" işaretliyse oturum süresi */
export const REMEMBER_SECONDS = 60 * 60 * 24 * 90;
/** İşaretsizse: çerez tarayıcı kapanınca biter, sunucu tarafında da en fazla 1 gün geçerli */
export const SHORT_SESSION_SECONDS = 60 * 60 * 24;

const encoder = new TextEncoder();
const TOKEN_PART = /^[A-Za-z0-9_-]{43}$/;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

let keyPromise: Promise<CryptoKey> | undefined;

function signingKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET eksik ya da 32 karakterden kısa");
  keyPromise ??= crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return keyPromise;
}

/** Yeni oturum kimliği üretir ve imzalı çerez değerini döndürür. */
export async function createSessionCookie(): Promise<{ value: string; sessionId: string }> {
  const sessionId = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(sessionId));
  return { value: `${sessionId}.${toBase64Url(new Uint8Array(signature))}`, sessionId };
}

/** İmzayı doğrular, geçerliyse oturum kimliğini döndürür. Veritabanına bakmaz. */
export async function readSessionCookie(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const [sessionId, signature, extra] = value.split(".");
  if (extra !== undefined || !TOKEN_PART.test(sessionId ?? "") || !TOKEN_PART.test(signature ?? "")) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      fromBase64Url(signature),
      encoder.encode(sessionId),
    );
    return ok ? sessionId : null;
  } catch {
    return null;
  }
}

/** Veritabanında oturum kimliğinin kendisi değil, SHA-256 özeti tutulur. */
export async function hashSessionId(sessionId: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(sessionId)));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}
