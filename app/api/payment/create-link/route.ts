import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";

const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY!;

type Tier = "PRO" | "ENTERPRISE";
type Cycle = "monthly" | "yearly";

function priceFor(tier: Tier, cycle: Cycle): number {
  const p = PLANS[tier];
  return cycle === "yearly" ? p.yearlyPriceCentavos : p.monthlyPriceCentavos;
}

function descriptionFor(tier: Tier, cycle: Cycle): string {
  const label = PLANS[tier].label;
  const cycleLabel = cycle === "yearly" ? "Yearly" : "Monthly";
  return `Storebuilder.ph ${label} — ${cycleLabel} Plan`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const billingCycle: Cycle = body.billingCycle === "yearly" ? "yearly" : "monthly";
  const tier: Tier = body.plan === "ENTERPRISE" ? "ENTERPRISE" : "PRO";

  // Block downgrade purchases (Enterprise users buying Pro)
  if (session.user.plan === "ENTERPRISE" && tier === "PRO") {
    return NextResponse.json(
      { error: "You're already on Enterprise. Contact support to downgrade." },
      { status: 400 }
    );
  }
  // Block re-purchase of same tier
  if (session.user.plan === tier) {
    return NextResponse.json(
      { error: `You're already on the ${PLANS[tier].label} plan.` },
      { status: 400 }
    );
  }

  const amount = priceFor(tier, billingCycle);
  const description = descriptionFor(tier, billingCycle);

  try {
    const response = await fetch("https://api.paymongo.com/v1/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount,
            description,
            remarks: `userId:${session.user.id}|plan:${tier}|cycle:${billingCycle}`,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("PayMongo error:", error);
      return NextResponse.json({ error: "Failed to create payment link" }, { status: 500 });
    }

    const data = await response.json();
    const link = data.data;

    await prisma.subscription.create({
      data: {
        userId: session.user.id,
        paymongoId: link.id,
        status: "PENDING",
        plan: tier as any,
        billingCycle: billingCycle === "yearly" ? "YEARLY" : "MONTHLY",
        amount,
        currency: "PHP",
        paymentLinkUrl: link.attributes.checkout_url,
      },
    });

    return NextResponse.json({
      checkoutUrl: link.attributes.checkout_url,
      linkId: link.id,
    });
  } catch (error) {
    console.error("Payment link creation error:", error);
    return NextResponse.json({ error: "Payment service unavailable" }, { status: 500 });
  }
}
