import { db } from "@/db";
import { watchProgress } from "@/db/schema";
import { getAuthContext, verifyCsrf } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const progressSchema = z.object({
  contentId: z.string().uuid(),
  sourceId: z.string().uuid().optional(),
  currentSecond: z.number().int().gte(0),
  durationSecond: z.number().int().gte(0).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(watchProgress).where(eq(watchProgress.userId, auth.userId));
  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrf(request, auth)) return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = progressSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const payload = parsed.data;

  const existing = await db
    .select({ id: watchProgress.id })
    .from(watchProgress)
    .where(eq(watchProgress.userId, auth.userId));

  const currentRecord = existing[0];

  if (currentRecord) {
    await db
      .update(watchProgress)
      .set({
        contentId: payload.contentId,
        sourceId: payload.sourceId,
        currentSecond: payload.currentSecond,
        durationSecond: payload.durationSecond,
        lastWatchedAt: new Date(),
      })
      .where(eq(watchProgress.id, currentRecord.id));
  } else {
    await db.insert(watchProgress).values({
      userId: auth.userId,
      contentId: payload.contentId,
      sourceId: payload.sourceId,
      currentSecond: payload.currentSecond,
      durationSecond: payload.durationSecond,
      lastWatchedAt: new Date(),
    });
  }

  return NextResponse.json({ ok: true });
}
