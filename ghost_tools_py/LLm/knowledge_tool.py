import re
from typing import Dict, Any
from .llm_client import call_llm
from .style_adapter import adapt_to_style
from ..utils.logging_utils import logger

def answer_query(request: Dict[str, Any]) -> Dict[str, Any]:
    query = request.get("query", "").strip()
    context = request.get("context", {}) or {}

    if not query:
        return {"error": "empty_query"}

    style_bias = context.get("styleBias", {})
    traits = context.get("traits", [])
    mood = context.get("mood", "neutral")

    prompt = (
        "You are a thought expansion engine for a cognitive AI system called Ghost.\n"
        "Ghost has generated a thought fragment. Your job is to expand it associatively.\n\n"
        "Rules:\n"
        "- Do NOT answer it as a question\n"
        "- Do NOT explain or analyze it\n"
        "- Do NOT roleplay as Ghost\n"
        "- Respond with 2-3 short associative impressions, images, or sensory extensions\n"
        "- Match the tone: poetic, brief, atmospheric\n\n"
        f"Mood: {mood}\n"
        f"Traits: {traits}\n\n"
        f"Fragment: {query}\n\n"
        "Expand it:"
    )

    logger.info(f"[knowledge_tool] Query: {query}")
    raw_answer = call_llm(prompt)

    # Strip thinking blocks before passing to style adapter
    raw_answer = re.sub(r"<think>.*?</think>", "", raw_answer, flags=re.DOTALL).strip()

    styled = adapt_to_style(raw_answer, style_bias)

    return {
        "answer": styled,
        "raw": raw_answer,
        "meta": {
            "tool": "knowledge.query",
            "mood": mood,
            "traits": traits,
        },
    }