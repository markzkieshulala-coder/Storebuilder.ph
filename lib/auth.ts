import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "./prisma";

// Known Account table columns. Strip any extra fields Google/other providers
// send that Prisma doesn't know about (e.g. refresh_token_expires_in was the
// one that caused the sign-in loop before the schema was updated).
const ACCOUNT_FIELDS = new Set([
  "userId", "type", "provider", "providerAccountId",
  "refresh_token", "access_token", "expires_at", "token_type",
  "scope", "id_token", "session_state", "refresh_token_expires_in",
]);

let columnsEnsured = false;
async function ensureAccountColumnsOnce() {
  if (columnsEnsured) return;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "refresh_token_expires_in" INTEGER`
    );
  } catch {}
  columnsEnsured = true;
}

function makeAdapter() {
  // @ts-expect-error - PrismaAdapter type mismatch between next-auth versions
  const base = PrismaAdapter(prisma);
  return {
    ...base,

    // getUserByAccount runs FIRST in the OAuth flow (before linkAccount).
    // It does a full Prisma SELECT on Account including refresh_token_expires_in.
    // If that column doesn't exist in the DB yet, the query fails and the entire
    // OAuth flow falls through to the error page. Ensure the column exists here.
    async getUserByAccount(providerAccount: { provider: string; providerAccountId: string }) {
      await ensureAccountColumnsOnce();
      return (base as any).getUserByAccount(providerAccount);
    },

    async linkAccount(account: any) {
      // Column is already guaranteed by getUserByAccount, but call again for
      // the edge case where linkAccount is reached without getUserByAccount.
      await ensureAccountColumnsOnce();

      // Strip any provider-specific fields that aren't in the Account schema
      const data: Record<string, any> = {};
      for (const key of Object.keys(account)) {
        if (ACCOUNT_FIELDS.has(key)) data[key] = account[key];
      }

      // JS-generated UUID — avoids depending on pgcrypto / gen_random_uuid()
      const id = randomUUID();

      await prisma.$executeRawUnsafe(
        `INSERT INTO "Account" (id, "userId", type, provider, "providerAccountId",
           refresh_token, access_token, expires_at, token_type, scope, id_token,
           session_state, refresh_token_expires_in)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (provider, "providerAccountId") DO UPDATE SET
           "userId" = EXCLUDED."userId",
           type = EXCLUDED.type,
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           expires_at = EXCLUDED.expires_at,
           token_type = EXCLUDED.token_type,
           scope = EXCLUDED.scope,
           id_token = EXCLUDED.id_token,
           session_state = EXCLUDED.session_state,
           refresh_token_expires_in = EXCLUDED.refresh_token_expires_in`,
        id,
        data.userId ?? null,
        data.type ?? null,
        data.provider ?? null,
        data.providerAccountId ?? null,
        data.refresh_token ?? null,
        data.access_token ?? null,
        data.expires_at ?? null,
        data.token_type ?? null,
        data.scope ?? null,
        data.id_token ?? null,
        data.session_state ?? null,
        data.refresh_token_expires_in ?? null,
      );

      // NextAuth v4 expects linkAccount to return the account or void.
      return data as any;
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: makeAdapter() as any,
  debug: true, // temporary — shows full NextAuth errors in server logs
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("No account found with this email");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error("Incorrect password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          plan: user.plan,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Auto-promote the owner account to ADMIN on every login
      if (user.email === "Storebuilderph@gmail.com") {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, role: true },
          });
          if (dbUser && dbUser.role !== "ADMIN") {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { role: "ADMIN" },
            });
          }
        } catch {}
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        // Fresh sign-in — seed token from user object
        token.id = user.id;
        // @ts-ignore
        token.role = user.role;
        // @ts-ignore
        token.plan = user.plan;
        if (user.email === "Storebuilderph@gmail.com") {
          token.role = "ADMIN";
        }
      }

      // ALWAYS re-read plan + role from DB so upgrades take effect immediately
      // without requiring the user to sign out and back in.
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, plan: true, name: true, email: true, image: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.plan = dbUser.plan;
            token.name = dbUser.name ?? token.name;
            token.email = dbUser.email ?? token.email;
            token.picture = dbUser.image ?? token.picture;
          }
        } catch {
          // DB unavailable — keep existing token values
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.user.plan = token.plan;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Initialize credit usage record for new users
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Manila",
      }); // YYYY-MM-DD in PH time
      try {
        await prisma.creditUsage.upsert({
          where: { userId_date: { userId: user.id!, date: today } },
          update: {},
          create: { userId: user.id!, date: today, count: 0 },
        });
      } catch {}
    },
  },
};
