import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GeneratedWebsite } from "@/lib/ai/generate";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { createNotification } from "@/lib/notifications";

const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY!;

export async function POST(req: NextRequest) {
  try {
    await ensureSchemaMigrations();
    const { subdomain, productId, quantity, customerName, customerEmail, customerPhone } = await req.json();

    if (!subdomain || !productId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const website = await prisma.website.findFirst({
      where: { subdomain, published: true },
    });
    if (!website) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const content = website.jsonContent as GeneratedWebsite;
    const productsSection = content.sections.find((s) => s.type === "products");
    const products = (productsSection?.data as any)?.products || [];

    const product = products.find((p: any) => p.id === productId) || products[Number(productId)];
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const qty = Math.max(1, Math.min(99, Number(quantity) || 1));
    const unitPrice = Number(product.price) || 0;
    const totalCentavos = Math.round(unitPrice * qty * 100);

    if (totalCentavos < 2000) {
      return NextResponse.json({ error: "Minimum order amount is ₱20.00" }, { status: 400 });
    }

    const description = `${product.name}${qty > 1 ? ` × ${qty}` : ""} — ${website.name}`;
    const remarks = [
      customerName && `Customer: ${customerName}`,
      customerPhone && `Phone: ${customerPhone}`,
    ].filter(Boolean).join(" | ");

    const successUrl = `${process.env.NEXTAUTH_URL}/sites/${subdomain}/checkout/${productId}/success`;

    const pmRes = await fetch("https://api.paymongo.com/v1/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: totalCentavos,
            description,
            remarks: remarks || undefined,
            redirect: { success: successUrl, failed: successUrl },
          },
        },
      }),
    });

    if (!pmRes.ok) {
      const err = await pmRes.json();
      console.error("[checkout/product] PayMongo error", err);
      return NextResponse.json({ error: "Could not create payment link. Please try again." }, { status: 500 });
    }

    const pmData = await pmRes.json();
    const checkoutUrl = pmData.data?.attributes?.checkout_url;
    const paymongoLinkId = pmData.data?.id;

    // Persist as a PENDING order. Webhook will mark it PAID later when we wire
    // it; for now the dashboard surfaces all attempts so the merchant can see
    // demand even before PayMongo confirms payment.
    let createdOrderId: string | null = null;
    try {
      const created = await prisma.storeOrder.create({
        data: {
          websiteId: website.id,
          productId: String(productId),
          productName: product.name || "Product",
          quantity: qty,
          unitPriceCents: Math.round(unitPrice * 100),
          totalCents: totalCentavos,
          customerName: customerName || null,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          status: "PENDING",
          paymongoLinkId: paymongoLinkId || null,
          paymongoCheckoutUrl: checkoutUrl || null,
        },
        select: { id: true },
      });
      createdOrderId = created.id;
    } catch (e) {
      console.error("[checkout/product] order persist failed:", e);
    }

    if (createdOrderId) {
      const pesos = `₱${(totalCentavos / 100).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
      createNotification({
        websiteId: website.id,
        type: "order.placed",
        title: `New order from ${customerName || customerEmail || "a customer"}`,
        body: `${qty} × ${product.name || "Product"} — ${pesos}`,
        href: `/dashboard/sites/${website.id}/manage/orders/${createdOrderId}`,
        metadata: { orderId: createdOrderId, totalCents: totalCentavos },
      });
    }

    // Upsert customer record so the CRM sees this person even if payment fails
    if (customerEmail) {
      try {
        const email = String(customerEmail).toLowerCase();
        await prisma.storeCustomer.upsert({
          where: { websiteId_email: { websiteId: website.id, email } },
          create: {
            websiteId: website.id,
            email,
            name: customerName || null,
            phone: customerPhone || null,
            orderCount: 1,
            totalSpentCents: 0, // only count when PAID
          },
          update: {
            name: customerName || undefined,
            phone: customerPhone || undefined,
            orderCount: { increment: 1 },
            lastSeenAt: new Date(),
          },
        });
      } catch (e) {
        console.error("[checkout/product] customer upsert failed:", e);
      }
    }

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("[checkout/product]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
