import type { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { clientIp, isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/http";
import { normalizeIdentifier, safeNextPath } from "@/lib/identity";
import { burnPasswordCheck, verifyPassword } from "@/lib/auth/password";
import {
  REMEMBER_SECONDS,
  SESSION_COOKIE,
  SHORT_SESSION_SECONDS,
  createSessionCookie,
  hashSessionId,
} from "@/lib/auth/token";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError(403, "Geçersiz istek kaynağı.");

  const body = await readJson(req);
  const rawIdentifier = typeof body?.identifier === "string" ? body.identifier : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const remember = body?.remember === true;
  if (!rawIdentifier.trim() || !password) {
    return jsonError(400, "Kullanıcı adını (ya da e-postanı) ve şifreni yaz.");
  }

  const ident = normalizeIdentifier(rawIdentifier);
  const ip = clientIp(req);
  const db = sql();

  // 5 hatalı denemeden sonra (kullanıcı adı ya da IP bazında) 15 dakika bekleme
  const [lock] = await db`
    select
      count(*) filter (where identifier = ${ident.value})::int as id_fails,
      count(*) filter (where ip = ${ip})::int as ip_fails,
      ceil(extract(epoch from (max(at) filter (where identifier = ${ident.value}) + interval '15 minutes' - now())))::int as id_wait,
      ceil(extract(epoch from (max(at) filter (where ip = ${ip}) + interval '15 minutes' - now())))::int as ip_wait
    from login_attempts
    where not ok and at > now() - interval '15 minutes' and (identifier = ${ident.value} or ip = ${ip})`;
  const waits = [
    lock.id_fails >= MAX_FAILURES ? lock.id_wait : 0,
    lock.ip_fails >= MAX_FAILURES ? lock.ip_wait : 0,
  ];
  const waitSeconds = Math.max(...waits.map((w) => Number(w) || 0));
  if (waitSeconds > 0) {
    const minutes = Math.max(1, Math.ceil(waitSeconds / 60));
    return jsonError(429, `Çok fazla hatalı deneme. ${minutes} dakika sonra tekrar dene.`, { retryAfter: waitSeconds });
  }

  const rows =
    ident.kind === "email"
      ? await db`select id, password_hash, must_change_password from accounts where email = ${ident.value}`
      : await db`select id, password_hash, must_change_password from accounts where username = ${ident.value}`;
  const account = rows[0];
  const ok = account ? await verifyPassword(password, account.password_hash) : await burnPasswordCheck(password);

  await db`insert into login_attempts (identifier, ip, ok) values (${ident.value}, ${ip}, ${ok})`;

  if (!ok) {
    const left = MAX_FAILURES - (Math.max(lock.id_fails, lock.ip_fails) + 1);
    return jsonError(
      401,
      left > 0
        ? `Kullanıcı adı ya da şifre hatalı. ${left} deneme hakkın kaldı.`
        : `Çok fazla hatalı deneme. ${LOCK_MINUTES} dakika sonra tekrar dene.`,
    );
  }

  // Hesapta tek profil varsa doğrudan seçilir; birden fazlaysa "Kim kullanıyor?" sorulur
  const profiles = await db`select id from users where account_id = ${account.id}`;
  const profileId = profiles.length === 1 ? profiles[0]!.id : null;

  const { value, sessionId } = await createSessionCookie();
  const seconds = remember ? REMEMBER_SECONDS : SHORT_SESSION_SECONDS;
  const expiresAt = new Date(Date.now() + seconds * 1000).toISOString();
  await db`insert into sessions (id, account_id, user_id, remember, expires_at)
           values (${await hashSessionId(sessionId)}, ${account.id}, ${profileId}, ${remember}, ${expiresAt})`;
  // temizlik: bu hesabın hatalı denemeleri, eski kayıtlar, süresi dolmuş oturumlar
  await db`delete from login_attempts where (identifier = ${ident.value} and not ok) or at < now() - interval '2 days'`;
  await db`delete from sessions where expires_at < now()`;

  const after = safeNextPath(body?.next);
  const next = account.must_change_password
    ? "/sifre-degistir"
    : profileId
      ? (after ?? "/bugun")
      : `/profil-sec${after ? `?sonra=${encodeURIComponent(after)}` : ""}`;
  const res = jsonOk({ next });
  res.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // "Beni hatırla" yoksa maxAge verilmez: çerez tarayıcı kapanınca silinir
    ...(remember ? { maxAge: seconds } : {}),
  });
  return res;
}
