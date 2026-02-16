import requests
import json
import os
from datetime import datetime, timezone

# Configuration
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "../public/data/prices.json")

# LMSYS Arena Score Mapping (Representative Data for Early 2026)
LMSYS_DATA = {
    "openai/gpt-4o": {"overall": 1315, "coding": 1350, "vision": 1300, "hard": 1280},
    "openai/gpt-4o-2024-05-13": {"overall": 1315, "coding": 1350, "vision": 1300, "hard": 1280},
    "openai/gpt-4o-mini": {"overall": 1270, "coding": 1220, "vision": 1250, "hard": 1150},
    "openai/o1-preview": {"overall": 1355, "coding": 1450, "vision": 1100, "hard": 1400},
    "openai/o1-mini": {"overall": 1310, "coding": 1400, "vision": 1000, "hard": 1350},
    "openai/o3-mini": {"overall": 1340, "coding": 1420, "vision": 1050, "hard": 1380},
    "anthropic/claude-3.5-sonnet": {"overall": 1310, "coding": 1380, "vision": 1280, "hard": 1290},
    "anthropic/claude-3-5-sonnet": {"overall": 1310, "coding": 1380, "vision": 1280, "hard": 1290},
    "anthropic/claude-3-opus": {"overall": 1250, "coding": 1220, "vision": 1200, "hard": 1240},
    "anthropic/claude-4.5-sonnet": {"overall": 1360, "coding": 1480, "vision": 1350, "hard": 1420},
    "anthropic/claude-4.5-opus": {"overall": 1390, "coding": 1500, "vision": 1400, "hard": 1480},
    "google/gemini-1.5-pro": {"overall": 1300, "coding": 1250, "vision": 1320, "hard": 1230},
    "google/gemini-3-pro": {"overall": 1350, "coding": 1320, "vision": 1380, "hard": 1310},
    "google/gemini-3-flash": {"overall": 1300, "coding": 1220, "vision": 1340, "hard": 1200},
    "deepseek/deepseek-v3": {"overall": 1305, "coding": 1370, "vision": 1220, "hard": 1310},
    "deepseek/deepseek-r1": {"overall": 1350, "coding": 1460, "vision": 1100, "hard": 1480},
}

def get_lmsys_scores(model_id):
    """Matches OpenRouter model ID to LMSYS scores."""
    target = model_id.lower()
    if target in LMSYS_DATA:
        return LMSYS_DATA[target]
    
    # Fuzzy match
    for key, val in LMSYS_DATA.items():
        if key in target or target in key:
            return val
            
    return {"overall": None, "coding": None, "vision": None, "hard": None}

def fetch_openrouter_prices():
    """Fetches model data from OpenRouter API."""
    try:
        response = requests.get(OPENROUTER_MODELS_URL)
        response.raise_for_status()
        return response.json().get('data', [])
    except Exception as e:
        print(f"Error fetching data: {e}")
        return []

def generate_baki_report(model, scores):
    """Generates a sharp, professional Baki Intelligence report for the model."""
    pricing = model.get('pricing', {})
    prompt_cost = float(pricing.get('prompt', 0)) * 1_000_000
    
    if scores['coding'] and scores['coding'] >= 1450:
        return "Supreme architectural logic. Zero-shot coding accuracy exceeds industry baselines."
    if scores['hard'] and scores['hard'] >= 1400:
        return "Deep reasoning specialist. Ideal for complex chain-of-thought and logical verification."
    if prompt_cost < 0.05:
        return "Efficiency outlier. Unrivaled ROI for high-throughput background processing."
    if model.get('context_length', 0) >= 1000000:
        return "Infinite memory archetype. Perfect for full-codebase context and massive RAG."
    
    return "Balanced performance profile. Reliable generalist for standard agentic workflows."

def normalize_data(raw_models, existing_models_map=None):
    """Processes raw API data into a clean format."""
    normalized = []
    today = datetime.now(timezone.utc).isoformat().split('T')[0]
    
    for model in raw_models:
        pricing = model.get('pricing', {})
        input_1m = float(pricing.get('prompt', 0)) * 1_000_000
        output_1m = float(pricing.get('completion', 0)) * 1_000_000
        
        # Filter out free models (price 0) and routers
        if (input_1m == 0 and output_1m == 0) or "router" in model.get('id', '').lower():
            continue

        model_id = model.get('id')
        scores = get_lmsys_scores(model_id)
        
        # Categorization logic
        tags = []
        name_lower = model.get('name', '').lower()
        id_lower = model_id.lower()
        
        if any(kw in name_lower or kw in id_lower for kw in ['coder', 'code', 'python', 'javascript']):
            tags.append('Code')
        if any(kw in name_lower or kw in id_lower for kw in ['vision', 'vl', 'multimodal', 'vision']):
            tags.append('Vision')
        if any(kw in name_lower or kw in id_lower for kw in ['reasoner', 'thought', 'thinking', 'o1', 'r1']):
            tags.append('Logic')
        
        if not tags: tags.append('Chat')

        new_pricing = {
            "prompt": round(input_1m, 4),
            "completion": round(output_1m, 4),
        }

        # Handle History and Price Status
        price_history = []
        price_status = 'stable'
        
        if existing_models_map and model_id in existing_models_map:
            old_model = existing_models_map[model_id]
            price_history = old_model.get('price_history', [])
            
            # Check for changes
            old_pricing = old_model.get('pricing', {})
            if old_pricing.get('prompt') != new_pricing['prompt'] or old_pricing.get('completion') != new_pricing['completion']:
                # Price changed!
                if new_pricing['prompt'] < old_pricing.get('prompt', 0) or new_pricing['completion'] < old_pricing.get('completion', 0):
                    price_status = 'drop'
                else:
                    price_status = 'hike'
                
                # Add to history if not already added today
                if not price_history or price_history[-1]['date'] != today:
                    price_history.append({
                        "date": today,
                        "prompt": new_pricing['prompt'],
                        "completion": new_pricing['completion']
                    })
                    # Keep only last 10 entries
                    price_history = price_history[-10:]
        else:
            # New model
            price_history = [{
                "date": today,
                "prompt": new_pricing['prompt'],
                "completion": new_pricing['completion']
            }]

        normalized.append({
            "id": model_id,
            "name": model.get('name'),
            "context_length": model.get('context_length'),
            "pricing": new_pricing,
            "price_history": price_history,
            "price_status": price_status,
            "scores": scores,
            "tags": tags,
            "provider": model_id.split('/')[0] if '/' in model_id else "unknown",
            "baki_report": generate_baki_report(model, scores)
        })
    return normalized

def main():
    print("Starting ModelMatrix Price & Score Update...")
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    
    # Load existing data for history tracking
    existing_models_map = {}
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                old_data = json.load(f)
                existing_models_map = {m['id']: m for m in old_data.get('models', [])}
        except Exception as e:
            print(f"Warning: Could not load existing data: {e}")

    raw_data = fetch_openrouter_prices()
    if not raw_data:
        print("No data fetched. Exiting.")
        return
        
    processed_models = normalize_data(raw_data, existing_models_map)
    
    output = {
        "metadata": {
            "source": "OpenRouter + LMSYS Arena Mapping",
            "last_updated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "total_models": len(processed_models)
        },
        "models": processed_models
    }
    
    with open(DATA_FILE, 'w') as f:
        json.dump(output, f, indent=2)
        
    print(f"Successfully updated {DATA_FILE} with {len(processed_models)} models.")

if __name__ == "__main__":
    main()
