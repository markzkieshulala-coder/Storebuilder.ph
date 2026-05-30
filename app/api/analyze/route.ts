import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildUnderstanding } from "@/lib/engine/understanding";

export const dynamic = "force-dynamic";

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const NICHE_LABEL: Record<string, string> = {
  food: "Food & Dining", restaurant: "Restaurant", cafe: "Café", coffee: "Coffee Shop",
  ramen: "Ramen Restaurant", sushi: "Sushi Restaurant", pizza: "Pizzeria", burger: "Burger Joint",
  bakery: "Bakery", espresso: "Espresso Bar", barista: "Coffee Bar", boba: "Bubble Tea",
  sports: "Sports & Fitness", fitness: "Fitness", gym: "Gym", crossfit: "CrossFit",
  yoga: "Yoga Studio", pilates: "Pilates Studio", boxing: "Boxing Gym",
  technology: "Technology", tech: "Technology", saas: "SaaS", software: "Software", startup: "Startup",
  photography: "Photography", photographer: "Photography",
  fashion: "Fashion", beauty: "Beauty", apparel: "Apparel", streetwear: "Streetwear",
  tattoo: "Tattoo Studio", barbershop: "Barbershop", barber: "Barber Shop", salon: "Hair Salon",
  ecommerce: "E-commerce", retail: "Retail",
  portfolio: "Portfolio", art: "Art", design: "Design", architecture: "Architecture",
  agency: "Agency", marketing: "Marketing", consulting: "Consulting",
  spa: "Spa & Wellness", wellness: "Wellness", meditation: "Meditation", massage: "Massage Studio",
  hotel: "Hotel", resort: "Resort", travel: "Travel",
  dental: "Dental Practice", dentist: "Dental Clinic", clinic: "Medical Clinic", therapy: "Therapy Practice",
  law: "Law Firm", legal: "Legal Services",
  general: "Business",
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

    // Single unified understanding — the exact same call /api/generate makes.
    const puo = await buildUnderstanding(prompt);
    const palette = puo.visual.colorPalette;
    const sections = (puo.pageStructure || []).map((s) => s.type);
    const niche = NICHE_LABEL[puo.inferredIndustry] ?? titleCase(puo.inferredIndustry);

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

    const steps = [
      `Reading your request — "${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}"`,
      `Identified: ${niche}`,
      `Visual direction: ${titleCase(concept.visualMood)} mood · ${titleCase(concept.designStyle)} style`,
      `Target audience: ${concept.audience}`,
      `Personality: ${titleCase(concept.personality)} · Tone: ${titleCase(concept.tone)}`,
      `Color concept: ${palette.background} background · ${palette.accent} accent`,
      `Planning ${sections.length || 8} sections: ${sections.slice(0, 4).join(", ")}${sections.length > 4 ? "…" : ""}`,
      `Artistic direction: ${puo.artisticDirection}`,
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
