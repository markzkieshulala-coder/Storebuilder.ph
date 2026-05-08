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

  ran = true;
}
