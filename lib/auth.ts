import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "./prisma";

type DbUserRow = {
  id: string;
  role: string;
  plan: string;
  name: string | null;
  image: string | null;
};

// Case-insensitive lookup so "Foo@Gmail.com" matches "foo@gmail.com".
async function findUserByEmail(email: string): Promise<DbUserRow | null> {
  const rows = await prisma.$queryRawUnsafe<DbUserRow[]>(
    `SELECT id, role::text AS role, plan::text AS plan, name, image
       FROM "User"
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1`,
    email
  );
  return rows[0] ?? null;
}

async function createGoogleUser(email: string, name: string | null, image: string | null): Promise<DbUserRow> {
  const id = randomUUID();
  const now = new Date();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "User"
       (id, email, name, image, "emailVerified", role, plan, "isInfluencer", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'USER', 'FREE', false, $6, $6)
     ON CONFLICT (email) DO NOTHING`,
    id, email, name, image, now, now
  );
  // If ON CONFLICT skipped the insert (rare race), fetch the existing row.
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  return { id, role: "USER", plan: "FREE", name, image };
}

// We deliberately do NOT use a PrismaAdapter here. The combination of
// `@auth/prisma-adapter@2` (which targets Auth.js v5) with `next-auth@4`
// caused subtle runtime breakage in the Google OAuth flow that produced
// an endless redirect back to the sign-in page. With the JWT session
// strategy we don't actually need an adapter — we just persist / look
// up the user manually in the signIn callback, which gives us full
// control and zero version-mismatch surface.

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: true, // surface any remaining errors in server logs
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
    async signIn({ user, account }) {
      // Credentials sign-in: nothing extra to do.
      if (account?.provider !== "google") return true;
      if (!user.email) {
        console.error("[auth] Google sign-in rejected: no email on profile");
        return false;
      }

      // Use raw SQL throughout so we don't depend on the Prisma schema/DB
      // being perfectly in sync. Any error here propagates — a real error
      // from the DB is much more useful than a silent "AccessDenied".
      let dbUser = await findUserByEmail(user.email);

      if (!dbUser) {
        dbUser = await createGoogleUser(user.email, user.name ?? null, user.image ?? null);

        // Seed credit-usage record so the dashboard doesn't 404 on day-zero.
        const today = new Date().toLocaleDateString("en-CA", {
          timeZone: "Asia/Manila",
        });
        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "CreditUsage" (id, "userId", date, count, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, 0, NOW(), NOW())
             ON CONFLICT ("userId", date) DO NOTHING`,
            randomUUID(), dbUser.id, today
          );
        } catch (e) {
          console.error("[auth] CreditUsage seed failed (non-fatal):", e);
        }
      } else if (
        (user.name && dbUser.name !== user.name) ||
        (user.image && dbUser.image !== user.image)
      ) {
        // Keep profile fields in sync with Google.
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "User" SET name = $1, image = $2, "updatedAt" = NOW() WHERE id = $3`,
            user.name ?? dbUser.name,
            user.image ?? dbUser.image,
            dbUser.id
          );
        } catch (e) {
          console.error("[auth] profile sync failed (non-fatal):", e);
        }
      }

      // Promote the owner account to ADMIN on every login.
      if (
        user.email.toLowerCase() === "storebuilderph@gmail.com" &&
        dbUser.role !== "ADMIN"
      ) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "User" SET role = 'ADMIN', "updatedAt" = NOW() WHERE id = $1`,
            dbUser.id
          );
          dbUser.role = "ADMIN";
        } catch (e) {
          console.error("[auth] admin promote failed (non-fatal):", e);
        }
      }

      // Carry the DB id/role/plan into the JWT via the user object.
      user.id = dbUser.id;
      // @ts-ignore - extending the next-auth user type
      user.role = dbUser.role;
      // @ts-ignore
      user.plan = dbUser.plan;

      return true;
    },
    async jwt({ token, user }) {
      // NextAuth v4 pre-populates token.picture = user.image from the credentials
      // authorize() return value BEFORE this callback runs. If that image is a
      // data URI (e.g. a user-uploaded avatar), it can be several MB and will
      // balloon the session cookie to 180 KB+, causing HTTP 431 on every request.
      // Strip it immediately — the canonical value always comes from the DB below.
      if (typeof token.picture === "string" && token.picture.startsWith("data:")) {
        token.picture = "/api/user/avatar";
      }

      if (user) {
        // Fresh sign-in — seed token from the user object the signIn
        // callback populated above.
        token.id = user.id;
        // @ts-ignore
        token.role = user.role;
        // @ts-ignore
        token.plan = user.plan;
      }

      // ALWAYS re-read plan + role from DB so upgrades take effect immediately
      // without requiring the user to sign out and back in. Also lazily
      // resolves any deferred downgrade whose pendingPlanAt has passed.
      if (token.id) {
        // Main user fields — always safe (columns exist since v1)
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, plan: true, name: true, email: true, image: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            // @ts-ignore
            token.plan = dbUser.plan;
            token.name = dbUser.name ?? token.name;
            token.email = dbUser.email ?? token.email;
            // Avatar handling: data-URI uploads can be up to 2 MB. Putting
            // those into the JWT balloons the session cookie past Node's
            // 8 KB header limit and produces HTTP 431 on every request.
            // For data URIs we store a stable endpoint URL instead; the
            // client fetches the actual bytes from /api/user/avatar.
            const img = dbUser.image ?? null;
            if (img?.startsWith("data:")) {
              token.picture = "/api/user/avatar";
            } else if (img) {
              token.picture = img;
            }
          }
        } catch {
          // DB unavailable — ensure we still don't keep a stale data URI.
          if (typeof token.picture === "string" && token.picture.startsWith("data:")) {
            token.picture = "/api/user/avatar";
          }
        }

        // Deferred-downgrade resolution — uses raw SQL so a missing pendingPlan
        // column never crashes auth. Falls back to planExpiresAt-based downgrade
        // if pendingPlan isn't available.
        try {
          const rows = await prisma.$queryRawUnsafe<{ pendingPlan: string | null; pendingPlanAt: Date | null }[]>(
            `SELECT "pendingPlan"::text AS "pendingPlan", "pendingPlanAt" FROM "User" WHERE id = $1 LIMIT 1`,
            token.id as string
          );
          const pending = rows[0];
          if (
            pending?.pendingPlan &&
            pending.pendingPlanAt &&
            new Date(pending.pendingPlanAt).getTime() <= Date.now()
          ) {
            await prisma.$executeRawUnsafe(
              `UPDATE "User" SET plan = $1::"Plan", "pendingPlan" = NULL, "pendingPlanAt" = NULL${
                pending.pendingPlan === "FREE" ? `, "planExpiresAt" = NULL` : ""
              } WHERE id = $2`,
              pending.pendingPlan, token.id as string
            );
            // @ts-ignore
            token.plan = pending.pendingPlan;
          }
        } catch {
          // pendingPlan columns absent — try planExpiresAt fallback
          try {
            const rows = await prisma.$queryRawUnsafe<{ planExpiresAt: Date | null; plan: string }[]>(
              `SELECT "planExpiresAt", plan::text AS plan FROM "User" WHERE id = $1 LIMIT 1`,
              token.id as string
            );
            const u = rows[0];
            if (u?.plan !== "FREE" && u?.planExpiresAt && new Date(u.planExpiresAt).getTime() <= Date.now()) {
              await prisma.user.update({
                where: { id: token.id as string },
                data: { plan: "FREE", planExpiresAt: null },
              });
              // @ts-ignore
              token.plan = "FREE";
            }
          } catch { /* nothing more we can do */ }
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
        // Carry the avatar from the JWT (sourced from DB) into the session so
        // a user-uploaded profile picture survives sign-out / sign-in.
        if (token.picture) session.user.image = token.picture as string;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
};
