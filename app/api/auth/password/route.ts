import { sql } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withAccount } from "@/lib/auth/session";
import { checkNewPassword, hashPassword, verifyPassword } from "@/lib/auth/password";

// Ortak hesabın şifresini değiştirir. İlk girişte zorunlu olabileceği için o oturumlara da açık.
export const POST = withAccount(
  async (req, session) => {
    const body = await readJson(req);
    const current = typeof body?.current === "string" ? body.current : "";
    const next = typeof body?.next === "string" ? body.next : "";
    const db = sql();
    const attemptKey = `sifre:${session.accountId}`;

    const [{ fails }] = await db`
      select count(*)::int as fails from login_attempts
      where identifier = ${attemptKey} and not ok and at > now() - interval '15 minutes'`;
    if (fails >= 5) return jsonError(429, "Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.");

    const [row] = await db`select password_hash from accounts where id = ${session.accountId}`;
    if (!row || !(await verifyPassword(current, row.password_hash))) {
      await db`insert into login_attempts (identifier, ip, ok) values (${attemptKey}, 'ayarlar', false)`;
      return jsonError(400, "Mevcut şifre hatalı.");
    }

    const problem = checkNewPassword(next);
    if (problem) return jsonError(400, problem);
    if (await verifyPassword(next, row.password_hash)) {
      return jsonError(400, "Yeni şifre eskisiyle aynı olamaz.");
    }

    await db`update accounts set password_hash = ${await hashPassword(next)}, must_change_password = false,
             updated_at = now() where id = ${session.accountId}`;
    // Bu cihaz dışındaki bütün oturumları kapat
    await db`delete from sessions where account_id = ${session.accountId} and id <> ${session.sessionKey}`;
    await db`delete from login_attempts where identifier = ${attemptKey}`;
    return jsonOk({ ok: true });
  },
  { duringPasswordChange: true },
);
