import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { authenticated } from "@/lib/auth";
import { isDemo } from "@/lib/site";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!/^[\w.-]+\.(jpg|jpeg|png|webp)$/.test(file))
    return new Response(null, { status: 404 });
  const media = await db.media.findFirst({ where: { file } });
  if (!media) return new Response(null, { status: 404 });
  const allowed =
    media.published &&
    (isDemo() ||
      ["rights_confirmed", "allowed_with_attribution_and_sharealike"].includes(
        media.publicationStatus,
      ));
  if (!allowed && !(await authenticated()))
    return new Response(null, { status: 404 });
  try {
    const dir = file.endsWith(".webp") ? "storage/uploads" : "assets/photos";
    const buffer = await readFile(path.join(process.cwd(), dir, file));
    const optimized = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    return new Response(optimized, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
