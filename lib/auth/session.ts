import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { isSameOrigin, jsonError } from "@/lib/http";
import { SESSION_COOKIE, hashSessionId, readSessionCookie } from "./token";

// Tek ortak hesapla giriş yapılır; oturum, seçili kişi profilini (users) tutar.
// Bütün veriler profil kimliğiyle (user_id) ayrılır.

export type Profile = {
  id: string;
  username: string;
  displayName: string;
  avatarPublicId: string | null;
  skinMetrics: string[];
};

export type SessionInfo = {
  accountId: string;
  accountUsername: string;
  mustChangePassword: boolean;
  /** Bu oturumun veritabanındaki kimliği (özet) */
  sessionKey: string;
  /** Seçili profil; giriş sonrası seçilene kadar null */
  profile: Profile | null;
};

/** Profili seçilmiş oturum: API'ler ve sayfalar veriyi `id` (user_id) ile filtreler. */
export type SessionUser = Profile & { accountId: string; accountUsername: string; sessionKey: string };

async function findSession(cookieValue: string | undefined): Promise<SessionInfo | null> {
  const sessionId = await readSessionCookie(cookieValue);
  if (!sessionId) return null;
  const sessionKey = await hashSessionId(sessionId);
  const rows = await sql()`
    select a.id as account_id, a.username as account_username, a.must_change_password,
           u.id, u.username, u.display_name, u.avatar_public_id, u.skin_metrics
    from sessions s
    join accounts a on a.id = s.account_id
    left join users u on u.id = s.user_id and u.account_id = s.account_id
    where s.id = ${sessionKey} and s.expires_at > now()`;
  const r = rows[0];
  if (!r) return null;
  return {
    accountId: r.account_id,
    accountUsername: r.account_username,
    mustChangePassword: r.must_change_password,
    sessionKey,
    profile: r.id
      ? {
          id: r.id,
          username: r.username,
          displayName: r.display_name,
          avatarPublicId: r.avatar_public_id,
          skinMetrics: r.skin_metrics,
        }
      : null,
  };
}

function toUser(session: SessionInfo & { profile: Profile }): SessionUser {
  return {
    ...session.profile,
    accountId: session.accountId,
    accountUsername: session.accountUsername,
    sessionKey: session.sessionKey,
  };
}

/** Sunucu bileşenlerinde oturum. İstek başına bir kez sorgulanır. */
export const getSession = cache(async (): Promise<SessionInfo | null> => {
  const store = await cookies();
  return findSession(store.get(SESSION_COOKIE)?.value);
});

/** Oturum yoksa girişe, şifre değişmesi gerekiyorsa şifre ekranına yönlendirir. */
export async function requireAccount(options?: { duringPasswordChange?: boolean }): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.mustChangePassword && !options?.duringPasswordChange) redirect("/sifre-degistir");
  return session;
}

/** Sayfalar için: ayrıca profil seçilmemişse profil seçimine yönlendirir. */
export async function requireUser(): Promise<SessionUser> {
  const session = await requireAccount();
  if (!session.profile) redirect("/profil-sec");
  return toUser(session as SessionInfo & { profile: Profile });
}

type AccountHandler<Ctx> = (req: NextRequest, session: SessionInfo, ctx: Ctx) => Promise<Response>;
type UserHandler<Ctx> = (req: NextRequest, user: SessionUser, ctx: Ctx) => Promise<Response>;

/** API sarmalayıcısı: oturumu sunucu tarafında doğrular. */
export function withAccount<Ctx = unknown>(handler: AccountHandler<Ctx>, options?: { duringPasswordChange?: boolean }) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    if (req.method !== "GET" && req.method !== "HEAD" && !isSameOrigin(req)) {
      return jsonError(403, "Geçersiz istek kaynağı.");
    }
    const session = await findSession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return jsonError(401, "Oturumun sona ermiş. Lütfen tekrar giriş yap.");
    if (session.mustChangePassword && !options?.duringPasswordChange) {
      return jsonError(403, "Devam etmeden önce şifreyi değiştirmelisin.");
    }
    const res = await handler(req, session, ctx);
    res.headers.set("Cache-Control", "no-store");
    return res;
  };
}

/**
 * Profil gerektiren API'ler. Handler'lar veriyi her zaman `user.id` ile filtreler;
 * istemciden gelen kullanıcı kimliğine güvenilmez.
 */
export function withUser<Ctx = unknown>(handler: UserHandler<Ctx>) {
  return withAccount<Ctx>(async (req, session, ctx) => {
    if (!session.profile) return jsonError(409, "Önce kimin kullandığını seç.");
    return handler(req, toUser(session as SessionInfo & { profile: Profile }), ctx);
  });
}
