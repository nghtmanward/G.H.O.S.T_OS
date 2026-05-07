import re
from typing import Dict, Any, List
from .llm_client import call_llm
from .style_adapter import adapt_to_style
from ..utils.logging_utils import logger

def summarize_episodes(request: Dict[str, Any]) -> Dict[str, Any]:
  episodes: List[Dict[str, Any]] = request.get("episodes", [])
  context = request.get("context", {}) or {}
  style_bias = context.get("styleBias", {})

  if not episodes:
    return {"error": "no_episodes"}

  texts = [e.get("text", "") for e in episodes if e.get("text")]
  joined = "\n".join(f"- {t}" for t in texts[:50])

  prompt = (
    "You are a summarization tool used by a separate cognitive system called Ghost.\n"
    "You are NOT the agent. You only summarize.\n\n"
    "Summarize the following episodic memories into a concise description of themes and events:\n\n"
    f"{joined}\n\n"
    "Summary:\n"
  )

  logger.info(f"[summarization_tool] Summarizing {len(texts)} episodes")
  raw_answer = call_llm(prompt, max_tokens=256)

  # Strip thinking blocks before passing to style adapter
  raw_answer = re.sub(r"<think>.*?</think>", "", raw_answer, flags=re.DOTALL).strip()

  styled = adapt_to_style(raw_answer, style_bias)

  return {
    "summary": styled,
    "raw": raw_answer,
    "meta": {
      "tool": "memory.summarize",
      "episode_count": len(texts),
    },
  }