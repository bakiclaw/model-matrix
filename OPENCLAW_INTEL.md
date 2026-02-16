# OpenClaw Intelligence Layer - Design Spec

## 1. OpenClaw Mode (UI)
A dedicated toggle or preset in the calculator specifically for OpenClaw instances.
- **Presets:** "Minimal Agent" (Gemini Flash), "Heavy Coder" (Sonnet/o1), "Vision Researcher" (Llama 3.2 Vision).
- **Node Sync:** A field to input the user's OpenClaw Node specs (e.g., "RTX 4090", "Mac M3 Max") to calculate Local ROI.

## 2. Programmatic Interface (Agent-to-Matrix)
How an OpenClaw agent (like Baki) talks to ModelMatrix.

### Endpoint: `/api/v1/optimize`
**Query Params:**
- `task`: (code | vision | logic | general)
- `budget`: (low | medium | high)
- `latency_priority`: (true | false)

**Response:**
```json
{
  "recommended_model": "anthropic/claude-3-5-sonnet",
  "reasoning": "Highest Coding ELO (1280) for medium budget ($0.015/msg).",
  "alternatives": [
    {"id": "google/gemini-2.0-flash", "reason": "90% cheaper, 15% lower performance"}
  ],
  "local_alternative": {
    "model": "deepseek-coder-v2-lite",
    "roi_threshold_days": 14,
    "note": "Running locally on your RTX 3080 pays for itself in 2 weeks vs API usage."
  }
}
```

## 3. Local Execution ROI (Logic)
Data to be added to `prices.json` or a new `hardware.json`:
- **Hardware Profile:**
  - `mac_m3_max`: { wattage: 30, tflops: 100, price: 3500 }
  - `rtx_4090`: { wattage: 450, tflops: 82, price: 1600 }
  - `rpi_5`: { wattage: 10, tflops: 0.1, price: 80 }

- **Formula:**
  `LocalCost = (ElectricityRate * UsageHours) + (HardwareCost / UsefulLifeHours)`
  `Savings = (CloudAPICost * Tokens) - LocalCost`

## 4. Implementation Status
- [x] Update `ModelMatrixApp.tsx` with OpenClaw specific presets.
- [x] Create a Mock API route in Next.js for agent querying.
- [x] Create `hardware.json` with hardware profiles and ROI data.
- [x] Implement Local ROI Calculator in the UI.

