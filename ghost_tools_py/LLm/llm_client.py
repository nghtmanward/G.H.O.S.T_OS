import requests
from ..utils.logging_utils import logger

def call_llm(prompt: str, *, max_tokens: int = 512) -> str:
    if not prompt:
        return ""
    
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3-gpu",
                "prompt": prompt,
                "stream": False
            },
            timeout=30
        )
        return response.json().get("response", "")
    except Exception as e:
        logger.error(f"[LLM] Call failed: {e}")
        return ""