import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Probes the published URL of a website from the server to help diagnose
// "ERR_CONNECTION_CLOSED" / DNS / SSL problems. Returns a status object the
// dashboard can render to tell the user whether their published site is
// actually reachable.
//
// Possible status values:
//   "ok"           — HTTP 200 from the subdomain
//   "redirected"   — followed a redirect, eventually OK
//   "dns_unresolved" — could not resolve the hostname (likely missing
//                      wildcard DNS record on the apex domain)
//   "tls_error"    — TLS handshake failed (wildcard cert missing for the
//                    subdomain)
//   "connection_closed" — server closed connection (Vercel project might
//                         not have *.storebuilder.ph attached as a wildcard
//                         alias)
//   "not_published" — the website isn't marked published
//   "unknown"      — fallthrough
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const website = await prisma.website.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { id: true, subdomain: true, customDomain: true, published: true },
    });
    if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });
    if (!website.published) {
      return NextResponse.json({ status: "not_published", reachable: false });
    }

    const host = website.customDomain || `${website.subdomain}.storebuilder.ph`;
    const url = `https://${host}/`;

    let status = "unknown";
    let httpStatus: number | null = null;
    let detail: string | null = null;
    let reachable = false;

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(t);
      httpStatus = res.status;
      if (res.ok) {
        status = res.redirected ? "redirected" : "ok";
        reachable = true;
      } else if (res.status >= 500) {
        status = "server_error";
      } else if (res.status === 404) {
        status = "not_found";
      } else {
        status = "http_error";
      }
    } catch (e: any) {
      const msg = (e?.message || "").toString().toLowerCase();
      const cause = (e?.cause?.code || "").toString();
      if (cause === "ENOTFOUND" || msg.includes("getaddrinfo") || msg.includes("enotfound")) {
        status = "dns_unresolved";
        detail = "DNS could not resolve the hostname. Make sure *.storebuilder.ph points to your deployment.";
      } else if (cause === "ECONNRESET" || msg.includes("econnreset") || msg.includes("connection closed")) {
        status = "connection_closed";
        detail = "The server closed the connection during the handshake. Add this subdomain (or a *.storebuilder.ph wildcard alias) to your hosting provider.";
      } else if (msg.includes("certificate") || msg.includes("ssl") || msg.includes("tls")) {
        status = "tls_error";
        detail = "TLS handshake failed. The SSL certificate does not cover this subdomain — make sure a wildcard cert is provisioned.";
      } else if (msg.includes("aborted") || msg.includes("timeout")) {
        status = "timeout";
        detail = "Request timed out after 8 seconds.";
      } else {
        detail = e?.message || String(e);
      }
    }

    return NextResponse.json({
      status,
      reachable,
      httpStatus,
      detail,
      checkedUrl: url,
      host,
      customDomain: website.customDomain || null,
      subdomain: website.subdomain || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
