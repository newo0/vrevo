import { db } from "./db";
import type { SiteContent, Plot } from "./types";
export const isDemo = () => process.env.SITE_MODE !== "public";
export async function getContent() {
  const c = await db.content.findUniqueOrThrow({ where: { id: "main" } });
  return {
    metrikaId: "",
    analyticsEnabled: false,
    ...JSON.parse(c.json),
  } as SiteContent;
}
export async function getPlots(): Promise<Plot[]> {
  return (await db.plot.findMany({ orderBy: { number: "asc" } })).map((p) => ({
    ...p,
    updatedAt: p.updatedAt.toISOString(),
  }));
}
export async function getMedia() {
  return db.media.findMany({
    where: {
      published: true,
      ...(!isDemo()
        ? {
            publicationStatus: {
              in: [
                "allowed_with_attribution_and_sharealike",
                "rights_confirmed",
              ],
            },
          }
        : {}),
    },
    orderBy: { order: "asc" },
  });
}
export async function publicationIssues() {
  const c = await getContent();
  const issues: string[] = [];
  if (!c.geometryReviewed)
    issues.push(
      "Сверить все контуры, повтор номера 134 и пропуск 127 с владельцем генплана.",
    );
  if (!c.privacy || !c.consent || !c.legalDetails)
    issues.push("Добавить реальные реквизиты, политику и согласие.");
  if (!(await db.admin.count())) issues.push("Создать администратора.");
  if (await db.admin.count({ where: { bootstrap: true } }))
    issues.push(
      "Заменить временный пароль локальной демонстрации командой admin:create.",
    );
  const recipients = (process.env.LEAD_RECIPIENTS ?? "")
    .split(",")
    .map((x) => x.trim());
  if (
    !recipients.includes("d@popov.tel") ||
    !recipients.includes("tichvlad@mail.ru") ||
    !process.env.SMTP_HOST ||
    !process.env.SMTP_FROM
  )
    issues.push("Подключить SMTP и обе почты получателей.");
  if (!process.env.SITE_URL?.startsWith("https://"))
    issues.push("Задать публичный HTTPS SITE_URL.");
  if (
    await db.media.count({
      where: { published: true, publicationStatus: "rights_not_confirmed" },
    })
  )
    issues.push(
      "Подтвердить права либо снять публикацию непроверенных фотографий.",
    );
  const hero = await db.media.findUnique({ where: { id: "P01" } });
  if (!hero?.published || hero.publicationStatus !== "rights_confirmed")
    issues.push("Заменить/подтвердить главный снимок Врево P01.");
  return issues;
}
