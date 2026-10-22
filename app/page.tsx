import Site from "@/components/Site";
import { db } from "@/lib/db";
import { getContent, getPlots, getMedia, isDemo } from "@/lib/site";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const c = await getContent();
  return {
    title: `${c.name} — участки без подряда у озера Врево`,
    description: c.introduction,
    alternates:
      process.env.SITE_MODE === "public"
        ? { canonical: process.env.SITE_URL }
        : undefined,
    robots: { index: !isDemo(), follow: !isDemo() },
    openGraph: {
      title: c.name,
      description: c.introduction,
      locale: "ru_RU",
      type: "website" as const,
    },
  };
}
export default async function Page() {
  const [content, plots, media, posts] = await Promise.all([
    getContent(),
    getPlots(),
    getMedia(),
    db.post.findMany({ where: { published: true }, orderBy: { date: "desc" } }),
  ]);
  return (
    <Site
      content={content}
      plots={plots}
      media={JSON.parse(JSON.stringify(media))}
      posts={JSON.parse(JSON.stringify(posts))}
      demo={isDemo()}
    />
  );
}
