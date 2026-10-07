import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

type PrismaGlobal = typeof globalThis & {
  prisma: PrismaClient | undefined;
};
const globalForPrisma: PrismaGlobal = globalThis as PrismaGlobal;

function createPrismaClient(): PrismaClient {
  const connectionString: string | undefined = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured. Copy .env.example to .env and update it.");
  }

  const adapter = new PrismaPg({ connectionString, max: 1 });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
