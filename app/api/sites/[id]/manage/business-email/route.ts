import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeManage } from "@/lib/site/manage-auth";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

// GET → returns the business email currently saved for this site.
// PATCH body { businessEmail, forwardContactEmails } → updates them.
// Used by the Settings → Email panel in Business Tools.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let businessEmail: string | null = null;
  let forwardContactEmails = true;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "businessEmail", "forwardContactEmails" FROM "Website" WHERE id = $1 LIMIT 1`,
      params.id
    );
    if (rows?.[0]) {
      businessEmail = rows[0].businessEmail ?? null;
      forwardContactEmails = rows[0].forwardContactEmails ?? true;
    }
  } catch (e) { console.error("[business-email GET]", e); }

  return NextResponse.json({ businessEmail, forwardContactEmails });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const rawEmail: string = typeof body?.businessEmail === "string" ? body.businessEmail.trim() : "";
  const forward: boolean = body?.forwardContactEmails !== false;

  // Allow clearing by passing "" — otherwise validate the format.
  if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Website" SET "businessEmail" = $1, "forwardContactEmails" = $2 WHERE id = $3`,
      rawEmail || null, forward, params.id
    );
  } catch (e) {
    console.error("[business-email PATCH]", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true, businessEmail: rawEmail || null, forwardContactEmails: forward });
}
