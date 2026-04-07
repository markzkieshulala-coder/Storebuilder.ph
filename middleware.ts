import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, hostname } = req.nextUrl;

  // ── Subdomain routing ────────────────────────────────────────────────────
  // e.g. ethica.storebuilder.ph  →  /sites/ethica
  const appHost = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : "storebuilder.ph";

  const isSubdomain =
    hostname !== appHost &&
    hostname !== `www.${appHost}` &&
    hostname.endsWith(`.${appHost}`);

  if (isSubdomain) {
    const subdomain = hostname.replace(`.${appHost}`, "");
    // Rewrite to our internal subdomain handler
    const url = req.nextUrl.clone();
    url.pathname = `/sites/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── Auth protection ───────────────────────────────────────────────────────
  const protectedPaths = ["/dashboard", "/editor", "/upgrade", "/admin"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Admin-only guard
    if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, public files
     * - api routes (handled by their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
