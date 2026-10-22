import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent, getMedia, isDemo } from "@/lib/site";
import { PhotoCredit } from "@/components/Gallery";
export const dynamic = "force-dynamic";
export default async function Document({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;
  if (!["privacy", "consent", "credits"].includes(document)) notFound();
  const c = await getContent();
  const title =
    document === "privacy"
      ? "Политика обработки персональных данных"
      : document === "consent"
        ? "Согласие на обработку персональных данных"
        : "Источники фотографий";
  const text = document === "privacy" ? c.privacy : c.consent;
  return (
    <main className="document">
      <Link href="/">← {c.name}</Link>
      <h1>{title}</h1>
      {document === "credits" ? (
        (await getMedia()).map((m) => (
          <article key={m.id}>
            <PhotoCredit m={m} />
          </article>
        ))
      ) : (
        <div className="document-text">
          {text ||
            (isDemo()
              ? "Демонстрационный текст. Документ владельца проекта пока не предоставлен. В этом режиме форма сохраняет тестовое обращение и не отправляет письма. Не вводите реальные персональные данные. До публичного запуска необходимо разместить утверждённый документ."
              : "Документ временно недоступен. Для связи позвоните менеджеру.")}
        </div>
      )}
    </main>
  );
}
