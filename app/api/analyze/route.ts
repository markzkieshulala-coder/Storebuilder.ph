import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parsePrompt } from "@/lib/engine/prompt-engine";

export const dynamic = "force-dynamic";

// Lightweight prompt-understanding endpoint. Runs the deterministic parser and
// returns a human-readable "concept brief" so the UI can show the user exactly
// what the system understood BEFORE it commits to generating the website.

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const NICHE_LABEL: Record<string, string> = {
  food: "Food & Dining", restaurant: "Restaurant", cafe: "Café", coffee: "Coffee",
  sports: "Sports & Fitness", fitness: "Fitness", gym: "Gym",
  technology: "Technology", tech: "Technology", saas: "SaaS", software: "Software", startup: "Startup",
  photography: "Photography", photographer: "Photography",
  fashion: "Fashion", beauty: "Beauty", apparel: "Apparel", streetwear: "Streetwear",
  ecommerce: "E-commerce", retail: "Retail",
  portfolio: "Portfolio", art: "Art", design: "Design", architecture: "Architecture",
  agency: "Agency", marketing: "Marketing", consulting: "Consulting",
  general: "General Business",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (prompt.length < 8) {
      return NextResponse.json(
        { error: "Please describe your website with at least 8 characters." },
        { status: 400 }
      );
    }

    const result = parsePrompt(prompt);
    if (!result.success) {
      return NextResponse.json({ error: "Could not analyze prompt." }, { status: 422 });
    }

    const puo = result.object;
    const niche = NICHE_LABEL[puo.inferredIndustry] || titleCase(puo.inferredIndustry);
    const sections = (puo.pageStructure || []).map((s) => s.type);
    const palette = puo.visual.colorPalette;

    const concept = {
      niche,
      designStyle: puo.designStyle,
      visualMood: puo.visualMood,
      personality: puo.websitePersonality,
      tone: puo.businessTone,
      density: puo.visualDensity,
      imagery: puo.visual.imageDirection,
      layoutDirection: puo.layout?.direction ?? "landing",
      artisticDirection: puo.artisticDirection,
      audience: puo.inferredAudience,
      keywords: puo.extractedKeywords.slice(0, 10),
      sections,
      palette: {
        primary: palette.primary,
        accent: palette.accent,
        background: palette.background,
        surface: palette.surface,
        text: palette.text,
      },
      confidence: puo.confidence,
    };

    // Ordered, human-readable understanding steps tailored to THIS prompt.
    const steps = [
      `Reading your request — "${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}"`,
      `Detected niche: ${concept.niche}`,
      `Visual mood: ${titleCase(concept.visualMood)} · Style: ${titleCase(concept.designStyle)}`,
      `Personality: ${titleCase(concept.personality)} · Tone: ${titleCase(concept.tone)}`,
      `Locking color palette and typography`,
      `Selecting ${concept.niche} imagery and visuals`,
      `Planning ${concept.sections.length || 8} sections and page structure`,
      `Forming the final visual concept`,
    ];

    return NextResponse.json({ concept, steps });
  } catch (err: any) {
    console.error("[POST /api/analyze]", err);
    return NextResponse.json(
      { error: `Analysis failed: ${err?.message ?? "unknown error"}` },
      { status: 500 }
    );
  }
}
