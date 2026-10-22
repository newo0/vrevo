import "dotenv/config";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  globalDb.prisma ??
  new PrismaClient({
    adapter: new PrismaLibSQL({
      url: process.env.DATABASE_URL ?? "file:./storage/dev.db",
    }),
  });
if (process.env.NODE_ENV !== "production") globalDb.prisma = db;
