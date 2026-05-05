import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GeneratedWebsite } from "@/lib/ai/generate";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subdomain = searchParams.get("subdomain");
  const productId = searchParams.get("productId");

  if (!subdomain || !productId) {
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });
  }

  const website = await prisma.website.findFirst({
    where: { subdomain },
  });
  if (!website) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const content = website.jsonContent as GeneratedWebsite;
  const productsSection = content.sections.find((s) => s.type === "products");
  const products = (productsSection?.data as any)?.products || [];

  const product =
    products.find((p: any) => p.id === productId) ||
    (Number.isInteger(Number(productId)) ? products[Number(productId)] : undefined);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    storeName: website.name,
    accent: content.colors?.accent || content.colors?.secondary || "#1877F2",
    primary: content.colors?.primary || "#0F172A",
    textColor: content.colors?.text || "#0F172A",
    bg: content.colors?.background || "#ffffff",
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price) || 0,
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      image: product.image || null,
      badge: product.badge || null,
      sizes: Array.isArray(product.sizes) ? product.sizes : undefined,
      colors: Array.isArray(product.colors) ? product.colors : undefined,
      stock: product.stock != null ? Number(product.stock) : undefined,
    },
  });
}
