import { sql } from "@/lib/db";
import { clientIp, jsonError, jsonOk, readJson } from "@/lib/http";
import { withAccount } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { UUID_RE } from "@/lib/skin";

const MAX_FAILURES = 5;

// "Kim kullanıyor?" seçimi: profil yalnızca bu hesaba aitse oturuma yazılır.
// Kilitli profil (lock_hash dolu) şifreyle açılır; zaten seçili olan profil için tekrar sorulmaz.
export const POST = withAccount(async (req, session) => {
  const body = await readJson(req);
  const userId = body?.userId;
  if (typeof userId !== "string" || !UUID_RE.test(userId)) return jsonError(400, "Geçersiz profil.");
  const db = sql();
  const [owned] = await db`select lock_hash from users where id = ${userId} and account_id = ${session.accountId}`;
  if (!owned) return jsonError(404, "Profil bulunamadı.");

  if (owned.lock_hash && session.profile?.id !== userId) {
    const password = typeof body?.password === "string" ? body.password : "";
    if (!password) return jsonError(401, "Bu profil şifreli. Şifreyi yaz.", { locked: true });

    // 5 hatalı denemeden sonra 15 dakika bekleme (giriş ekranıyla aynı kayıt tablosu)
    const ident = `profil:${userId}`;
    const ip = clientIp(req);
    const [lock] = await db`
      select count(*)::int as fails from login_attempts
      where identifier = ${ident} and not ok and at > now() - interval '15 minutes'`;
    if (lock.fails >= MAX_FAILURES) return jsonError(429, "Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.", { locked: true });

    const ok = await verifyPassword(password, owned.lock_hash);
    await db`insert into login_attempts (identifier, ip, ok) values (${ident}, ${ip}, ${ok})`;
    if (!ok) {
      const left = MAX_FAILURES - (lock.fails + 1);
      return jsonError(
        401,
        left > 0 ? `Şifre hatalı. ${left} deneme hakkın kaldı.` : "Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.",
        { locked: true },
      );
    }
    await db`delete from login_attempts where identifier = ${ident} and not ok`;
  }

  await db`update sessions set user_id = ${userId} where id = ${session.sessionKey} and account_id = ${session.accountId}`;
  return jsonOk({ ok: true });
});
