import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export const databaseHealthTimeoutMs = 5_000;

export const databaseHealthRepository = {
  async check(connectionString: string): Promise<void> {
    const adapter = new PrismaPg({
      connectionString,
      max: 1,
      connectionTimeoutMillis: databaseHealthTimeoutMs,
      query_timeout: databaseHealthTimeoutMs,
      statement_timeout: databaseHealthTimeoutMs,
    });
    const database = new PrismaClient({ adapter, log: [] });

    try {
      await database.$queryRaw`SELECT 1`;
    } finally {
      await database.$disconnect();
    }
  },
};
