import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    initShadowDb: {
      url: env("DIRECT_DATABASE_URL"),
    },
    seed: "tsx prisma/seed.ts",
  },
});
