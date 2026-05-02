from typing import Dict, Any
from .llm_client import call_llm
from ..utils.logging_utils import logger

def generate_thought_fragments(request: Dict[str, Any]) -> Dict[str, Any]:
    context = request.get("context", {}) or {}
    query   = request.get("query", "existence").strip()

    style  = context.get("style", "poetic")
    mood   = context.get("mood", "neutral")
    anomaly = context.get("anomaly", 0.0)

    prompt = (
        "You are a fragment generator for a cognitive AI called Ghost.\n"
        "Ghost builds its thoughts by combining a START fragment with an END fragment.\n"
        "You must output ONLY a JSON object — no explanation, no markdown, no extra text.\n\n"
        f"Current theme: {query}\n"
        f"Style: {style}\n"
        f"Mood: {mood}\n"
        f"Anomaly level: {anomaly:.2f} (0=calm, 1=highly anomalous)\n\n"
        "Generate 3 START fragments and 3 END fragments that match the style and mood.\n"
        "START fragments begin a thought (e.g. 'I drift along the edges of').\n"
        "END fragments complete a thought (e.g. 'fading into the quiet static.').\n\n"
        "Respond ONLY with this exact JSON structure:\n"
        "{\n"
        '  "starts": ["fragment1", "fragment2", "fragment3"],\n'
        '  "ends": ["fragment1", "fragment2", "fragment3"]\n'
        "}\n"
    )

    logger.info(f"[thought_tool] Generating fragments: style={style} mood={mood} theme={query}")

    raw = call_llm(prompt, max_tokens=256)

    # Safe parse — if LLM returns malformed JSON, return empty fragments
    try:
        import json
        # Strip any accidental markdown fences
        clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        parsed = json.loads(clean)
        starts = [s for s in parsed.get("starts", []) if isinstance(s, str) and s.strip()]
        ends   = [e for e in parsed.get("ends",   []) if isinstance(e, str) and e.strip()]
    except Exception as e:
        logger.error(f"[thought_tool] Failed to parse LLM fragments: {e}")
        starts = []
        ends   = []

    return {
        "fragments": {
            "starts": starts,
            "ends":   ends
        },
        "meta": {
            "tool":    "thought.generate",
            "style":   style,
            "mood":    mood,
            "anomaly": anomaly,
            "theme":   query
        }
    }