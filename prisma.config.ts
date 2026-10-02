import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI commands use the session-mode pooler. The app uses DATABASE_URL at runtime.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
