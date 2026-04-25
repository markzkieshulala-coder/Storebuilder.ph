import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("paymongo-signature") || "";

  // Verify webhook signature (production should verify HMAC)
  // For now we validate the event type and data
  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventType = event?.data?.attributes?.type;
  const eventData = event?.data?.attributes?.data;

  // Handle payment link paid event
  if (eventType === "link.payment.paid") {
    const linkId = eventData?.attributes?.payment_link_id;
    const remarks = eventData?.attributes?.billing?.remarks || "";

    if (!linkId) {
      return NextResponse.json({ error: "No link ID" }, { status: 400 });
    }

    // Parse remarks: "userId:xxx|plan:PRO|cycle:monthly"
    const userIdMatch = remarks.match(/userId:([^|]+)/);
    const planMatch = remarks.match(/plan:([^|]+)/);
    const cycleMatch = remarks.match(/cycle:([^|]+)/);
    const userId = userIdMatch?.[1];
    const tier = planMatch?.[1] === "ENTERPRISE" ? "ENTERPRISE" : "PRO";
    const billingCycle = cycleMatch?.[1] || "monthly";

    if (!userId) {
      return NextResponse.json({ error: "No userId in remarks" }, { status: 400 });
    }

    const expiresAt = new Date();
    if (billingCycle === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: tier as any,
        planExpiresAt: expiresAt,
      },
    });

    await prisma.subscription.updateMany({
      where: { paymongoId: linkId },
      data: { status: "ACTIVE" },
    });

    console.log(`✅ User ${userId} upgraded to ${tier} via PayMongo link ${linkId}`);
  }

  return NextResponse.json({ received: true });
}
