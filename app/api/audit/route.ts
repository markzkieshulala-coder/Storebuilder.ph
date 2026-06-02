import { NextRequest, NextResponse } from 'next/server';
import { auditPrompt } from '@/lib/engine/audit-pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Pipeline fidelity audit endpoint.
// POST { prompt: string } → returns a full FidelityReport as JSON.
// No auth required — dev/admin tool only.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const report = auditPrompt(prompt);
    return NextResponse.json(report, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
