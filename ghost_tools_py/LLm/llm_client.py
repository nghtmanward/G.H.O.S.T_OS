from typing import Optional
from ..utils.config import LLM_API_KEY, LLM_MODEL
from ..utils.logging_utils import logger

# This is a stub; you can wire it to OpenAI, Azure, etc.
# The important part: Ghost calls this as a TOOL, not as its brain.

def call_llm(prompt: str, *, max_tokens: int = 512) -> str:
  if not LLM_API_KEY or LLM_API_KEY == "YOUR_API_KEY_HERE":
    logger.warning("LLM_API_KEY not set; returning mock response.")
    return f"[MOCK LLM RESPONSE] {prompt[:120]}..."

  # TODO: replace with real API call
  logger.info(f"Calling LLM model={LLM_MODEL}, tokens={max_tokens}")
  # Example shape:
  # response = openai.chat.completions.create(...)
  # return response.choices[0].message.content
  return f"[LLM RESPONSE PLACEHOLDER] {prompt[:200]}"