import type { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { isSameOrigin, jsonError, jsonOk } from "@/lib/http";
import { SESSION_COOKIE, hashSessionId, readSessionCookie } from "@/lib/auth/token";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError(403, "Geçersiz istek kaynağı.");
  const sessionId = await readSessionCookie(req.cookies.get(SESSION_COOKIE)?.value);
  if (sessionId) await sql()`delete from sessions where id = ${await hashSessionId(sessionId)}`;
  const res = jsonOk({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
