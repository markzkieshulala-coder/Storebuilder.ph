import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { getPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

// Single endpoint that returns all the data the manage dashboard needs.
// One round-trip is faster than five and avoids waterfalls in the UI.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchemaMigrations();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const website = await prisma.website.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, name: true, type: true, subdomain: true, published: true, userId: true },
  });
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  const plan = getPlan(user?.plan);
  if (!plan.canGenerateCRM) {
    return NextResponse.json({
      error: "PLAN_REQUIRED",
      message: "The store management dashboard is an Enterprise feature.",
      currentPlan: user?.plan ?? "FREE",
    }, { status: 403 });
  }

  // Fetch orders via raw SQL so we can include the new fulfillment columns
  // (fulfillmentStatus, trackingNumber, discountCode, discountCents) which
  // were added by ensureSchemaMigrations but aren't in the Prisma schema yet.
  const websiteId = website.id;
  const fetchOrdersWithFulfillment = async () => {
    try {
      return await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, "websiteId", "productId", "productName", quantity, "unitPriceCents", "totalCents", currency,
                "customerName", "customerEmail", "customerPhone", notes, status,
                "paymongoLinkId", "paymongoCheckoutUrl", "paidAt", "createdAt", "updatedAt",
                COALESCE("fulfillmentStatus", 'UNFULFILLED') AS "fulfillmentStatus",
                "trackingNumber",
                "discountCode",
                COALESCE("discountCents", 0) AS "discountCents"
         FROM "StoreOrder"
         WHERE "websiteId" = $1
         ORDER BY "createdAt" DESC
         LIMIT 200`,
        websiteId
      );
    } catch {
      return prisma.storeOrder.findMany({
        where: { websiteId },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    }
  };

  const [orders, customers, contacts, subscribers, visits] = await Promise.all([
    fetchOrdersWithFulfillment(),
    prisma.storeCustomer.findMany({
      where: { websiteId: website.id },
      orderBy: { lastSeenAt: "desc" },
      take: 500,
    }),
    prisma.storeContactSubmission.findMany({
      where: { websiteId: website.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.storeNewsletterSubscriber.findMany({
      where: { websiteId: website.id },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.storeVisit.findMany({
      where: {
        websiteId: website.id,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
  ]);

  // Aggregate KPIs
  const paidOrders = orders.filter((o) => o.status === "PAID");
  const revenueCents = paidOrders.reduce((sum, o) => sum + o.totalCents, 0);
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;

  // 7-day trend buckets for visits
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayBuckets: { date: string; visits: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    dayBuckets.push({
      date: d.toISOString().slice(0, 10),
      visits: visits.filter((v) => v.createdAt >= d && v.createdAt < next).length,
      orders: orders.filter((o) => o.createdAt >= d && o.createdAt < next).length,
    });
  }

  // Top referrers
  const referrerCounts: Record<string, number> = {};
  for (const v of visits) {
    if (!v.referrer) continue;
    try {
      const host = new URL(v.referrer).hostname.replace(/^www\./, "");
      if (host) referrerCounts[host] = (referrerCounts[host] || 0) + 1;
    } catch {/* skip malformed */}
  }
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([host, count]) => ({ host, count }));

  return NextResponse.json({
    website,
    overview: {
      revenueCents,
      orderCount: orders.length,
      paidOrderCount: paidOrders.length,
      pendingOrderCount: pendingOrders,
      customerCount: customers.length,
      subscriberCount: subscribers.length,
      contactCount: contacts.length,
      visits30d: visits.length,
      dayBuckets,
      topReferrers,
    },
    orders,
    customers,
    contacts,
    subscribers,
  });
}
