import { prisma } from "@/lib/prisma";

let ensured = false;

export async function ensureInfluencerColumn(): Promise<void> {
  if (ensured) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isInfluencer" BOOLEAN NOT NULL DEFAULT false`
  );
  ensured = true;
}
