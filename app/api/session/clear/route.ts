import { NextResponse } from "next/server";

// Emergency endpoint: wipes all next-auth session cookies and redirects to
// sign-in. Use this when the session cookie has become oversized (HTTP 431).
// Navigate to /api/auth/clear-session in your browser to clear it.
export async function GET(req: Request) {
  const base = new URL(req.url).origin;
  const response = NextResponse.redirect(`${base}/auth/signin`);

  const prefix = ["next-auth.session-token", "__Secure-next-auth.session-token"];
  const cookiesToClear: string[] = [];

  for (const p of prefix) {
    cookiesToClear.push(p);
    for (let i = 0; i <= 50; i++) cookiesToClear.push(`${p}.${i}`);
  }
  cookiesToClear.push("next-auth.csrf-token", "next-auth.callback-url");

  for (const name of cookiesToClear) {
    response.cookies.set(name, "", { maxAge: 0, path: "/" });
  }

  return response;
}
