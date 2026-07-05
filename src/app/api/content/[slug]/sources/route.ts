import { db } from "@/db";
import { contentSources, contents } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getAuthContext, hasPermission, verifyCsrf } from "@/lib/auth";
import { and, count, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const sourceSchema = z.object({
  label: z.string().min(1).max(60),
  sourceKind: z.enum(["video", "embed", "hls", "dash", "rtmp", "rtsp", "iptv"]),
  sourceUrl: z.string().url(),
});

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await getAuthContext(request);
  if (!hasPermission(auth, "content:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!verifyCsrf(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const { slug } = await context.params;
  const contentRow = await db.select({ id: contents.id, slug: contents.slug }).from(contents).where(eq(contents.slug, slug)).limit(1);
  const content = contentRow[0];

  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = sourceSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const sourceCount = await db
    .select({ total: count() })
    .from(contentSources)
    .where(and(eq(contentSources.contentId, content.id), eq(contentSources.isActive, true)));

  const currentTotal = Number(sourceCount[0]?.total ?? 0);
  if (currentTotal >= 5) {
    return NextResponse.json({ error: "Maximum of 5 sources allowed" }, { status: 400 });
  }

  const inserted = await db
    .insert(contentSources)
    .values({
      contentId: content.id,
      label: parsed.data.label,
      sourceKind: parsed.data.sourceKind,
      sourceUrl: parsed.data.sourceUrl,
      sortOrder: currentTotal + 1,
      isPrimary: false,
      isActive: true,
    })
    .returning({ id: contentSources.id, label: contentSources.label, sourceUrl: contentSources.sourceUrl });

  await logAudit({
    actorUserId: auth!.userId,
    action: "content.source.add",
    entityType: "content",
    entityId: content.id,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1",
    userAgent: request.headers.get("user-agent"),
    details: { slug: content.slug, sourceId: inserted[0].id, sourceLabel: inserted[0].label },
  });

  return NextResponse.json({ ok: true, data: inserted[0] }, { status: 201 });
}
