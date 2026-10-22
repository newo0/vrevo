import { defineConfig } from "prisma/config";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import "dotenv/config";
process.env.CHECKPOINT_DISABLE ??= "1";
export default defineConfig({
  schema: "prisma/schema.prisma",
  experimental: { adapter: true },
  engine: "js",
  adapter: async () =>
    new PrismaLibSQL({
      url: process.env.DATABASE_URL ?? "file:./storage/dev.db",
    }),
});
