import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID!;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only paid plans can add custom domains
  if (session.user.plan !== "PRO" && session.user.plan !== "ENTERPRISE") {
    return NextResponse.json({ error: "Custom domains require the Pro or Enterprise plan" }, { status: 403 });
  }

  const { websiteId, domain } = await req.json();
  if (!websiteId || !domain) {
    return NextResponse.json({ error: "websiteId and domain required" }, { status: 400 });
  }

  // Validate domain format
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
  if (!domainRegex.test(domain)) {
    return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
  }

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId: session.user.id },
  });
  if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  try {
    // Add DNS record via Cloudflare API
    const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CF_TOKEN}`,
      },
      body: JSON.stringify({
        type: "CNAME",
        name: domain,
        content: "cname.storebuilder.ph",
        ttl: 1,
        proxied: true,
      }),
    });

    const cfData = await cfResponse.json();

    if (!cfResponse.ok || !cfData.success) {
      console.error("Cloudflare error:", cfData.errors);
      return NextResponse.json({ error: "Failed to create DNS record" }, { status: 500 });
    }

    // Save to database
    await prisma.website.update({
      where: { id: websiteId },
      data: {
        customDomain: domain,
        cfZoneId: CF_ZONE_ID,
        cfRecordId: cfData.result.id,
      },
    });

    return NextResponse.json({
      success: true,
      domain,
      message: `Point your domain's CNAME to cname.storebuilder.ph`,
    });
  } catch (error) {
    console.error("Domain setup error:", error);
    return NextResponse.json({ error: "Domain setup failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { websiteId } = await req.json();

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId: session.user.id },
  });
  if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  if (website.cfZoneId && website.cfRecordId) {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${website.cfZoneId}/dns_records/${website.cfRecordId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${CF_TOKEN}` },
    });
  }

  await prisma.website.update({
    where: { id: websiteId },
    data: { customDomain: null, cfZoneId: null, cfRecordId: null },
  });

  return NextResponse.json({ success: true });
}
