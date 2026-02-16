import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const task = searchParams.get('task') || 'general';
  const budget = searchParams.get('budget') || 'medium';
  const latency = searchParams.get('latency_priority') === 'true';

  // Prototype logic
  let recommended = "google/gemini-3-flash-preview";
  let reasoning = "Defaulting to high-efficiency flash model.";
  let alternatives = [
    { id: "openai/gpt-5.1-codex-mini", reason: "Ultra-low latency for simple tasks." }
  ];
  
  if (task === 'code') {
    if (budget === 'high') {
        recommended = "anthropic/claude-sonnet-4.5";
        reasoning = "Highest Coding ELO (1280) for premium projects.";
    } else {
        recommended = "deepseek/deepseek-v3.2";
        reasoning = "Unbeatable price/performance for coding at scale.";
    }
    alternatives.push({ id: "qwen/qwen3-coder-next", reason: "Alternative high-performance coder." });
  } else if (task === 'vision') {
    recommended = "google/gemini-3-pro-image-preview";
    reasoning = "Native multimodal support with massive context window.";
    alternatives.push({ id: "qwen/qwen3-vl-32b-instruct", reason: "Open-weights alternative with strong vision benchmarks." });
  } else if (task === 'logic') {
    recommended = "qwen/qwen3-max-thinking";
    reasoning = "Optimized for long-chain reasoning and complex problem solving.";
    alternatives.push({ id: "openai/o3-deep-research", reason: "Highest accuracy for research-intensive logic." });
  }

  return NextResponse.json({
    recommended_model: recommended,
    reasoning: reasoning,
    alternatives: alternatives,
    local_alternative: {
      model: task === 'code' ? "deepseek-coder-v2-lite" : "llama-3.2-3b-instruct",
      roi_threshold_days: budget === 'low' ? 7 : 30,
      note: "Local execution avoids per-token billing entirely for frequent tasks."
    }
  });
}
