import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildUnderstanding, type AnalyzerConcept } from "@/lib/engine/understanding";

export const dynamic = "force-dynamic";

// Gemini REST endpoint — gemini-2.0-flash is fast enough for a 15-20s understanding phase.
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// The allowed values map 1:1 to the engine's own vocabularies (lib/engine/prompt-engine/types.ts),
// so Gemini's understanding can be applied directly without lossy translation.
const SYSTEM_INSTRUCTION = `You are a professional website design strategist. Analyze the user's website description and extract structured design intelligence. Return ONLY a valid JSON object — no markdown fences, no explanation, nothing else.

Required JSON shape (use ONLY the allowed values shown):
{
  "niche": string,           // exact business type, lowercase: restaurant, cafe, coffee, bakery, gym, fitness, photography, fashion, beauty, ecommerce, retail, saas, software, startup, technology, portfolio, art, agency, marketing, consulting, architecture, etc.
  "designStyle": string,     // ONE of: minimal, brutalist, glassmorphism, neumorphism, flat, material, cyberpunk, futuristic, retro, vaporwave, editorial, corporate, playful, artistic, organic, industrial, luxury, premium, startup, enterprise, cinematic, high-tech
  "visualMood": string,      // ONE of: dark, light, contrast, muted, vibrant, ethereal, grounded, dramatic, soft, warm, cold, neutral
  "personality": string,     // ONE of: bold, elegant, aggressive, friendly, authoritative, whimsical, serious, approachable, exclusive, energetic, calm, rebellious, sophisticated, youthful, trustworthy, innovative, timeless, experimental
  "tone": string,            // ONE of: professional, casual, formal, playful, technical, luxury, accessible, disruptive, authoritative, empathetic, conservative
  "audience": string,        // target audience in 5-10 words (e.g. "young urban coffee lovers")
  "keywords": string[],      // 8-10 CONCRETE content nouns from the prompt (e.g. "ramen", "espresso", "sneakers") — NOT style adjectives like "modern" or "clean"
  "sections": string[],      // page sections; always include "hero"; add from: about, services, menu, gallery, testimonials, pricing, contact, team, portfolio, process
  "artisticDirection": string, // concise 12-word artistic vision
  "colorHint": string        // brief color guidance using named colors or hex (e.g. "deep navy, gold accents, cream text")
}

Pick the SINGLE most specific niche. If the prompt names a real subject (food, product, service), reflect it in keywords. Match designStyle/visualMood to the explicit or strongly-implied vibe of the prompt.`;

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

// Calls Gemini for semantic understanding. Returns null on any failure so the
// caller transparently falls back to the deterministic parser.
async function callGemini(prompt: string): Promise<AnalyzerConcept | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key-here") return null;

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
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) {
      console.warn("[analyze/gemini] HTTP error:", res.status);
      return null;
    }

    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) return null;

    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned) as AnalyzerConcept;
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

    // 1. Gemini understanding (optional, best-effort).
    const geminiConcept = await callGemini(prompt);

    // 2. Build the ONE canonical understanding. This is the exact same call
    //    /api/generate makes, so the concept shown here equals what gets built.
    const puo = buildUnderstanding(prompt, geminiConcept);
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
      source: geminiConcept ? "gemini" : "deterministic",
    };

    // 3. Echo the raw Gemini concept back so the client can hand it to
    //    /api/generate, guaranteeing both phases share one understanding.
    const steps = [
      `Reading your request — "${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}"`,
      `Identified: ${niche} business`,
      `Visual direction: ${titleCase(concept.visualMood)} mood · ${titleCase(concept.designStyle)} style`,
      `Target audience: ${concept.audience}`,
      `Personality: ${titleCase(concept.personality)} · Tone: ${titleCase(concept.tone)}`,
      `Color palette: ${palette.background} surfaces · ${palette.accent} accent`,
      `Planning ${sections.length || 8} sections: ${sections.slice(0, 4).join(", ")}${sections.length > 4 ? "…" : ""}`,
      `Artistic vision: ${concept.artisticDirection}`,
      `Forming the final visual concept`,
    ];

    return NextResponse.json({ concept, geminiConcept, steps });
  } catch (err: any) {
    console.error("[POST /api/analyze]", err);
    return NextResponse.json(
      { error: `Analysis failed: ${err?.message ?? "unknown error"}` },
      { status: 500 }
    );
  }
}
