import { MetadataRoute } from "next";
import { db } from "@/db";
import { contents } from "@/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://as-verse-play.vercel.app";

  const data = await db.select().from(contents);

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/live`,
      lastModified: new Date(),
    },

    ...data.map((item) => ({
      url: `${siteUrl}/content/${item.slug}`,
      lastModified: item.updatedAt,
    })),
  ];
}
