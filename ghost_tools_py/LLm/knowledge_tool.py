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
    "You are a knowledge tool used by a separate cognitive system called Ghost.\n"
    "You are NOT the agent. You only provide factual, concise answers.\n\n"
    f"Mood: {mood}\n"
    f"Traits: {traits}\n"
    f"StyleBias: {style_bias}\n\n"
    f"Question: {query}\n\n"
    "Answer clearly and factually. Do not roleplay as the Ghost.\n"
  )

  logger.info(f"[knowledge_tool] Query: {query}")
  raw_answer = call_llm(prompt)
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