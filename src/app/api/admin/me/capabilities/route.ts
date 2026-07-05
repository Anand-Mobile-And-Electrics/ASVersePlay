import { getAuthContext } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const CONTROL_MAP: Record<string, string[]> = {
  "content:create": ["Add videos/content", "Add primary video links"],
  "content:update": ["Add backup servers", "Edit metadata"],
  "content:delete": ["Delete videos/content"],
  "live:manage": ["Create/manage live events and channels"],
  "users:manage": ["Manage user roles and access levels"],
  "comments:moderate": ["Moderate and remove comments"],
  "ads:manage": ["Manage ad placements and schedules"],
  "analytics:view": ["View platform analytics and reports"],
  "settings:manage": ["Manage platform settings"],
};

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const controls = auth.permissions.flatMap((permission) =>
    (CONTROL_MAP[permission] ?? []).map((label) => ({ permission, label })),
  );

  return NextResponse.json({
    data: {
      role: auth.role,
      permissions: auth.permissions,
      controls,
      isSuperAdmin: auth.role === "super_admin",
    },
  });
}
