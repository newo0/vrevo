import nodemailer from "nodemailer";
import { db } from "./db";
import { getContent } from "./site";
export async function deliverLead(id: string, maxAttempts = Infinity) {
  const lead = await db.lead.findUniqueOrThrow({
    where: { id },
    include: { deliveries: true },
  });
  if (lead.demo) return;
  const config = await getContent();
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        }
      : {}),
    connectionTimeout: 5000,
    socketTimeout: 8000,
  });
  for (const d of lead.deliveries) {
    if (d.status === "sent" || d.attempts >= maxAttempts) continue;
    const claimed = await db.delivery.updateMany({
      where: { id: d.id, status: { in: ["pending", "failed"] } },
      data: { status: "sending", attempts: { increment: 1 }, error: null },
    });
    if (!claimed.count) continue;
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM,
        to: d.recipient,
        subject: `${config.name} — ${lead.kind}`,
        text: `Имя: ${lead.name ?? "Не указано"}\nТелефон: ${lead.phone}\nТип: ${lead.kind}\nУчасток: ${lead.plotNumber ?? "Не выбран"} (${lead.plotStatus ?? "—"})\nДата: ${lead.date ?? "Не указана"}\nКомментарий: ${lead.comment ?? "—"}\nИсточник: ${lead.source}\nСтраница: ${lead.pageUrl}\nUTM: ${lead.utm}\nID: ${lead.id}`,
        messageId: `<${d.id}@vrevo.local>`,
      });
      await db.delivery.update({
        where: { id: d.id },
        data: { status: "sent", sentAt: new Date(), error: null },
      });
    } catch {
      await db.delivery.update({
        where: { id: d.id },
        data: {
          status: "failed",
          error:
            "SMTP не подтвердил доставку. Проверьте настройки и повторите отправку.",
        },
      });
    }
  }
}
