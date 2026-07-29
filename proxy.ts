import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  TF_AUTH_COOKIE,
  TF_ROLE_COOKIE,
} from "@/lib/auth/constants";

/**
 * Next.js 16 Proxy (formerly middleware).
 * Protects /app/* (members) and /founder/* (founder role only).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = request.cookies.get(TF_AUTH_COOKIE)?.value === "1";
  const role = request.cookies.get(TF_ROLE_COOKIE)?.value;

  if (pathname.startsWith("/founder")) {
    if (!authed) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      url.searchParams.set("founder", "1");
      return NextResponse.redirect(url);
    }
    if (role !== "founder") {
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
