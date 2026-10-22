import { after } from "next/server";
import { db } from "@/lib/db";
import { allowRequest, hashToken, sameOrigin } from "@/lib/auth";
import { leadSchema } from "@/lib/validation";
import { isDemo, publicationIssues } from "@/lib/site";
import { deliverLead } from "@/lib/mail";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return Response.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 },
    );
  if (Number(req.headers.get("content-length") ?? 0) > 10000)
    return new Response(null, { status: 413 });
  const parsed = leadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы" },
      { status: 400 },
    );
  const data = parsed.data;
  const demo = isDemo();
  if (!demo && (await publicationIssues()).length)
    return Response.json(
      {
        error:
          "Онлайн-запись временно недоступна. Пожалуйста, позвоните менеджеру.",
      },
      { status: 503 },
    );
  const digest = hashToken(JSON.stringify(data));
  const existing = await db.lead.findUnique({
    where: { requestKey: data.requestKey },
  });
  if (existing)
    return existing.payloadHash === digest
      ? Response.json({ ok: true, demo: existing.demo })
      : Response.json(
          {
            error:
              "Эта заявка уже принята. Обновите форму для нового обращения.",
          },
          { status: 409 },
        );
  // A global persisted limiter avoids trusting spoofable forwarded headers; per-phone limiter limits abuse.
  if (
    !(await allowRequest("leads:global", 60, 3600)) ||
    !(await allowRequest("leads:" + hashToken(data.phone), 5, 3600))
  )
    return Response.json(
      { error: "Слишком много обращений. Попробуйте позднее или позвоните." },
      { status: 429 },
    );
  try {
    const lead = await db.$transaction(async (tx) => {
      const plot = data.plotId
        ? await tx.plot.findUnique({ where: { id: data.plotId } })
        : null;
      if (data.plotId && !plot) throw new Error("PLOT_MISSING");
      if (["plot", "availability"].includes(data.kind) && !plot)
        throw new Error("PLOT_MISSING");
      if (
        plot &&
        (plot.status === "sold" ||
          !["available", "reserved"].includes(plot.status))
      )
        throw new Error("PLOT_UNAVAILABLE");
      if (plot && data.kind === "plot" && plot.status === "reserved")
        throw new Error("PLOT_CHANGED");
      const recipients = (process.env.LEAD_RECIPIENTS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return tx.lead.create({
        data: {
          requestKey: data.requestKey,
          payloadHash: digest,
          name: data.name,
          phone: data.phone,
          date: data.date || null,
          comment: data.comment,
          plotId: plot?.id,
          plotNumber: plot?.number,
          plotStatus: plot?.status,
          kind: data.kind,
          source: data.source,
          pageUrl: data.pageUrl.split("?")[0],
          utm: JSON.stringify(data.utm),
          demo,
          deliveries: demo
            ? undefined
            : { create: recipients.map((recipient) => ({ recipient })) },
        },
      });
    });
    if (!demo) after(() => deliverLead(lead.id));
    return Response.json({ ok: true, demo }, { status: 201 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code.startsWith("PLOT_"))
      return Response.json(
        {
          error:
            code === "PLOT_CHANGED"
              ? "Статус изменился: участок забронирован. Обновите данные и уточните доступность."
              : "Участок недоступен. Выберите другой или запишитесь на общий просмотр.",
        },
        { status: 409 },
      );
    const saved = await db.lead.findUnique({
      where: { requestKey: data.requestKey },
    });
    if (saved && saved.payloadHash === digest)
      return Response.json({ ok: true, demo: saved.demo });
    return Response.json(
      {
        error: "Не удалось сохранить заявку. Повторите попытку или позвоните.",
      },
      { status: 503 },
    );
  }
}
