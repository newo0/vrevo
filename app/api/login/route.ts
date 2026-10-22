import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import {
  allowRequest,
  hashToken,
  sameOrigin,
  verifyPassword,
  passwordHash,
} from "@/lib/auth";
const dummy = passwordHash("dummy-for-timing-check");
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return Response.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 },
    );
  if (!(await allowRequest("login", 12, 900)))
    return Response.json(
      { error: "Слишком много попыток. Повторите через 15 минут." },
      { status: 429 },
    );
  const data = await req.json().catch(() => ({}));
  const password = data.password;
  if (typeof password !== "string" || password.length > 200)
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  const admin = await db.admin.findUnique({ where: { id: "admin" } });
  const valid = verifyPassword(password, admin?.passwordHash ?? dummy);
  if (!admin || !valid)
    return Response.json({ error: "Неверный пароль" }, { status: 401 });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 3600000);
  await db.session.create({ data: { tokenHash: hashToken(token), expiresAt } });
  (await cookies()).set("vrevo_session", token, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_INSECURE_LOCAL_COOKIE !== "1",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
  return Response.json({ ok: true });
}
