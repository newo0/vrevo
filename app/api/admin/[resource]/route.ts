import { db } from "@/lib/db";
import { authenticated, sameOrigin } from "@/lib/auth";
import {
  contentSchema,
  mediaSchema,
  plotPatch,
  postSchema,
} from "@/lib/validation";
import { deliverLead } from "@/lib/mail";
import { publicationIssues } from "@/lib/site";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
type Context = { params: Promise<{ resource: string }> };
export async function GET(_req: Request, ctx: Context) {
  if (!(await authenticated()))
    return Response.json({ error: "Требуется вход" }, { status: 401 });
  const { resource } = await ctx.params;
  const headers = { "Cache-Control": "no-store" };
  if (resource === "leads")
    return Response.json(
      await db.lead.findMany({
        include: { deliveries: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      { headers },
    );
  if (resource === "media")
    return Response.json(
      await db.media.findMany({ orderBy: { order: "asc" } }),
      { headers },
    );
  if (resource === "posts")
    return Response.json(
      await db.post.findMany({ orderBy: { date: "desc" } }),
      { headers },
    );
  if (resource === "readiness")
    return Response.json({ issues: await publicationIssues() }, { headers });
  return Response.json({ error: "Не найдено" }, { status: 404 });
}
export async function POST(req: Request, ctx: Context) {
  if (!sameOrigin(req) || !(await authenticated()))
    return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const { resource } = await ctx.params;
  try {
    if (resource === "upload") {
      if (Number(req.headers.get("content-length") ?? 0) > 12500000)
        return Response.json({ error: "Максимум 10 МБ" }, { status: 413 });
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size > 10000000)
        return Response.json(
          { error: "Выберите изображение до 10 МБ" },
          { status: 400 },
        );
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        return Response.json(
          { error: "Поддерживаются JPEG, PNG, WebP" },
          { status: 400 },
        );
      const bytes = Buffer.from(await file.arrayBuffer());
      const input = sharp(bytes, { limitInputPixels: 40000000 });
      const meta = await input.metadata();
      if (!["jpeg", "png", "webp"].includes(meta.format ?? ""))
        throw new Error("Image format");
      const id = randomUUID(),
        fileName = id + ".webp";
      const dir = path.join(process.cwd(), "storage/uploads");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, fileName),
        await input
          .rotate()
          .resize({ width: 2200, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer(),
      );
      return Response.json(
        await db.media.create({
          data: {
            id,
            file: fileName,
            title: file.name.slice(0, 200),
            category: "Территория",
            author: "",
            source: "",
            license: "",
            publicationStatus: "rights_not_confirmed",
            published: false,
          },
        }),
      );
    }
    if (Number(req.headers.get("content-length") ?? 0) > 100000)
      return new Response(null, { status: 413 });
    const data = await req.json();
    if (resource === "plots") {
      const parsed = plotPatch.parse(data.values);
      await db.plot.update({ where: { id: String(data.id) }, data: parsed });
    } else if (resource === "content") {
      await db.content.update({
        where: { id: "main" },
        data: { json: JSON.stringify(contentSchema.parse(data.values)) },
      });
    } else if (resource === "media") {
      if (data.action === "delete") {
        const item = await db.media.findUniqueOrThrow({
          where: { id: data.id },
        });
        if (await db.post.count({ where: { mediaId: item.id } }))
          return Response.json(
            { error: "Фото используется в записи строительства" },
            { status: 409 },
          );
        await db.media.delete({ where: { id: item.id } });
      } else
        await db.media.update({
          where: { id: String(data.id) },
          data: mediaSchema.parse(data.values),
        });
    } else if (resource === "posts") {
      if (data.action === "delete")
        await db.post.delete({ where: { id: String(data.id) } });
      else {
        const values = postSchema.parse(data.values);
        if (
          values.mediaId &&
          !(await db.media.findUnique({ where: { id: values.mediaId } }))
        )
          throw new Error("Media missing");
        if (data.id)
          await db.post.update({
            where: { id: String(data.id) },
            data: values,
          });
        else await db.post.create({ data: values });
      }
    } else if (resource === "leads") {
      if (data.action === "retry") await deliverLead(String(data.id));
      else
        await db.lead.update({
          where: { id: String(data.id) },
          data: { processed: data.processed === true },
        });
    } else return Response.json({ error: "Не найдено" }, { status: 404 });
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Не удалось сохранить. Проверьте значения полей." },
      { status: 400 },
    );
  }
}
