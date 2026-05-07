import { NextRequest, NextResponse } from "next/server";

// Subdomain rewrite middleware. When a request comes in to
// <subdomain>.storebuilder.ph (or a *.localhost variant during dev), we
// rewrite the URL internally so it's served by `app/sites/[subdomain]`.
// This is what makes `jessica-pearson.storebuilder.ph` resolve to the user's
// published site without a separate Next.js app per tenant.
//
// Hosts that should NEVER be treated as a tenant subdomain:
const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "api", "admin", "static", "assets", "cdn",
  "mail", "email", "blog", "docs", "help", "status", "owner",
  "dashboard", "auth", "login", "signin", "signup", "register",
]);

const APEX_DOMAINS = ["storebuilder.ph", "www.storebuilder.ph"];

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const url = req.nextUrl;
  const hostname = host.split(":")[0].toLowerCase();

  // Skip if the request is already targeting an app/api route — never rewrite
  // /api, /editor, /dashboard, /sites, etc. Those should always serve directly
  // regardless of host.
  const path = url.pathname;
  if (
    path.startsWith("/api/") ||
    path.startsWith("/_next/") ||
    path === "/_next" ||
    path.startsWith("/sites/") ||
    path.startsWith("/static/") ||
    path === "/favicon.ico" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // Apex / www → no rewrite, render the normal site
  if (APEX_DOMAINS.includes(hostname)) {
    return NextResponse.next();
  }

  // Local dev shortcut: *.localhost (e.g. jessica-pearson.localhost:3000)
  let subdomain: string | null = null;
  if (hostname.endsWith(".storebuilder.ph")) {
    subdomain = hostname.slice(0, -".storebuilder.ph".length);
  } else if (hostname.endsWith(".localhost")) {
    subdomain = hostname.slice(0, -".localhost".length);
  }

  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) {
    return NextResponse.next();
  }

  // Rewrite URL: <sub>.storebuilder.ph/foo  →  /sites/<sub>/foo
  // Preserve the existing path so /services etc. land on the right route.
  const newPath = path === "/" ? `/sites/${subdomain}` : `/sites/${subdomain}${path}`;
  const rewritten = url.clone();
  rewritten.pathname = newPath;
  return NextResponse.rewrite(rewritten);
}

export const config = {
  // Run on every path EXCEPT obviously-static asset URLs. The function above
  // also short-circuits for /api etc., but the matcher trims them at the edge
  // so we don't pay middleware cost for static files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
