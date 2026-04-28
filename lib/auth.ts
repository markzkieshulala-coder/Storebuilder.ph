import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

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
      if (!user.email) return false;

      try {
        // Find existing user by email, or create a fresh row for new Google users.
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true, plan: true, name: true, image: true },
        });

        if (!dbUser) {
          const created = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? null,
              image: user.image ?? null,
              emailVerified: new Date(),
            },
            select: { id: true, role: true, plan: true, name: true, image: true },
          });
          dbUser = created;

          // Seed credit-usage record so the dashboard doesn't 404 on day-zero.
          const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Manila",
          });
          try {
            await prisma.creditUsage.create({
              data: { userId: dbUser.id, date: today, count: 0 },
            });
          } catch {}
        } else if (
          (user.name && dbUser.name !== user.name) ||
          (user.image && dbUser.image !== user.image)
        ) {
          // Keep profile fields in sync with Google.
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              name: user.name ?? dbUser.name,
              image: user.image ?? dbUser.image,
            },
          });
        }

        // Promote the owner account to ADMIN on every login.
        if (
          user.email === "Storebuilderph@gmail.com" &&
          dbUser.role !== "ADMIN"
        ) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { role: "ADMIN" },
          });
          dbUser.role = "ADMIN" as typeof dbUser.role;
        }

        // Carry the DB id/role/plan into the JWT via the user object.
        user.id = dbUser.id;
        // @ts-ignore - extending the next-auth user type
        user.role = dbUser.role;
        // @ts-ignore
        user.plan = dbUser.plan;

        return true;
      } catch (e) {
        console.error("[auth] signIn google callback failed:", e);
        return false;
      }
    },
    async jwt({ token, user }) {
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
};
