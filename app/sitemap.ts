import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  return process.env.SITE_MODE === "public"
    ? [{ url: process.env.SITE_URL ?? "", changeFrequency: "weekly" }]
    : [];
}
