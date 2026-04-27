import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// All operations use raw SQL to avoid type-mismatch errors with a stale
// Prisma client (e.g., when the deployed client predates schema changes).

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Website" WHERE id = $1 AND "userId" = $2 LIMIT 1`,
      params.id,
      session.user.id
    );
    const website = rows?.[0];

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    return NextResponse.json({ website });
  } catch (err: any) {
    console.error("[GET /api/websites/[id]]", err);
    return NextResponse.json(
      { error: "Could not load website: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerCheck = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "Website" WHERE id = $1 AND "userId" = $2 LIMIT 1`,
      params.id,
      session.user.id
    );
    if (!ownerCheck?.length) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    const body = await req.json();
    const { jsonContent, name, published, seoTitle, seoDesc, customDomain } = body;

    // Build dynamic SET clause for only the fields that were provided
    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (jsonContent !== undefined) { sets.push(`"jsonContent" = $${i++}::jsonb`); values.push(JSON.stringify(jsonContent)); }
    if (name !== undefined)        { sets.push(`name = $${i++}`); values.push(name); }
    if (published !== undefined)   { sets.push(`published = $${i++}`); values.push(published); }
    if (seoTitle !== undefined)    { sets.push(`"seoTitle" = $${i++}`); values.push(seoTitle); }
    if (seoDesc !== undefined)     { sets.push(`"seoDesc" = $${i++}`); values.push(seoDesc); }
    if (customDomain !== undefined){ sets.push(`"customDomain" = $${i++}`); values.push(customDomain); }
    sets.push(`"updatedAt" = NOW()`);

    if (values.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(params.id);
    const sql = `UPDATE "Website" SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`;
    const updatedRows = await prisma.$queryRawUnsafe<any[]>(sql, ...values);

    return NextResponse.json({ website: updatedRows[0] });
  } catch (err: any) {
    console.error("[PATCH /api/websites/[id]]", err);
    return NextResponse.json(
      { error: "Could not update website: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "Website" WHERE id = $1 AND "userId" = $2`,
      params.id,
      session.user.id
    );

    if (Number(result) === 0) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/websites/[id]]", err);
    return NextResponse.json(
      { error: "Could not delete website: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}
