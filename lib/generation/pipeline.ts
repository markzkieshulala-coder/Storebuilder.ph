import Anthropic from "@anthropic-ai/sdk";
import { readGenerationLog, appendGenerationLog, buildMemoryContext } from "./memory";
import { PHASE1_SYSTEM_PROMPT, PHASE2_SYSTEM_PROMPT, PHASE3_SYSTEM_PROMPT } from "./prompts";
import type { GenerationResult } from "./types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

function extractJson(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text.trim());
  } catch {}

  // Extract from markdown code block — greedy match to handle large JSONs
  // that may contain inner code blocks or be truncated before closing ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```\s*$/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // Fallback: find first { and last } — handles truncated/fence-less responses
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  // Last resort: if response starts with a code fence but JSON was truncated
  // (no closing ```), try extracting from first { to end of text
  if (firstBrace !== -1) {
    const candidate = text.slice(firstBrace);
    // Try progressively shorter slices to find valid JSON
    for (let end = candidate.length; end > candidate.length / 2; end--) {
      if (candidate[end - 1] === "}") {
        try {
          return JSON.parse(candidate.slice(0, end));
        } catch {}
      }
    }
  }

  throw new Error("Could not extract valid JSON from response");
}

function extractHtml(text: string): string {
  // Try to find HTML starting with <!DOCTYPE or <html
  const doctypeIdx = text.indexOf("<!DOCTYPE");
  if (doctypeIdx !== -1) {
    const htmlEnd = text.lastIndexOf("</html>");
    if (htmlEnd !== -1) {
      return text.slice(doctypeIdx, htmlEnd + 7);
    }
    return text.slice(doctypeIdx);
  }

  const htmlIdx = text.indexOf("<html");
  if (htmlIdx !== -1) {
    const htmlEnd = text.lastIndexOf("</html>");
    if (htmlEnd !== -1) {
      return text.slice(htmlIdx, htmlEnd + 7);
    }
    return text.slice(htmlIdx);
  }

  // Strip markdown code blocks
  const codeBlock = text.match(/```html\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  const anyBlock = text.match(/```\s*([\s\S]*?)```/);
  if (anyBlock) return anyBlock[1].trim();

  return text.trim();
}

export async function generateWebsite(
  prompt: string,
  brandName: string,
): Promise<GenerationResult> {
  const log = readGenerationLog();
  const memoryContext = buildMemoryContext(log);

  // ─── Phase 1: Planning Pipeline (all 8 planning engines combined) ───
  console.log("[generation] Phase 1: Planning...");
  const phase1Message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    system: PHASE1_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `WEBSITE REQUEST:
Brand/Business Name: ${brandName}
User Prompt: ${prompt}

GENERATION MEMORY CONTEXT:
${memoryContext}

Produce all planning artifacts as a single JSON object. Be specific, bold, and premium. Make every decision unique and tailored to this exact brand and niche.`,
      },
    ],
  });

  const phase1Text = phase1Message.content[0].type === "text"
    ? phase1Message.content[0].text
    : "";

  let artifacts: Record<string, unknown>;
  try {
    artifacts = extractJson(phase1Text) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`Phase 1 JSON extraction failed: ${e}. Raw: ${phase1Text.slice(0, 500)}`);
  }

  // ─── Phase 2: Blueprint Generation ───
  console.log("[generation] Phase 2: Blueprint...");
  const phase2Message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: PHASE2_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `BRAND NAME: ${brandName}

PLANNING ARTIFACTS:
${JSON.stringify(artifacts, null, 2)}

Convert these artifacts into a complete website-blueprint.json. Fill in ALL real content — actual headlines, body copy, CTAs — for the brand "${brandName}" in the niche "${(artifacts as any)?.intent_analysis?.niche || "general"}". Respond with ONLY the JSON blueprint.`,
      },
    ],
  });

  const phase2Text = phase2Message.content[0].type === "text"
    ? phase2Message.content[0].text
    : "";

  let blueprint: Record<string, unknown>;
  try {
    blueprint = extractJson(phase2Text) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`Phase 2 JSON extraction failed: ${e}. Raw: ${phase2Text.slice(0, 500)}`);
  }

  // ─── Phase 3: Frontend Generation ───
  console.log("[generation] Phase 3: Frontend generation...");
  const phase3Message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: PHASE3_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `BRAND NAME: ${brandName}
NICHE: ${(artifacts as any)?.intent_analysis?.niche || "general"}

WEBSITE BLUEPRINT:
${JSON.stringify(blueprint, null, 2)}

KEY DESIGN TOKENS FROM PLANNING:
- Colors: ${JSON.stringify((artifacts as any)?.design_dna?.color_dna || {})}
- Typography: display_font="${(artifacts as any)?.design_dna?.typography_dna?.display_font}", body_font="${(artifacts as any)?.design_dna?.typography_dna?.body_font}"
- Motion easing: ${(artifacts as any)?.design_dna?.motion_dna?.easing_family}
- Agency persona: ${(artifacts as any)?.design_dna?.layout_dna?.agency_persona}
- Creative concept: ${(artifacts as any)?.creative_direction?.artistic_direction?.concept}
- Signature detail: ${(blueprint as any)?.meta?.signature_detail}

Generate the COMPLETE single-file HTML website. Output ONLY the HTML, starting with <!DOCTYPE html>.`,
      },
    ],
  });

  const phase3Text = phase3Message.content[0].type === "text"
    ? phase3Message.content[0].text
    : "";

  const html = extractHtml(phase3Text);

  if (!html || html.length < 1000) {
    throw new Error(`Phase 3 produced insufficient HTML (${html.length} chars)`);
  }

  // ─── Write to generation memory ───
  const dna = (artifacts as any)?.design_dna;
  if (dna) {
    try {
      appendGenerationLog({
        generation_id: dna.dna_id || crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        niche: (artifacts as any)?.intent_analysis?.niche || "unknown",
        intent_summary: prompt.slice(0, 100),
        fingerprint: {
          hero_type: dna.layout_dna?.hero_type || "",
          grid_system: dna.layout_dna?.grid_system || "",
          display_font: dna.typography_dna?.display_font || "",
          easing_family: dna.motion_dna?.easing_family || "",
          agency_persona: dna.layout_dna?.agency_persona || "",
          photography_style: dna.image_dna?.photography_style || "",
          primary_color: dna.color_dna?.primary || "",
        },
        layout_sections: (artifacts as any)?.layout_orchestration?.sections?.map((s: any) => s.composition) || [],
        clearance_status: "cleared",
      });
    } catch {
      // Non-fatal
    }
  }

  return {
    html,
    blueprint,
    niche: (artifacts as any)?.intent_analysis?.niche || "general",
    brandName,
  };
}
