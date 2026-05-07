import { prisma } from "./prisma";

let ran = false;

// Runs once per process boot to add schema columns / enum values that the
// real DB may be missing if `prisma db push` was never run after schema
// changes. Each statement is wrapped independently so one failure doesn't
// block the rest. All operations use IF NOT EXISTS so they're safe on a
// fully-synced DB.
export async function ensureSchemaMigrations() {
  if (ran) return;
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'ENTERPRISE'`);
  } catch (e) { console.error("[migrations] Plan enum:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingPlan" "Plan"`);
  } catch (e) { console.error("[migrations] pendingPlan col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingPlanAt" TIMESTAMPTZ`);
  } catch (e) { console.error("[migrations] pendingPlanAt col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false`);
  } catch (e) { console.error("[migrations] cancelAtPeriodEnd col:", e); }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMPTZ`);
  } catch (e) { console.error("[migrations] currentPeriodEnd col:", e); }
  ran = true;
}
