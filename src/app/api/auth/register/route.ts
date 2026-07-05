import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Registration is disabled. This platform runs in single-admin mode.",
    },
    { status: 403 },
  );
}
