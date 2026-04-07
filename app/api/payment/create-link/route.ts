import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const PRICES = {
  monthly: 29900,  // ₱299.00 in centavos
  yearly: 249900,  // ₱2,499.00 in centavos
};

const DESCRIPTIONS = {
  monthly: "Storebuilder.ph Pro — Monthly Plan",
  yearly: "Storebuilder.ph Pro — Yearly Plan (Save ₱1,089)",
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.plan === "PRO") {
    return NextResponse.json({ error: "Already on Pro plan" }, { status: 400 });
  }

  const { billingCycle = "monthly" } = await req.json();
  const amount = PRICES[billingCycle as keyof typeof PRICES] || PRICES.monthly;
  const description = DESCRIPTIONS[billingCycle as keyof typeof DESCRIPTIONS] || DESCRIPTIONS.monthly;

  try {
    // Create PayMongo payment link
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
            remarks: `userId:${session.user.id}|plan:PRO|cycle:${billingCycle}`,
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

    // Save subscription record
    await prisma.subscription.create({
      data: {
        userId: session.user.id,
        paymongoId: link.id,
        status: "PENDING",
        plan: "PRO",
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
