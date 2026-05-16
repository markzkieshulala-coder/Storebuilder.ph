import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    // Neon free-tier databases suspend after inactivity and can take a few
    // seconds to wake on the first connection. A longer connect timeout
    // prevents spurious "Can't reach database server" errors.
    datasources: {
      db: {
        url: (() => {
          const url = process.env.DATABASE_URL ?? "";
          // Inject connect_timeout=30 if not already present
          if (!url || url.includes("connect_timeout")) return url;
          const sep = url.includes("?") ? "&" : "?";
          return `${url}${sep}connect_timeout=30&pool_timeout=30`;
        })(),
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
