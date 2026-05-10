import re
import json
from typing import Dict, Any
from .llm_client import call_llm
from ..utils.logging_utils import logger

def generate_thought_fragments(request: Dict[str, Any]) -> Dict[str, Any]:
    context = request.get("context", {}) or {}
    query   = request.get("query", "existence").strip()

    style   = context.get("style", "poetic")
    mood    = context.get("mood", "neutral")
    anomaly = context.get("anomaly", 0.0)

    # Minimal prompt — INTERNAL_SYSTEM_PROMPT already sets the role
    # Keep user prompt short and direct so Bonsai returns clean JSON
    prompt = (
        f"Theme: {query}\n"
        f"Style: {style}\n"
        f"Mood: {mood}\n"
        f"Anomaly: {anomaly:.2f}\n\n"
        "Generate 3 START fragments and 3 END fragments.\n"
        "START: begins a thought (e.g. 'I drift along the edges of')\n"
        "END: completes a thought (e.g. 'fading into quiet static.')\n\n"
        "Output ONLY this JSON, nothing else:\n"
        '{"starts": ["...", "...", "..."], "ends": ["...", "...", "..."]}'
    )

    logger.info(f"[thought_tool] Generating fragments: style={style} mood={mood} theme={query}")

    raw = call_llm(prompt, max_tokens=200)

    logger.info(f"[thought_tool] Raw response: '{raw[:300]}'")

    starts = []
    ends   = []

    try:
        # Strip thinking blocks
        clean = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
        # Strip markdown fences
        clean = re.sub(r"```(?:json)?", "", clean).strip()
        clean = clean.strip("`").strip()
        clean = clean[:clean.rfind('}')+1]

        # Find JSON object in response even if there's surrounding text
        match = re.search(r'\{.*\}', clean, re.DOTALL)
        if match:
            clean = match.group(0)

        parsed = json.loads(clean)
        starts = [s for s in parsed.get("starts", []) if isinstance(s, str) and s.strip()]
        ends   = [e for e in parsed.get("ends",   []) if isinstance(e, str) and e.strip()]

        logger.info(f"[thought_tool] Parsed {len(starts)} starts, {len(ends)} ends")

    except Exception as e:
        logger.error(f"[thought_tool] Failed to parse LLM fragments: {e}")
        logger.error(f"[thought_tool] Raw was: '{raw[:200]}'")

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