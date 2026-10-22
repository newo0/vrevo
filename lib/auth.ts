import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
export const hashToken = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(key ?? "", "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function authenticated() {
  const token = (await cookies()).get("vrevo_session")?.value;
  if (!token) return false;
  return Boolean(
    await db.session.findFirst({
      where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    }),
  );
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return (
    !!origin && origin === (process.env.SITE_URL ?? new URL(req.url).origin)
  );
}
export async function allowRequest(key: string, max: number, seconds: number) {
  return db.$transaction(async (tx) => {
    const now = new Date();
    const r = await tx.rateLimit.findUnique({ where: { key } });
    if (!r || r.resetAt <= now) {
      await tx.rateLimit.upsert({
        where: { key },
        update: { count: 1, resetAt: new Date(Date.now() + seconds * 1000) },
        create: {
          key,
          count: 1,
          resetAt: new Date(Date.now() + seconds * 1000),
        },
      });
      return true;
    }
    if (r.count >= max) return false;
    await tx.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return true;
  });
}
