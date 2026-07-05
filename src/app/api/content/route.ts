import { db } from "@/db";
import { contentSources, contents } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getAuthContext, hasPermission, verifyCsrf } from "@/lib/auth";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createContentSchema = z.object({
  contentType: z.enum([
    "movie",
    "web_series",
    "tv_show",
    "season",
    "episode",
    "anime",
    "live_tv",
    "live_sports",
    "concert",
    "news",
    "education",
    "music_video",
    "kids",
    "documentary",
    "trailer",
    "custom",
  ]),
  slug: z.string().min(3).max(180),
  title: z.string().min(1).max(220),
  description: z.string().max(10000).optional(),
  language: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  releaseYear: z.number().int().gte(1900).lte(2100).optional(),
  durationSeconds: z.number().int().gte(0).optional(),
  tags: z.array(z.string().max(60)).optional(),
  embedFallbackUrl: z.string().url().optional(),
  source: z.object({
    label: z.string().min(1).max(60),
    sourceKind: z.enum(["video", "embed", "hls", "dash", "rtmp", "rtsp", "iptv"]),
    sourceUrl: z.string().url(),
  }),
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Math.min(Number(url.searchParams.get("pageSize") ?? "20"), 50);
  const q = (url.searchParams.get("q") ?? "").trim();
  const contentType = url.searchParams.get("contentType");

  const conditions = [];
  if (q) {
    conditions.push(or(ilike(contents.title, `%${q}%`), ilike(contents.slug, `%${q}%`), ilike(contents.shortDescription, `%${q}%`)));
  }
  if (contentType) {
    conditions.push(eq(contents.contentType, contentType as typeof contents.$inferSelect.contentType));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: contents.id,
        slug: contents.slug,
        title: contents.title,
        contentType: contents.contentType,
        isFeatured: contents.isFeatured,
        isTrending: contents.isTrending,
        createdAt: contents.createdAt,
      })
      .from(contents)
      .where(whereClause)
      .orderBy(desc(contents.createdAt), asc(contents.title))
      .limit(pageSize)
      .offset((Math.max(page, 1) - 1) * pageSize),
    db.select({ total: count() }).from(contents).where(whereClause),
  ]);

  return NextResponse.json({
    data: rows,
    pagination: {
      page,
      pageSize,
      total: totalRows[0]?.total ?? 0,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!hasPermission(auth, "content:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!verifyCsrf(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createContentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const payload = parsed.data;

  const duplicate = await db.select({ id: contents.id }).from(contents).where(eq(contents.slug, payload.slug)).limit(1);
  if (duplicate[0]) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  const inserted = await db
    .insert(contents)
    .values({
      contentType: payload.contentType,
      slug: payload.slug,
      title: payload.title,
      description: payload.description,
      language: payload.language,
      country: payload.country,
      releaseYear: payload.releaseYear,
      durationSeconds: payload.durationSeconds,
      tags: payload.tags,
      embedFallbackUrl: payload.embedFallbackUrl,
      createdBy: auth!.userId,
    })
    .returning({ id: contents.id, slug: contents.slug, title: contents.title });

  await db.insert(contentSources).values({
    contentId: inserted[0].id,
    label: payload.source.label,
    sourceKind: payload.source.sourceKind,
    sourceUrl: payload.source.sourceUrl,
    sortOrder: 1,
    isPrimary: true,
    isActive: true,
  });

  await logAudit({
    actorUserId: auth!.userId,
    action: "content.create",
    entityType: "content",
    entityId: inserted[0].id,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1",
    userAgent: request.headers.get("user-agent"),
    details: { slug: inserted[0].slug, title: inserted[0].title },
  });

  return NextResponse.json({ ok: true, data: inserted[0] }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!hasPermission(auth, "content:delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!verifyCsrf(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const slug = new URL(request.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  const target = await db.select({ id: contents.id, slug: contents.slug }).from(contents).where(eq(contents.slug, slug)).limit(1);
  if (!target[0]) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  await db.delete(contents).where(eq(contents.id, target[0].id));

  await logAudit({
    actorUserId: auth!.userId,
    action: "content.delete",
    entityType: "content",
    entityId: target[0].id,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1",
    userAgent: request.headers.get("user-agent"),
    details: { slug: target[0].slug },
  });

  return NextResponse.json({ ok: true });
}
