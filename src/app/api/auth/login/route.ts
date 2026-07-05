import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { createUserSession } from "@/lib/auth";
import { ensurePlatformBootstrap } from "@/lib/bootstrap";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyPassword } from "@/lib/security";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(120),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  if (!checkRateLimit(`login:${ip}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  await ensurePlatformBootstrap();

  const payload = parsed.data;
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@asverse.local").toLowerCase();

  if (payload.email.toLowerCase() !== adminEmail) {
    return NextResponse.json({ error: "Only super admin login is allowed" }, { status: 403 });
  }

  const found = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      passwordHash: users.passwordHash,
      status: users.status,
      roleName: roles.name,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(eq(users.email, adminEmail), eq(roles.name, "super_admin")))
    .limit(1);

  const user = found[0];
  if (!user || user.status !== "active") {
    return NextResponse.json({ error: "Admin account is unavailable" }, { status: 403 });
  }

  const valid = await verifyPassword(payload.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, role: user.roleName },
  });

  await createUserSession({
    request,
    response,
    userId: user.id,
    rememberMe: payload.rememberMe,
  });

  await logAudit({
    actorUserId: user.id,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
  });

  return response;
}
