import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Prisma 7: datasource.url 移到这里(schema.prisma 不再放 url)
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    initShadowDatabase: {
      url: env("DIRECT_DATABASE_URL"),
    },
  },
});
