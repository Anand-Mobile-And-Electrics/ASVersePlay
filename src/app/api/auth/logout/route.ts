import { logAudit } from "@/lib/audit";
import { clearSessionCookie, getAuthContext, revokeSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  await revokeSession(request);

  const response = NextResponse.json({ ok: true });
  await clearSessionCookie(response);

  if (auth) {
    await logAudit({
      actorUserId: auth.userId,
      action: "auth.logout",
      entityType: "user",
      entityId: auth.userId,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1",
      userAgent: request.headers.get("user-agent"),
    });
  }

  return response;
}
