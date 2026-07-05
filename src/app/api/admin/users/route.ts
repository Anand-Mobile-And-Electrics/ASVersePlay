import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { getAuthContext, hasPermission } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!hasPermission(auth, "users:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: roles.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId));

  const roleRows = await db.select({ id: roles.id, name: roles.name }).from(roles);

  return NextResponse.json({ data: { users: userRows, roles: roleRows } });
}
