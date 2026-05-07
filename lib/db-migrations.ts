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

  ran = true;
}
