import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionCookie } from "@/lib/auth/token";

// İyimser kontrol: imzasız ya da sahte çerezle hiçbir korumalı sayfaya ve API'ye geçilemez.
// Asıl doğrulama (oturum veritabanında var mı, süresi dolmuş mu) sayfalarda ve API route'larında yapılır.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Ana sayfa herkese açık hikâye vitrini; giriş sayfası oturum kontrolünü kendisi yapar.
  if (pathname === "/" || pathname === "/giris") return NextResponse.next();

  const sessionId = await readSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);
  if (sessionId) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Oturumun sona ermiş. Lütfen tekrar giriş yap." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = "/giris";
  url.search = "";
  url.searchParams.set("sonra", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/auth/login|manifest.webmanifest|icons/|logo|favicon.ico|robots.txt|sw.js).*)",
  ],
};

