import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Ensure the refresh_token_expires_in column exists — this was the field
// Google sends that caused the sign-in loop before it was added to schema.
async function ensureAccountColumns() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "refresh_token_expires_in" INTEGER`
    );
  } catch {}
}

ensureAccountColumns();

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
