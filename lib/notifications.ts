import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { getPlan } from "./plans";

// Notification system — fires on every customer-facing event so the website
// owner sees it in the bell-icon dropdown. Gated to Enterprise because the
// notification inbox lives inside the management console.
//
// Every notification carries an `href` that deep-links the user directly to
// the relevant manage page (an order, a contact message, the marketing tab).

export type NotificationKind =
  | "order.placed"
  | "order.paid"
  | "contact.submitted"
  | "newsletter.subscribed"
  | "customer.new";

export type CreateNotificationInput = {
  websiteId: string;
  type: NotificationKind;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Record<string, any> | null;
};

// Returns true on success, false on any failure (including "user is not on
// Enterprise so don't bother"). Callers should always fire-and-forget — a
// notification failure must never break the underlying business event.
export async function createNotification(input: CreateNotificationInput): Promise<boolean> {
  try {
    // Resolve the owner + plan from the website.
    const website = await prisma.website.findUnique({
      where: { id: input.websiteId },
      select: { id: true, userId: true },
    });
    if (!website) return false;

    const user = await prisma.user.findUnique({
      where: { id: website.userId },
      select: { plan: true },
    });
    // Enterprise-only — silently skip otherwise.
    if (!getPlan(user?.plan).canGenerateCRM) return false;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Notification" (id, "userId", "websiteId", type, title, body, href, metadata, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())`,
      randomUUID(),
      website.userId,
      website.id,
      input.type,
      input.title.slice(0, 250),
      input.body ? input.body.slice(0, 2000) : null,
      input.href ? input.href.slice(0, 500) : null,
      input.metadata ? JSON.stringify(input.metadata) : null
    );
    return true;
  } catch (e) {
    console.error("[notifications] create failed:", e);
    return false;
  }
}

// Helper used by the contact-form endpoint — picks a title appropriate for
// the website type so a portfolio gets "New inquiry" while a store gets
// "New contact message".
export function contactTitleFor(websiteType: string | null | undefined): string {
  const t = (websiteType || "").toUpperCase();
  if (t === "PORTFOLIO") return "New inquiry";
  if (t === "LANDING") return "New lead";
  if (t === "STORE" || t === "RESTAURANT") return "New customer message";
  if (t === "BUSINESS" || t === "SALON") return "New booking request";
  return "New contact message";
}
