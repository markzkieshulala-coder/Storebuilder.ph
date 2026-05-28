import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parsePrompt } from "@/lib/engine/prompt-engine";

export const dynamic = "force-dynamic";

// Gemini REST endpoint — gemini-2.0-flash is fast enough for a 15-20s understanding phase.
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SYSTEM_INSTRUCTION = `You are a professional website design strategist. Analyze the user's website description and extract structured design intelligence. Return ONLY a valid JSON object — no markdown fences, no explanation, nothing else.

Required JSON shape:
{
  "niche": string,           // exact business type: restaurant, cafe, gym, photography, fashion, saas, portfolio, agency, etc.
  "designStyle": string,     // exactly one of: minimal, luxury, bold, elegant, playful, industrial, organic, classic, modern, brutalist
  "visualMood": string,      // exactly one of: dark, light, vibrant, warm, cool, dramatic, ethereal, natural, energetic
  "personality": string,     // exactly one of: professional, playful, sophisticated, energetic, friendly, creative, authoritative
  "tone": string,            // exactly one of: casual, formal, conversational, inspirational, bold, warm
  "audience": string,        // target audience in 5-10 words (e.g. "young urban coffee lovers")
  "keywords": string[],      // 8-10 content keywords from the prompt, nouns and action words only
  "sections": string[],      // page sections: always include "hero"; add from: about, services, menu, gallery, testimonials, pricing, contact, team, portfolio, process, blog
  "artisticDirection": string, // concise 12-word artistic vision (e.g. "cinematic dark luxury with gold accents and editorial photography")
  "colorHint": string        // brief color guidance (e.g. "deep navy, gold accents, cream text" or "forest green, off-white, copper")
}`;

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const NICHE_LABEL: Record<string, string> = {
  food: "Food & Dining", restaurant: "Restaurant", cafe: "Café", coffee: "Coffee Shop",
  sports: "Sports & Fitness", fitness: "Fitness", gym: "Gym", yoga: "Yoga Studio",
  technology: "Technology", tech: "Technology", saas: "SaaS", software: "Software", startup: "Startup",
  photography: "Photography", photographer: "Photography",
  fashion: "Fashion", beauty: "Beauty", apparel: "Apparel", streetwear: "Streetwear",
  ecommerce: "E-commerce", retail: "Retail", shop: "Online Shop",
  portfolio: "Portfolio", art: "Art", design: "Design", architecture: "Architecture",
  agency: "Agency", marketing: "Marketing", consulting: "Consulting",
  bakery: "Bakery", bar: "Bar & Lounge", hotel: "Hotel", spa: "Spa & Wellness",
  medical: "Medical", dental: "Dental", law: "Law Firm", real_estate: "Real Estate",
  general: "General Business",
};

interface GeminiConcept {
  niche: string;
  designStyle: string;
  visualMood: string;
  personality: string;
  tone: string;
  audience: string;
  keywords: string[];
  sections: string[];
  artisticDirection: string;
  colorHint: string;
}

async function callGemini(prompt: string): Promise<GeminiConcept | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn("[analyze/gemini] HTTP error:", res.status);
      return null;
    }

    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) return null;

    // Strip any accidental markdown fences Gemini might add despite instruction
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned) as GeminiConcept;

    // Validate minimum required fields
    if (!parsed.niche || !parsed.designStyle || !parsed.visualMood) return null;
    return parsed;
  } catch (err) {
    console.warn("[analyze/gemini] Call failed, using deterministic fallback:", (err as Error).message);
    return null;
  }
}

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

    // Run Gemini and deterministic parser in parallel
    const [gemini, parseResult] = await Promise.all([
      callGemini(prompt),
      Promise.resolve(parsePrompt(prompt)),
    ]);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Could not analyze prompt." }, { status: 422 });
    }

    const puo = parseResult.object;
    const palette = puo.visual.colorPalette;

    // Gemini wins for semantic fields; deterministic parser wins for palette and structure.
    const rawNiche = gemini?.niche ?? puo.inferredIndustry;
    const niche = NICHE_LABEL[rawNiche] ?? titleCase(rawNiche);
    const designStyle = gemini?.designStyle ?? puo.designStyle;
    const visualMood = gemini?.visualMood ?? puo.visualMood;
    const personality = gemini?.personality ?? puo.websitePersonality;
    const tone = gemini?.tone ?? puo.businessTone;
    const audience = gemini?.audience ?? puo.inferredAudience;
    const keywords = gemini?.keywords ?? puo.extractedKeywords.slice(0, 10);
    const artisticDirection = gemini?.artisticDirection ?? puo.artisticDirection;
    const sections = gemini?.sections ?? (puo.pageStructure || []).map((s) => s.type);
    const colorHint = gemini?.colorHint ?? "";

    const concept = {
      niche,
      rawNiche,
      designStyle,
      visualMood,
      personality,
      tone,
      density: puo.visualDensity,
      imagery: puo.visual.imageDirection,
      layoutDirection: puo.layout?.direction ?? "landing",
      artisticDirection,
      audience,
      keywords,
      sections,
      colorHint,
      palette: {
        primary: palette.primary,
        accent: palette.accent,
        background: palette.background,
        surface: palette.surface,
        text: palette.text,
      },
      confidence: gemini ? 0.95 : puo.confidence,
      source: gemini ? "gemini" : "deterministic",
    };

    // Tailored understanding steps based on actual analysis result
    const steps = [
      `Reading your request — "${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}"`,
      `Identified: ${niche} business`,
      `Visual direction: ${titleCase(visualMood)} mood · ${titleCase(designStyle)} style`,
      `Target audience: ${audience}`,
      `Personality: ${titleCase(personality)} · Tone: ${titleCase(tone)}`,
      `${colorHint ? `Color concept: ${colorHint}` : `Locking color palette and typography`}`,
      `Planning ${sections.length || 8} sections: ${sections.slice(0, 4).join(", ")}${sections.length > 4 ? "…" : ""}`,
      `Artistic vision: ${artisticDirection}`,
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
