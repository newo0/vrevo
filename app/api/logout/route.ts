import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashToken, sameOrigin } from "@/lib/auth";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  const c = await cookies();
  const token = c.get("vrevo_session")?.value;
  if (token)
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  c.delete("vrevo_session");
  return Response.json({ ok: true });
}
