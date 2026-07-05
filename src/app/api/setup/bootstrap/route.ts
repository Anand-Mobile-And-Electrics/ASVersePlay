import { ensurePlatformBootstrap } from "@/lib/bootstrap";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const adminKey = process.env.BOOTSTRAP_ADMIN_KEY;
  const provided = request.headers.get("x-bootstrap-key");

  if (adminKey && provided !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensurePlatformBootstrap();
  return NextResponse.json({ ok: true });
}
