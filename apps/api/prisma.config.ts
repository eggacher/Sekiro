import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    initShadowDatabase: {
      url: env("DIRECT_DATABASE_URL"),
    },
  },
});
