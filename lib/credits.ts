import { prisma } from "./prisma";
import { Plan } from "@prisma/client";

// Website slot limits
export const FREE_SLOT_LIMIT = 5;
export const PRO_SLOT_LIMIT = 10;

// Monthly generation credits (PRO only — 10 per 30-day rolling window)
export const PRO_MONTHLY_GEN_LIMIT = 10;

// Daily edit limits
export const FREE_DAILY_EDIT_LIMIT = 5;
export const PRO_DAILY_EDIT_LIMIT = 30;

export function getPhilippineDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }); // YYYY-MM-DD
}

export function getPhilippineMonth(): string {
  return getPhilippineDate().slice(0, 7); // YYYY-MM
}

export function getNextResetTime(): Date {
  const phOffset = 8 * 60;
  const utcNow = Date.now();
  const phNow = new Date(utcNow + phOffset * 60 * 1000);
  const tomorrow = new Date(phNow.getFullYear(), phNow.getMonth(), phNow.getDate() + 1, 0, 0, 0, 0);
  return new Date(tomorrow.getTime() - phOffset * 60 * 1000);
}

// ── Generation credits (PRO: 10 per 30-day rolling window) ──────────────────

export async function getUserCredits(userId: string, plan: Plan) {
  const today = getPhilippineDate();

  // PRO: 10 generation credits per calendar month
  if (plan === Plan.PRO) {
    const month = getPhilippineMonth();
    const usage = await prisma.creditUsage.findUnique({
      where: { userId_date: { userId, date: month } },
    });
    const used = usage?.count ?? 0;
    const remaining = Math.max(0, PRO_MONTHLY_GEN_LIMIT - used);
    return { used, limit: PRO_MONTHLY_GEN_LIMIT, remaining, canGenerate: used < PRO_MONTHLY_GEN_LIMIT, resetAt: getNextResetTime() };
  }

  // FREE: no monthly generation credits — slot count is the only limit
  // (we just return a dummy so the UI has something to display)
  return { used: 0, limit: FREE_SLOT_LIMIT, remaining: FREE_SLOT_LIMIT, canGenerate: true, resetAt: getNextResetTime() };
}

export async function checkAndConsumeCredit(
  userId: string,
  plan: Plan,
  currentWebsiteCount: number
): Promise<{ success: boolean; message?: string }> {
  const slotLimit = plan === Plan.PRO ? PRO_SLOT_LIMIT : FREE_SLOT_LIMIT;

  if (currentWebsiteCount >= slotLimit) {
    return {
      success: false,
      message: plan === Plan.PRO
        ? `You've reached your ${PRO_SLOT_LIMIT} website slot limit. Delete a website to generate a new one.`
        : `Free plan allows up to ${FREE_SLOT_LIMIT} websites. Delete one or upgrade to Pro.`,
    };
  }

  if (plan === Plan.PRO) {
    const month = getPhilippineMonth();
    const usage = await prisma.creditUsage.findUnique({
      where: { userId_date: { userId, date: month } },
    });
    if ((usage?.count ?? 0) >= PRO_MONTHLY_GEN_LIMIT) {
      return {
        success: false,
        message: `You've used all ${PRO_MONTHLY_GEN_LIMIT} monthly generation credits. Resets next month.`,
      };
    }
    await prisma.creditUsage.upsert({
      where: { userId_date: { userId, date: month } },
      update: { count: { increment: 1 } },
      create: { userId, date: month, count: 1 },
    });
  }

  return { success: true };
}

// ── Edit credits (per 24-hour period, PH timezone) ──────────────────────────

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

export async function getEditCredits(userId: string, plan: Plan) {
  const limit = plan === Plan.PRO ? PRO_DAILY_EDIT_LIMIT : FREE_DAILY_EDIT_LIMIT;
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
  } catch {
    // Silently fail — don't block the user if tracking fails
  }
}
