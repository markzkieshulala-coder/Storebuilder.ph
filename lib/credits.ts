import { prisma } from "./prisma";
import { Plan } from "@prisma/client";

export const FREE_DAILY_LIMIT = 2;

export function getPhilippineDate(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  }); // Returns YYYY-MM-DD
}

export function getNextResetTime(): Date {
  const now = new Date();
  // Next midnight in PH time (UTC+8)
  const phOffset = 8 * 60; // minutes
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const phNow = new Date(utcNow + phOffset * 60 * 1000);

  const nextMidnight = new Date(phNow);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);

  // Convert back to UTC
  return new Date(nextMidnight.getTime() - phOffset * 60 * 1000);
}

export async function getUserCredits(userId: string, plan: Plan) {
  if (plan === Plan.PRO) {
    return { used: 0, limit: Infinity, remaining: Infinity, canGenerate: true };
  }

  const today = getPhilippineDate();

  const usage = await prisma.creditUsage.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  const used = usage?.count ?? 0;
  const limit = FREE_DAILY_LIMIT;
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
  const today = getPhilippineDate();

  await prisma.creditUsage.upsert({
    where: { userId_date: { userId, date: today } },
    update: { count: { increment: 1 } },
    create: { userId, date: today, count: 1 },
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
        "You've used your free generations for today. Come back tomorrow for 2 fresh credits — or upgrade to Pro for unlimited generations!",
    };
  }

  await consumeCredit(userId);
  return { success: true };
}
