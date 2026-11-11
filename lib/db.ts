import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Returns a Prisma client, or null when DATABASE_URL is not set (the app then runs without persistence). */
export function getDb(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;
  if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient();
  return globalForPrisma.prisma;
}
