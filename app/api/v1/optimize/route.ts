import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  // Static recommendation for the build
  return NextResponse.json({
    recommended_model: "google/gemini-2.0-flash-001",
    reasoning: "High-efficiency flash model with updated performance scores.",
    alternatives: [
      { id: "anthropic/claude-3-5-haiku", reason: "Superior reasoning at flash prices." }
    ],
    local_alternative: {
      model: "deepseek-coder-v2-lite",
      roi_threshold_days: 22,
      note: "Local execution with 16k context window optimized for development."
    }
  });
}
