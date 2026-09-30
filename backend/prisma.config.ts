import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma CLI config (Prisma 6.19+).
 * Runtime NestJS PrismaClient still reads DATABASE_URL from process env / .env.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
