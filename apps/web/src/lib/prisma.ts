import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getResolvedDatabaseUrl() {
  return process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL;
}

export function getResolvedDatabaseSource() {
  if (process.env.PRISMA_DATABASE_URL) {
    return "PRISMA_DATABASE_URL";
  }

  if (process.env.DATABASE_URL) {
    return "DATABASE_URL";
  }

  return "unset";
}

const resolvedDatabaseUrl = getResolvedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(resolvedDatabaseUrl
      ? {
          datasources: {
            db: { url: resolvedDatabaseUrl }
          }
        }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
