import { db } from "@/db";
import { comments, contents } from "@/db/schema";
import { getAuthContext, verifyCsrf } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createCommentSchema = z.object({
  body: z.string().min(1).max(2000),
  parentId: z.string().uuid().optional(),
});

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const page = Number(new URL(request.url).searchParams.get("page") ?? "1");
  const pageSize = Math.min(Number(new URL(request.url).searchParams.get("pageSize") ?? "20"), 50);

  const contentRows = await db.select({ id: contents.id }).from(contents).where(eq(contents.slug, slug)).limit(1);
  const content = contentRows[0];
  if (!content) return NextResponse.json({ error: "Content not found" }, { status: 404 });

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: comments.id,
        body: comments.body,
        userId: comments.userId,
        parentId: comments.parentId,
        isEdited: comments.isEdited,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .where(and(eq(comments.contentId, content.id), isNull(comments.parentId)))
      .orderBy(desc(comments.createdAt))
      .limit(pageSize)
      .offset((Math.max(page, 1) - 1) * pageSize),
    db.select({ total: count() }).from(comments).where(eq(comments.contentId, content.id)),
  ]);

  const parentIds = rows.map((row) => row.id);
  const replies =
    parentIds.length === 0
      ? []
      : await db
          .select({
            id: comments.id,
            body: comments.body,
            userId: comments.userId,
            parentId: comments.parentId,
            createdAt: comments.createdAt,
          })
          .from(comments)
          .where(and(eq(comments.contentId, content.id)))
          .orderBy(asc(comments.createdAt));

  return NextResponse.json({
    data: rows.map((row) => ({
      ...row,
      replies: replies.filter((reply) => reply.parentId === row.id),
    })),
    pagination: { page, pageSize, total: totalRows[0]?.total ?? 0 },
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyCsrf(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const contentRows = await db.select({ id: contents.id }).from(contents).where(eq(contents.slug, slug)).limit(1);
  const content = contentRows[0];
  if (!content) return NextResponse.json({ error: "Content not found" }, { status: 404 });

  const json = await request.json().catch(() => null);
  const parsed = createCommentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const inserted = await db
    .insert(comments)
    .values({
      contentId: content.id,
      userId: auth.userId,
      parentId: parsed.data.parentId,
      body: sanitizeText(parsed.data.body),
    })
    .returning({ id: comments.id, body: comments.body, createdAt: comments.createdAt });

  return NextResponse.json({ ok: true, data: inserted[0] }, { status: 201 });
}
