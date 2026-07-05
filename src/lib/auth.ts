import { db } from "@/db";
import { permissions, rolePermissions, roles, sessions, users } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { createRandomToken, sha256Hex } from "./security";

export const SESSION_COOKIE_NAME = "asverse_session";

export type AuthContext = {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  csrfToken: string;
  permissions: string[];
};

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}

export async function createUserSession(params: {
  request: NextRequest;
  response: NextResponse;
  userId: string;
  rememberMe: boolean;
}): Promise<void> {
  const rawToken = createRandomToken();
  const tokenHash = sha256Hex(rawToken);
  const csrfToken = createRandomToken(24);
  const maxAgeSeconds = params.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);

  await db.insert(sessions).values({
    userId: params.userId,
    tokenHash,
    csrfToken,
    expiresAt,
    ipAddress: getClientIp(params.request),
    userAgent: params.request.headers.get("user-agent"),
  });

  params.response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function revokeSession(request: NextRequest): Promise<void> {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return;

  const tokenHash = sha256Hex(rawToken);
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
}

export async function clearSessionCookie(response: NextResponse): Promise<void> {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const tokenHash = sha256Hex(rawToken);

  const sessionRows = await db
    .select({
      userId: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: roles.name,
      userStatus: users.status,
      csrfToken: sessions.csrfToken,
      roleId: roles.id,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const session = sessionRows[0];
  if (!session || session.userStatus !== "active") return null;

  const permissionRows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(rolePermissions.roleId, session.roleId));

  return {
    userId: session.userId,
    email: session.email,
    username: session.username,
    displayName: session.displayName,
    role: session.role,
    csrfToken: session.csrfToken,
    permissions: permissionRows.map((p) => p.key),
  };
}

export function hasPermission(auth: AuthContext | null, permission: string): boolean {
  if (!auth) return false;
  if (auth.role === "super_admin") return true;
  return auth.permissions.includes(permission);
}

export function verifyCsrf(request: NextRequest, auth: AuthContext | null): boolean {
  if (!auth) return false;
  const csrfHeader = request.headers.get("x-csrf-token");
  return Boolean(csrfHeader && csrfHeader === auth.csrfToken);
}
