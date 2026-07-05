import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getAuthContext, hasPermission, verifyCsrf } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  roleName: z.string().min(1).max(50),
});

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await getAuthContext(request);
  if (!hasPermission(auth, "users:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!verifyCsrf(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const { userId } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const role = await db.select({ id: roles.id, name: roles.name }).from(roles).where(eq(roles.name, parsed.data.roleName)).limit(1);
  if (!role[0]) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const targetUser = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!targetUser[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await db.update(users).set({ roleId: role[0].id, updatedAt: new Date() }).where(eq(users.id, userId));

  await logAudit({
    actorUserId: auth!.userId,
    action: "user.role.update",
    entityType: "user",
    entityId: userId,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1",
    userAgent: request.headers.get("user-agent"),
    details: { roleName: role[0].name },
  });

  return NextResponse.json({ ok: true });
}
