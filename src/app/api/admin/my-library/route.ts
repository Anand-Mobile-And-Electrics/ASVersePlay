import { db } from "@/db";
import { contents, liveEvents } from "@/db/schema";
import { getAuthContext } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [myContents, myLiveEvents] = await Promise.all([
    db
      .select({
        id: contents.id,
        slug: contents.slug,
        title: contents.title,
        contentType: contents.contentType,
        createdAt: contents.createdAt,
      })
      .from(contents)
      .where(eq(contents.createdBy, auth.userId))
      .orderBy(desc(contents.createdAt))
      .limit(200),
    db
      .select({
        id: liveEvents.id,
        slug: liveEvents.slug,
        title: liveEvents.title,
        sportOrCategory: liveEvents.sportOrCategory,
        createdAt: liveEvents.createdAt,
      })
      .from(liveEvents)
      .where(eq(liveEvents.createdBy, auth.userId))
      .orderBy(desc(liveEvents.createdAt))
      .limit(200),
  ]);

  return NextResponse.json({ data: { myContents, myLiveEvents } });
}
