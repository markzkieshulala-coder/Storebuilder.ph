import { prisma } from "./prisma";

let ran = false;

// Runs once per process boot to add schema columns / enum values that the
// real DB may be missing if `prisma db push` was never run after schema
// changes. Each statement is wrapped independently so one failure doesn't
// block the rest. All operations use IF NOT EXISTS so they're safe on a
// fully-synced DB.
export async function ensureSchemaMigrations() {
  if (ran) return;
  // Plan enum — must run outside a transaction; Prisma wraps in one so this
  // may fail on older PG versions but is harmless — the value is often already present.
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'ENTERPRISE'`);
  } catch (e) { console.error("[migrations] Plan enum:", e); }

  // Deferred-cancel columns
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingPlan" "Plan"`);
  } catch (e) { console.error("[migrations] pendingPlan col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingPlanAt" TIMESTAMPTZ`);
  } catch (e) { console.error("[migrations] pendingPlanAt col:", e); }

  // Subscription columns
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false`);
  } catch (e) { console.error("[migrations] cancelAtPeriodEnd col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMPTZ`);
  } catch (e) { console.error("[migrations] currentPeriodEnd col:", e); }

  // User profile columns — location + pending email verification
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "location" TEXT`);
  } catch (e) { console.error("[migrations] location col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingEmail" TEXT`);
  } catch (e) { console.error("[migrations] pendingEmail col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingEmailToken" TEXT`);
  } catch (e) { console.error("[migrations] pendingEmailToken col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingEmailExpires" TIMESTAMPTZ`);
  } catch (e) { console.error("[migrations] pendingEmailExpires col:", e); }

  // isInfluencer — also added by ensureInfluencerColumn but add here as safety
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isInfluencer" BOOLEAN NOT NULL DEFAULT false`);
  } catch (e) { console.error("[migrations] isInfluencer col:", e); }

  // settings JSONB — persists payment method toggles, payment links, etc.
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "settings" JSONB`);
  } catch (e) { console.error("[migrations] settings col:", e); }

  // password — used by credentials provider (legacy DBs may lack it)
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT`);
  } catch (e) { console.error("[migrations] password col:", e); }

  // ─── ENTERPRISE business-management tables ─────────────────────────────────
  // OrderStatus enum
  try {
    await prisma.$executeRawUnsafe(`DO $$ BEGIN
      CREATE TYPE "OrderStatus" AS ENUM ('PENDING','PAID','CANCELLED','REFUNDED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;`);
  } catch (e) { console.error("[migrations] OrderStatus enum:", e); }

  // StoreOrder
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StoreOrder" (
      "id" TEXT PRIMARY KEY,
      "websiteId" TEXT NOT NULL,
      "productId" TEXT,
      "productName" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "unitPriceCents" INTEGER NOT NULL,
      "totalCents" INTEGER NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'PHP',
      "customerName" TEXT,
      "customerEmail" TEXT,
      "customerPhone" TEXT,
      "notes" TEXT,
      "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
      "paymongoLinkId" TEXT,
      "paymongoCheckoutUrl" TEXT,
      "paidAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreOrder_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE
    )`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreOrder_websiteId_idx" ON "StoreOrder"("websiteId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreOrder_customerEmail_idx" ON "StoreOrder"("customerEmail")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreOrder_status_idx" ON "StoreOrder"("status")`);
  } catch (e) { console.error("[migrations] StoreOrder:", e); }

  // StoreCustomer
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StoreCustomer" (
      "id" TEXT PRIMARY KEY,
      "websiteId" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "phone" TEXT,
      "totalSpentCents" INTEGER NOT NULL DEFAULT 0,
      "orderCount" INTEGER NOT NULL DEFAULT 0,
      "firstSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "tags" TEXT,
      "notes" TEXT,
      CONSTRAINT "StoreCustomer_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE,
      CONSTRAINT "StoreCustomer_websiteId_email_key" UNIQUE ("websiteId","email")
    )`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreCustomer_websiteId_idx" ON "StoreCustomer"("websiteId")`);
  } catch (e) { console.error("[migrations] StoreCustomer:", e); }

  // StoreContactSubmission
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StoreContactSubmission" (
      "id" TEXT PRIMARY KEY,
      "websiteId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "read" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreContactSubmission_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE
    )`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreContactSubmission_websiteId_idx" ON "StoreContactSubmission"("websiteId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreContactSubmission_createdAt_idx" ON "StoreContactSubmission"("createdAt")`);
  } catch (e) { console.error("[migrations] StoreContactSubmission:", e); }

  // StoreNewsletterSubscriber
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StoreNewsletterSubscriber" (
      "id" TEXT PRIMARY KEY,
      "websiteId" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "source" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreNewsletterSubscriber_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE,
      CONSTRAINT "StoreNewsletterSubscriber_websiteId_email_key" UNIQUE ("websiteId","email")
    )`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreNewsletterSubscriber_websiteId_idx" ON "StoreNewsletterSubscriber"("websiteId")`);
  } catch (e) { console.error("[migrations] StoreNewsletterSubscriber:", e); }

  // StoreVisit
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StoreVisit" (
      "id" TEXT PRIMARY KEY,
      "websiteId" TEXT NOT NULL,
      "path" TEXT NOT NULL,
      "referrer" TEXT,
      "userAgent" TEXT,
      "country" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreVisit_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE
    )`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreVisit_websiteId_createdAt_idx" ON "StoreVisit"("websiteId","createdAt")`);
  } catch (e) { console.error("[migrations] StoreVisit:", e); }

  // ─── ENTERPRISE store CRM — Products + Discounts ───────────────────────────
  // StoreProduct: full product catalog with inventory tracking. Replaces the
  // ad-hoc "products in jsonContent" approach so admins can edit stock /
  // status / pricing without re-generating the site.
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StoreProduct" (
      "id" TEXT PRIMARY KEY,
      "websiteId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "sku" TEXT,
      "priceCents" INTEGER NOT NULL DEFAULT 0,
      "compareAtCents" INTEGER,
      "currency" TEXT NOT NULL DEFAULT 'PHP',
      "stock" INTEGER NOT NULL DEFAULT 0,
      "trackInventory" BOOLEAN NOT NULL DEFAULT true,
      "imageUrl" TEXT,
      "images" JSONB,
      "category" TEXT,
      "tags" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "weightGrams" INTEGER,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreProduct_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE
    )`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreProduct_websiteId_idx" ON "StoreProduct"("websiteId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreProduct_status_idx" ON "StoreProduct"("status")`);
  } catch (e) { console.error("[migrations] StoreProduct:", e); }

  // StoreDiscount: percentage / fixed-amount coupons. Validated at checkout
  // time. `usageLimit` and `usageCount` cap how many times a code can be used.
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StoreDiscount" (
      "id" TEXT PRIMARY KEY,
      "websiteId" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'PERCENT',
      "value" INTEGER NOT NULL,
      "minOrderCents" INTEGER,
      "usageLimit" INTEGER,
      "usageCount" INTEGER NOT NULL DEFAULT 0,
      "startsAt" TIMESTAMPTZ,
      "endsAt" TIMESTAMPTZ,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoreDiscount_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE,
      CONSTRAINT "StoreDiscount_websiteId_code_key" UNIQUE ("websiteId","code")
    )`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreDiscount_websiteId_idx" ON "StoreDiscount"("websiteId")`);
  } catch (e) { console.error("[migrations] StoreDiscount:", e); }

  // Extra columns on StoreOrder used by the new admin Order detail page —
  // fulfillment status + shipping fields. All optional, all nullable.
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "StoreOrder" ADD COLUMN IF NOT EXISTS "fulfillmentStatus" TEXT NOT NULL DEFAULT 'UNFULFILLED'`);
  } catch (e) { console.error("[migrations] fulfillmentStatus col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "StoreOrder" ADD COLUMN IF NOT EXISTS "shippingAddress" JSONB`);
  } catch (e) { console.error("[migrations] shippingAddress col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "StoreOrder" ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT`);
  } catch (e) { console.error("[migrations] trackingNumber col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "StoreOrder" ADD COLUMN IF NOT EXISTS "discountCode" TEXT`);
  } catch (e) { console.error("[migrations] discountCode col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "StoreOrder" ADD COLUMN IF NOT EXISTS "discountCents" INTEGER NOT NULL DEFAULT 0`);
  } catch (e) { console.error("[migrations] discountCents col:", e); }

  // Notification — central inbox for the website owner. Anything that happens
  // on a published Enterprise website (orders, contact messages, newsletter
  // signups, etc.) creates a row here so it appears in the bell-icon dropdown.
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "websiteId" TEXT,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "body" TEXT,
      "href" TEXT,
      "metadata" JSONB,
      "read" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "readAt" TIMESTAMPTZ,
      CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
      CONSTRAINT "Notification_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE
    )`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId","createdAt" DESC)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId","read")`);
  } catch (e) { console.error("[migrations] Notification:", e); }

  // LoginEvent — per-sign-in audit trail. Used for the admin Login History
  // panel and the sign-in notification email. Captures device, browser, OS,
  // IP, and best-effort geolocation.
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "LoginEvent" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "ip" TEXT,
      "userAgent" TEXT,
      "browser" TEXT,
      "os" TEXT,
      "device" TEXT,
      "location" TEXT,
      "provider" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LoginEvent_userId_createdAt_idx" ON "LoginEvent"("userId","createdAt" DESC)`);
  } catch (e) { console.error("[migrations] LoginEvent:", e); }

  // Email verification token used by the "Send Verification" flow. Separate
  // from pendingEmail* fields, which are reserved for email-CHANGE flows.
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyToken" TEXT`);
  } catch (e) { console.error("[migrations] emailVerifyToken col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyExpires" TIMESTAMPTZ`);
  } catch (e) { console.error("[migrations] emailVerifyExpires col:", e); }

  // PaymentMethod-removal verification token. Held on the User row briefly
  // while we wait for the user to click the confirm link in their email.
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentRemovalToken" TEXT`);
  } catch (e) { console.error("[migrations] paymentRemovalToken col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentRemovalExpires" TIMESTAMPTZ`);
  } catch (e) { console.error("[migrations] paymentRemovalExpires col:", e); }

  ran = true;
}
