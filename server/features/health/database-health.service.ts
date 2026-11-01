import "server-only";

import { now } from "@/shared/utils/date";
import { databaseHealthRepository } from "./database-health.repository";

type DatabaseHealthTarget = "primary" | "development";
type DatabaseHealthStatus = "ok" | "unavailable" | "unconfigured";

export type DatabaseHealthResult = {
  status: "ok" | "degraded";
  timestamp: string;
  databases: Record<DatabaseHealthTarget, DatabaseHealthStatus>;
};

async function checkDatabase(
  target: DatabaseHealthTarget,
  connectionString: string | undefined,
): Promise<DatabaseHealthStatus> {
  if (!connectionString?.trim()) {
    console.error("Database health check is not configured:", target);
    return "unconfigured";
  }

  try {
    await databaseHealthRepository.check(connectionString);
    return "ok";
  } catch {
    console.error("Database health check failed:", target);
    return "unavailable";
  }
}

export const databaseHealthService = {
  async check(): Promise<DatabaseHealthResult> {
    const [primary, development] = await Promise.all([
      checkDatabase("primary", process.env.DATABASE_URL),
      checkDatabase("development", process.env.KEEP_ALIVE_DATABASE_URL),
    ]);
    const healthy = primary === "ok" && development === "ok";
    const timestamp: string = now().toISOString();

    return {
      status: healthy ? "ok" : "degraded",
      timestamp,
      databases: { primary, development },
    };
  },
};
