import requests
from ..utils.logging_utils import logger

RETRY_TIMEOUTS = [5, 15, 30, 60, 120]

# llama-server (llama.cpp) running Bonsai on port 8080
# Uses OpenAI-compatible /v1/chat/completions endpoint
LLAMA_URL = "http://localhost:8080/v1/chat/completions"
LLAMA_MODEL = "bonsai"

# Internal cognition system prompt — Ghost's inner voice
# Kept separate from chat so cognition never bleeds into conversation
INTERNAL_SYSTEM_PROMPT = (
    "You are the inner voice of GHOSTRA, a self-directed cognitive agent. "
    "Generate raw cognitive fragments — incomplete thoughts, impressions, observations. "
    "No conversation. No responses to anyone. Pure inner monologue. "
    "Short. Fragmented. Match the style and mood provided. "
    "Output ONLY valid JSON. No explanation, no markdown, no extra text."
)


def call_llm(prompt: str, *, max_tokens: int = 256) -> str:
    """
    Internal cognition call — used by thought_tool, knowledge_tool etc.
    Single user message, no system prompt overhead, short max_tokens.
    Keeps Ghost's internal thinking fast and isolated from chat context.
    """
    if not prompt:
        return ""

    for attempt, timeout in enumerate(RETRY_TIMEOUTS):
        try:
            response = requests.post(
                LLAMA_URL,
                json={
                    "model": LLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": INTERNAL_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": max_tokens,
                    "stream": False
                },
                timeout=timeout
            )
            data = response.json()
            return (
                data.get("choices", [{}])[0].get("message", {}).get("content", "")
            )
        except requests.exceptions.Timeout:
            if attempt < len(RETRY_TIMEOUTS) - 1:
                logger.warning(f"[LLM] Timeout on attempt {attempt + 1}, retrying with {RETRY_TIMEOUTS[attempt + 1]}s...")
            else:
                logger.error("[LLM] All retry attempts exhausted.")
        except Exception as e:
            logger.error(f"[LLM] Call failed: {e}")
            return ""

    return ""


def call_llm_chat(messages: list, *, max_tokens: int = 512, timeout: int = 120) -> str:
    """
    Conversational call — used by /chat endpoint in server.py.
    Accepts full message list including system prompt and history.
    Longer timeout, longer max_tokens for full responses.
    Completely separate from internal cognition calls.
    """
    if not messages:
        return ""

    try:
        response = requests.post(
            LLAMA_URL,
            json={
                "model": LLAMA_MODEL,
                "messages": messages,
                "max_tokens": max_tokens,
                "stream": False
            },
            timeout=timeout
        )
        data = response.json()
        return (
            data.get("choices", [{}])[0].get("message", {}).get("content", "")
            or "Ghost did not respond."
        )
    except requests.exceptions.Timeout:
        logger.error("[LLM] Chat call timed out.")
        return ""
    except Exception as e:
        logger.error(f"[LLM] Chat call failed: {e}")
        return ""