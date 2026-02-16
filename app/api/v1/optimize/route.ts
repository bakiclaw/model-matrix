import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  // Static recommendation for the build
  return NextResponse.json({
    recommended_model: "google/gemini-3-flash-preview",
    reasoning: "Defaulting to high-efficiency flash model for static build.",
    alternatives: [
      { id: "openai/gpt-5.1-codex-mini", reason: "Ultra-low latency for simple tasks." }
    ],
    local_alternative: {
      model: "llama-3.2-3b-instruct",
      roi_threshold_days: 30,
      note: "Local execution avoids per-token billing entirely for frequent tasks."
    }
  });
}
