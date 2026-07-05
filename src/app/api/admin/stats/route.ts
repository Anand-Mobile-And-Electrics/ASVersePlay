import { db } from "@/db";
import { contents, liveChannels, liveEvents, users } from "@/db/schema";
import { getAuthContext, hasPermission } from "@/lib/auth";
import { count, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!hasPermission(auth, "analytics:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [contentTotal, featuredContent, liveEventTotal, liveChannelTotal, activeUsers] = await Promise.all([
    db.select({ total: count() }).from(contents),
    db.select({ total: count() }).from(contents).where(eq(contents.isFeatured, true)),
    db.select({ total: count() }).from(liveEvents),
    db.select({ total: count() }).from(liveChannels).where(eq(liveChannels.isActive, true)),
    db.select({ total: count() }).from(users),
  ]);

  return NextResponse.json({
    data: {
      contentTotal: contentTotal[0]?.total ?? 0,
      featuredContent: featuredContent[0]?.total ?? 0,
      liveEventTotal: liveEventTotal[0]?.total ?? 0,
      liveChannelTotal: liveChannelTotal[0]?.total ?? 0,
      usersTotal: activeUsers[0]?.total ?? 0,
    },
  });
}
