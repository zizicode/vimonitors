// apps/api/src/lib/prisma.ts
import { env } from '../../src/env.js';
import { PrismaClient } from "../../src/migration/prisma/client.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

console.log("-==-", env?.NODE_ENV)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env?.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env?.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}