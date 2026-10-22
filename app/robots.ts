import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return process.env.SITE_MODE === "public"
    ? {
        rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
        sitemap: `${process.env.SITE_URL}/sitemap.xml`,
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
