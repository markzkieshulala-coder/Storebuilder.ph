import { prisma } from "./prisma";
import { Plan } from "@prisma/client";
import { getPlan } from "./plans";

// Legacy exports kept for back-compat in code that hasn't been migrated yet
export const FREE_SLOT_LIMIT = 5;
export const PRO_SLOT_LIMIT = 10;
export const ENTERPRISE_SLOT_LIMIT = 20;
export const PRO_MONTHLY_GEN_LIMIT = 10;
export const FREE_DAILY_EDIT_LIMIT = 999999;
export const PRO_DAILY_EDIT_LIMIT = 999999;

export function planSlotLimit(plan: Plan | string): number {
  return getPlan(plan as any).maxWebsitesPerMonth;
}

export function getPhilippineDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export function getPhilippineMonth(): string {
  return getPhilippineDate().slice(0, 7);
}

export function getNextResetTime(): Date {
  const phOffset = 8 * 60;
  const utcNow = Date.now();
  const phNow = new Date(utcNow + phOffset * 60 * 1000);
  const tomorrow = new Date(phNow.getFullYear(), phNow.getMonth(), phNow.getDate() + 1, 0, 0, 0, 0);
  return new Date(tomorrow.getTime() - phOffset * 60 * 1000);
}

// ── Generation credits (per-month website creation, by plan) ────────────────

export async function getUserCredits(userId: string, plan: Plan) {
  const limit = planSlotLimit(plan);
  const month = getPhilippineMonth();
  const usage = await prisma.creditUsage.findUnique({
    where: { userId_date: { userId, date: month } },
  });
  const used = usage?.count ?? 0;
  const remaining = Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    canGenerate: used < limit,
    resetAt: getNextResetTime(),
  };
}

export async function checkAndConsumeCredit(
  userId: string,
  plan: Plan,
  _currentWebsiteCount: number
): Promise<{ success: boolean; message?: string }> {
  const limit = planSlotLimit(plan);
  const month = getPhilippineMonth();
  const usage = await prisma.creditUsage.findUnique({
    where: { userId_date: { userId, date: month } },
  });
  const used = usage?.count ?? 0;

  if (used >= limit) {
    const planLabel = plan === "ENTERPRISE" ? "Enterprise" : plan === "PRO" ? "Pro" : "Free";
    const upgradeHint = plan === "FREE"
      ? "Upgrade to Pro for 10/month or Enterprise for 20/month."
      : plan === "PRO"
        ? "Upgrade to Enterprise for 20 websites per month."
        : "Resets next month.";
    return {
      success: false,
      message: `You've used all ${limit} ${planLabel} websites this month. ${upgradeHint}`,
    };
  }

  await prisma.creditUsage.upsert({
    where: { userId_date: { userId, date: month } },
    update: { count: { increment: 1 } },
    create: { userId, date: month, count: 1 },
  });

  return { success: true };
}

// ── Edit credits ────────────────────────────────────────────────────────────

async function ensureEditTable(): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "EditUsage" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "count" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("id"),
        UNIQUE ("userId", "date")
      )`
    );
    return true;
  } catch {
    return false;
  }
}

export async function getEditCredits(userId: string, _plan: Plan) {
  const limit = 999999;
  const today = getPhilippineDate();
  await ensureEditTable();
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      SELECT "count" FROM "EditUsage" WHERE "userId" = ${userId} AND "date" = ${today}
    `;
    const used = Number(rows[0]?.count ?? 0);
    return { used, limit, remaining: Math.max(0, limit - used), canEdit: used < limit };
  } catch {
    return { used: 0, limit, remaining: limit, canEdit: true };
  }
}

export async function consumeEditCredit(userId: string): Promise<void> {
  const today = getPhilippineDate();
  await ensureEditTable();
  try {
    await prisma.$executeRaw`
      INSERT INTO "EditUsage" ("id", "userId", "date", "count", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${userId}, ${today}, 1, NOW(), NOW())
      ON CONFLICT ("userId", "date") DO UPDATE SET "count" = "EditUsage"."count" + 1, "updatedAt" = NOW()
    `;
  } catch {}
}
