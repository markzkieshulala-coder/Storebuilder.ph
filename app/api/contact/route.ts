import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GeneratedWebsite } from "@/lib/ai/generate";
import { sendContactFormEmail } from "@/lib/email";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { createNotification, contactTitleFor } from "@/lib/notifications";

// Public endpoint — submitted from the contact section of any published site.
// Routes the message to whatever email is configured in the site's contact
// settings (set via the editor's right-side "Site" panel, or whatever the user
// typed inline into the contact section).
export async function POST(req: NextRequest) {
  try {
    await ensureSchemaMigrations();
    const { subdomain, name, email, message, sectionEmail } = await req.json();

    if (!subdomain || !name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (String(message).length > 5000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const website = await prisma.website.findFirst({
      where: { subdomain, published: true },
    });
    if (!website) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const content = website.jsonContent as GeneratedWebsite;
    // Resolve recipient email priority:
    //   1. settings.contact.email   (set via editor's right Site panel)
    //   2. inline contact section email (sectionEmail param from the form)
    //   3. ContactSection data.email
    //   4. Fallback to website owner's account email (Prisma user lookup)
    const settingsEmail = (content as any)?.settings?.contact?.email as string | undefined;
    const contactSection = content.sections?.find((s) => s.type === "contact");
    const sectionContactEmail =
      sectionEmail ||
      ((contactSection?.data as any)?.email as string | undefined);

    // Prefer the merchant's configured Business Email from the Inbox
    // settings — that's the live "where do replies go" address. Fall back
    // to the editor-set settings/section email, then the account email.
    let businessEmail: string | null = null;
    let forwardContactEmails = true;
    try {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "businessEmail", "forwardContactEmails" FROM "Website" WHERE id = $1 LIMIT 1`,
        website.id
      );
      if (rows?.[0]) {
        businessEmail = rows[0].businessEmail ?? null;
        forwardContactEmails = rows[0].forwardContactEmails ?? true;
      }
    } catch {}

    let recipient = businessEmail || settingsEmail || sectionContactEmail;
    if (!recipient) {
      const owner = await prisma.user.findUnique({ where: { id: website.userId } });
      recipient = owner?.email ?? undefined;
    }
    if (!recipient) {
      return NextResponse.json(
        { error: "This store hasn't set a contact email yet." },
        { status: 400 }
      );
    }

    // Only forward if the merchant hasn't disabled email forwarding (they
    // may want everything to stay in-app via the inbox). Submission is
    // always persisted regardless.
    if (forwardContactEmails) {
      try {
        await sendContactFormEmail({
          to: recipient,
          storeName: website.name,
          fromName: String(name).slice(0, 200),
          fromEmail: email,
          message: String(message),
          subdomain: website.subdomain ?? undefined,
        });
      } catch (e) {
        console.error("[contact] forward email failed:", e);
        // Don't fail the submission if email forwarding fails — the message
        // is still saved to the inbox.
      }
    }

    // Persist the submission so the merchant's dashboard CRM can show it
    try {
      await prisma.storeContactSubmission.create({
        data: {
          websiteId: website.id,
          name: String(name).slice(0, 200),
          email: String(email).toLowerCase(),
          message: String(message),
        },
      });
      // Also seed/update the customer record so contact-only leads appear in CRM
      const lcEmail = String(email).toLowerCase();
      await prisma.storeCustomer.upsert({
        where: { websiteId_email: { websiteId: website.id, email: lcEmail } },
        create: {
          websiteId: website.id,
          email: lcEmail,
          name: String(name).slice(0, 200),
          tags: "lead",
        },
        update: {
          name: String(name).slice(0, 200),
          lastSeenAt: new Date(),
        },
      });
    } catch (e) {
      console.error("[contact] persist failed:", e);
    }

    // Bell-icon notification — title varies with website type so a portfolio
    // says "New inquiry", a landing page says "New lead", etc.
    createNotification({
      websiteId: website.id,
      type: "contact.submitted",
      title: `${contactTitleFor((website as any).type)} from ${String(name).slice(0, 80)}`,
      body: String(message).slice(0, 280),
      href: `/dashboard/sites/${website.id}/manage/inbox`,
      metadata: { name: String(name).slice(0, 200), email: String(email).toLowerCase() },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/contact]", err);
    return NextResponse.json(
      { error: "Could not send message: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}
