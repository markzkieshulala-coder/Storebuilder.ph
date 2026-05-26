import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Website generation engine is not configured. Please integrate a generation engine." },
    { status: 503 }
  );
}
