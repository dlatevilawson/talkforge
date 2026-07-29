import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TF_AUTH_COOKIE, TF_UID_COOKIE } from "@/lib/auth/constants";
import { isFounderUserId } from "@/lib/auth/session";

/**
 * Next.js 16 Proxy.
 * /app/* — any authenticated member
 * /founder/* — authenticated + Founder role (allowlist), not a separate login
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = request.cookies.get(TF_AUTH_COOKIE)?.value === "1";
  const userId = request.cookies.get(TF_UID_COOKIE)?.value;

  if (pathname.startsWith("/founder")) {
    if (!authed) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (!isFounderUserId(userId)) {
      const url = request.nextUrl.clone();
      url.pathname = "/app/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/app")) {
    if (!authed) {
      const url = request.nextUrl.clone();
      url.pathname = "/signup";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/founder/:path*"],
};
