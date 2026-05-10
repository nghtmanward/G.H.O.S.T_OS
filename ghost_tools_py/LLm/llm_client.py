import json
import os
import requests
from ..utils.logging_utils import logger

RETRY_TIMEOUTS = [5, 15, 30, 60, 120]

SETTINGS_PATH = r"C:\GHOST_OS\settings.json"

DEFAULT_URL   = "http://localhost:11434/v1/chat/completions"
DEFAULT_MODELS = {
    "chat":      "llama3-gpu:latest",
    "fragment":  "llama3-gpu:latest",
    "reasoning": "llama3-gpu:latest",
    "code":      "qwen2.5-coder:7b",
    "math":      "llama3-gpu:latest",
    "memory":    "llama3-gpu:latest",
    "safety":    "llama3-gpu:latest",
    "default":   "llama3-gpu:latest"
}

def _load_settings():
    try:
        if os.path.exists(SETTINGS_PATH):
            with open(SETTINGS_PATH, "r", encoding="utf-8-sig") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"[llm_client] Could not load settings.json: {e}")
    return {}

def get_model(role: str) -> str:
    s = _load_settings()
    models = s.get("llm", {}).get("models", {})
    default = models.get("default") or DEFAULT_MODELS["default"]
    return models.get(role) or DEFAULT_MODELS.get(role) or default

def get_url() -> str:
    s = _load_settings()
    return s.get("llm", {}).get("bridge_url") or DEFAULT_URL

def get_token_limit(role: str) -> int:
    s = _load_settings()
    llm = s.get("llm", {})
    if role == "fragment":
        return int(llm.get("frag_tokens") or 256)
    return int(llm.get("chat_tokens") or 1024)

# Internal cognition system prompt
INTERNAL_SYSTEM_PROMPT = (
    "You are the inner voice of GHOSTRA, a self-directed cognitive agent. "
    "Generate raw cognitive fragments — incomplete thoughts, impressions, observations. "
    "No conversation. No responses to anyone. Pure inner monologue. "
    "Short. Fragmented. Match the style and mood provided. "
    "Output ONLY valid JSON. No explanation, no markdown, no extra text."
)

def call_llm(prompt: str, *, max_tokens: int = None) -> str:
    """
    Internal cognition call — fragment generation, knowledge queries etc.
    Reads fragment model and token limit from settings.json.
    """
    if not prompt:
        return ""

    url   = "http://localhost:11434/v1/chat/completions"
    model = get_model("fragment")
    limit = max_tokens or get_token_limit("fragment")

    for attempt, timeout in enumerate(RETRY_TIMEOUTS):
        try:
            response = requests.post(
                url,
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": INTERNAL_SYSTEM_PROMPT},
                        {"role": "user",   "content": prompt}
                    ],
                    "max_tokens": limit,
                    "stream": False
                },
                timeout=timeout
            )
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")
        except requests.exceptions.Timeout:
            if attempt < len(RETRY_TIMEOUTS) - 1:
                logger.warning(f"[LLM] Timeout on attempt {attempt + 1}, retrying with {RETRY_TIMEOUTS[attempt + 1]}s...")
            else:
                logger.error("[LLM] All retry attempts exhausted.")
        except Exception as e:
            logger.error(f"[LLM] Call failed: {e}")
            return ""
    return ""

def call_llm_chat(messages: list, *, max_tokens: int = None, timeout: int = 120) -> str:
    """
    Conversational call — operator chat.
    Reads chat model and token limit from settings.json.
    """
    if not messages:
        return ""

    url   = "http://localhost:11434/v1/chat/completions"
    model = get_model("chat")
    limit = max_tokens or get_token_limit("chat")

    try:
        response = requests.post(
            url,
            json={
                "model": model,
                "messages": messages,
                "max_tokens": limit,
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

def call_llm_role(role: str, messages: list, *, timeout: int = 120) -> str:
    """
    Role-based call — reasoning, code, math, memory, safety.
    Reads the appropriate model from settings.json.
    """
    if not messages:
        return ""

    url   = "http://localhost:11434/v1/chat/completions"
    model = get_model(role)
    limit = get_token_limit("chat")

    try:
        response = requests.post(
            url,
            json={
                "model": model,
                "messages": messages,
                "max_tokens": limit,
                "stream": False
            },
            timeout=timeout
        )
        data = response.json()
        return (
            data.get("choices", [{}])[0].get("message", {}).get("content", "")
            or ""
        )
    except Exception as e:
        logger.error(f"[LLM] Role call ({role}) failed: {e}")
        return ""