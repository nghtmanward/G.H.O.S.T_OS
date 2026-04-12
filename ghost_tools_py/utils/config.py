import os

# Simple config; you can later swap to dotenv or a proper config system
LLM_API_KEY = os.getenv("GHOST_LLM_API_KEY", "YOUR_API_KEY_HERE")
LLM_MODEL = os.getenv("GHOST_LLM_MODEL", "gpt-4.1-mini")

SERVER_HOST = "127.0.0.1"
SERVER_PORT = 8765  # JS will call http://127.0.0.1:8765/tool