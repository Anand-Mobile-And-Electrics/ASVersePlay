import { getAuthContext } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ authenticated: false });

  return NextResponse.json({
    authenticated: true,
    user: {
      id: auth.userId,
      email: auth.email,
      username: auth.username,
      displayName: auth.displayName,
      role: auth.role,
      permissions: auth.permissions,
    },
  });
}
