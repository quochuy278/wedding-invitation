import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Keep generation/build working before a developer creates their local .env.
    url: process.env.DATABASE_URL ?? "",
  },
});
