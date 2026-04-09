import { prisma } from "./prisma";
import { Plan } from "@prisma/client";

export const FREE_MONTHLY_LIMIT = 3;

export function getPhilippineDate(): string {
  // Returns YYYY-MM for monthly tracking
  const full = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
  return full.slice(0, 7); // "YYYY-MM"
}

export function getNextResetTime(): Date {
  const now = new Date();
  const phOffset = 8 * 60;
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const phNow = new Date(utcNow + phOffset * 60 * 1000);

  // First day of next month in PH time
  const nextMonth = new Date(phNow.getFullYear(), phNow.getMonth() + 1, 1, 0, 0, 0, 0);
  return new Date(nextMonth.getTime() - phOffset * 60 * 1000);
}

export async function getUserCredits(userId: string, plan: Plan) {
  if (plan === Plan.PRO) {
    return { used: 0, limit: 30, remaining: 30, canGenerate: true };
  }

  const month = getPhilippineDate();

  const usage = await prisma.creditUsage.findUnique({
    where: { userId_date: { userId, date: month } },
  });

  const used = usage?.count ?? 0;
  const limit = FREE_MONTHLY_LIMIT;
  const remaining = Math.max(0, limit - used);

  return {
    used,
    limit,
    remaining,
    canGenerate: used < limit,
    resetAt: getNextResetTime(),
  };
}

export async function consumeCredit(userId: string): Promise<void> {
  const month = getPhilippineDate();

  await prisma.creditUsage.upsert({
    where: { userId_date: { userId, date: month } },
    update: { count: { increment: 1 } },
    create: { userId, date: month, count: 1 },
  });
}

export async function checkAndConsumeCredit(
  userId: string,
  plan: Plan
): Promise<{ success: boolean; message?: string }> {
  if (plan === Plan.PRO) {
    return { success: true };
  }

  const credits = await getUserCredits(userId, plan);

  if (!credits.canGenerate) {
    return {
      success: false,
      message:
        "You have used all 3 free generations for this month. Upgrade to Pro for 30 generations per day.",
    };
  }

  await consumeCredit(userId);
  return { success: true };
}
