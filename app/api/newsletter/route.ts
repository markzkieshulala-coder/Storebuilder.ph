import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { createNotification } from "@/lib/notifications";

// Public — newsletter signups from the newsletter section of any published site.
export async function POST(req: NextRequest) {
  try {
    await ensureSchemaMigrations();
    const { subdomain, email, name, source } = await req.json();

    if (!subdomain || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const website = await prisma.website.findFirst({
      where: { subdomain, published: true },
    });
    if (!website) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const lcEmail = email.toLowerCase();
    try {
      await prisma.storeNewsletterSubscriber.upsert({
        where: { websiteId_email: { websiteId: website.id, email: lcEmail } },
        create: {
          websiteId: website.id,
          email: lcEmail,
          name: name ? String(name).slice(0, 200) : null,
          source: source ? String(source).slice(0, 50) : "newsletter_section",
        },
        update: {
          name: name ? String(name).slice(0, 200) : undefined,
        },
      });
      // Also seed a CRM customer record so subscribers show up there
      await prisma.storeCustomer.upsert({
        where: { websiteId_email: { websiteId: website.id, email: lcEmail } },
        create: {
          websiteId: website.id,
          email: lcEmail,
          name: name ? String(name).slice(0, 200) : null,
          tags: "subscriber",
        },
        update: {
          lastSeenAt: new Date(),
        },
      });
    } catch (e: any) {
      console.error("[newsletter] persist failed:", e);
      return NextResponse.json({ error: "Could not subscribe. Try again." }, { status: 500 });
    }

    createNotification({
      websiteId: website.id,
      type: "newsletter.subscribed",
      title: "New newsletter subscriber",
      body: name ? `${String(name).slice(0, 80)} (${lcEmail})` : lcEmail,
      href: `/dashboard/sites/${website.id}/manage/marketing`,
      metadata: { email: lcEmail, name: name ? String(name) : null },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/newsletter]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
