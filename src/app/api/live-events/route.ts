import { db } from "@/db";
import { liveEventStreams, liveEvents } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getAuthContext, hasPermission, verifyCsrf } from "@/lib/auth";
import { asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createLiveEventSchema = z.object({
  slug: z.string().min(3).max(180),
  title: z.string().min(3).max(220),
  sportOrCategory: z.string().min(2).max(120),
  participants: z.array(z.string().min(1).max(120)).optional(),
  tournament: z.string().max(180).optional(),
  venue: z.string().max(220).optional(),
  description: z.string().max(4000).optional(),
  embedFallbackUrl: z.string().url().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  streams: z
    .array(
      z.object({
        label: z.string().min(1).max(60),
        sourceUrl: z.string().url(),
        sourceKind: z.enum(["video", "embed", "hls", "dash", "rtmp", "rtsp", "iptv"]),
      }),
    )
    .min(1)
    .max(5),
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Math.min(Number(url.searchParams.get("pageSize") ?? "20"), 50);

  const whereClause = q
    ? or(ilike(liveEvents.title, `%${q}%`), ilike(liveEvents.sportOrCategory, `%${q}%`), ilike(liveEvents.tournament, `%${q}%`))
    : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(liveEvents)
      .where(whereClause)
      .orderBy(desc(liveEvents.startTime), asc(liveEvents.title))
      .limit(pageSize)
      .offset((Math.max(page, 1) - 1) * pageSize),
    db.select({ total: count() }).from(liveEvents).where(whereClause),
  ]);

  return NextResponse.json({
    data: rows,
    pagination: { page, pageSize, total: totalRows[0]?.total ?? 0 },
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!hasPermission(auth, "live:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!verifyCsrf(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createLiveEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const payload = parsed.data;
  const exists = await db.select({ id: liveEvents.id }).from(liveEvents).where(eq(liveEvents.slug, payload.slug)).limit(1);
  if (exists[0]) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  const eventInsert = await db
    .insert(liveEvents)
    .values({
      slug: payload.slug,
      title: payload.title,
      sportOrCategory: payload.sportOrCategory,
      participants: payload.participants,
      tournament: payload.tournament,
      venue: payload.venue,
      description: payload.description,
      embedFallbackUrl: payload.embedFallbackUrl,
      startTime: new Date(payload.startTime),
      endTime: payload.endTime ? new Date(payload.endTime) : null,
      createdBy: auth!.userId,
    })
    .returning({ id: liveEvents.id, slug: liveEvents.slug, title: liveEvents.title });

  const created = eventInsert[0];

  await db.insert(liveEventStreams).values(
    payload.streams.map((stream, index) => ({
      liveEventId: created.id,
      label: stream.label,
      sourceUrl: stream.sourceUrl,
      sourceKind: stream.sourceKind,
      sortOrder: index + 1,
      isPrimary: index === 0,
      isActive: true,
    })),
  );

  await logAudit({
    actorUserId: auth!.userId,
    action: "live_event.create",
    entityType: "live_event",
    entityId: created.id,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1",
    userAgent: request.headers.get("user-agent"),
    details: { slug: created.slug, title: created.title },
  });

  return NextResponse.json({ ok: true, data: created }, { status: 201 });
}
