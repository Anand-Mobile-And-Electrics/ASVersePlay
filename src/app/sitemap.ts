import { db } from "@/db";
import { contents, liveEvents } from "@/db/schema";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const [contentRows, liveRows] = await Promise.all([
    db.select({ slug: contents.slug, updatedAt: contents.updatedAt }).from(contents).limit(5000),
    db.select({ slug: liveEvents.slug, updatedAt: liveEvents.updatedAt }).from(liveEvents).limit(5000),
  ]);

  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/live`, lastModified: new Date() },
    ...contentRows.map((row) => ({
      url: `${base}/content/${row.slug}`,
      lastModified: row.updatedAt,
    })),
    ...liveRows.map((row) => ({
      url: `${base}/live-events/${row.slug}`,
      lastModified: row.updatedAt,
    })),
  ];
}
