import { db } from "@/db";
import { userContentLists } from "@/db/schema";
import { getAuthContext, verifyCsrf } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const listSchema = z.object({
  contentId: z.string().uuid(),
  listType: z.enum(["favorite", "watch_later"]),
  action: z.enum(["add", "remove"]),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(userContentLists).where(eq(userContentLists.userId, auth.userId));
  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrf(request, auth)) return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = listSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const payload = parsed.data;

  if (payload.action === "add") {
    await db
      .insert(userContentLists)
      .values({
        userId: auth.userId,
        contentId: payload.contentId,
        listType: payload.listType,
      })
      .onConflictDoNothing();
  } else {
    await db
      .delete(userContentLists)
      .where(
        and(
          eq(userContentLists.userId, auth.userId),
          eq(userContentLists.contentId, payload.contentId),
          eq(userContentLists.listType, payload.listType),
        ),
      );
  }

  return NextResponse.json({ ok: true });
}
