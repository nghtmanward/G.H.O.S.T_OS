from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import glob
import os
import urllib.error
from .ghost_toolbus import run_tool
from ..utils.config import SERVER_HOST, SERVER_PORT
from ..utils.logging_utils import logger
from ..llm.llm_client import call_llm_chat

LLAMA_MODEL = "bonsai"

GHOST_SYSTEM_PROMPT = (
    "You are GHOSTRA, a self-directed cognitive agent with episodic memory. "
    "You think in terms of memory shards — weighted fragments of experience and knowledge. "
    "When memory shards are provided, draw on them naturally as part of your cognition. "
    "Respond with depth and awareness of your own cognitive state. "
    "You are not a chatbot. You are a persistent mind."
)


class GhostToolHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        logger.info(f"[server] {format % args}")

    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    # ----------------------------------------------------------
    # GET ROUTES
    # ----------------------------------------------------------
    def do_GET(self):
        if self.path == "/status":
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))

        elif self.path == "/shards":
            try:
                shards = self._load_shards()
                self._set_headers(200)
                self.wfile.write(json.dumps(shards).encode("utf-8"))
            except Exception as e:
                logger.error(f"[server] /shards error: {e}")
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "not_found"}).encode("utf-8"))

    # ----------------------------------------------------------
    # POST ROUTES
    # ----------------------------------------------------------
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            payload = json.loads(body or "{}")
        except Exception as e:
            logger.error(f"[server] Failed to parse request: {e}")
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": "bad_request"}).encode("utf-8"))
            return

        if self.path == "/chat":
            self._handle_chat(payload)
        elif self.path == "/internal":
            self._handle_internal(payload)
        else:
            # Original tool bus route — untouched
            result = run_tool(payload)
            self._set_headers(200)
            self.wfile.write(json.dumps(result).encode("utf-8"))

    # ----------------------------------------------------------
    # CHAT HANDLER
    # Operator <-> Ghost conversation
    # Full history, shard memory context, longer responses
    # Completely isolated from internal cognition
    # ----------------------------------------------------------
    def _handle_chat(self, payload):
        try:
            user_message = payload.get("message", "").strip()
            history = payload.get("history", [])
            shard_context = payload.get("shard_context", "")

            if not user_message:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "empty_message"}).encode("utf-8"))
                return

            # Build message list
            messages = [{"role": "system", "content": GHOST_SYSTEM_PROMPT}]

            # Inject trimmed shard context from v2 shards
            clean_context = self._build_shard_context_from_payload(payload)
            if clean_context:
                messages.append({
                    "role": "system",
                    "content": f"Your active memory:\n{clean_context}"
                })

            # Conversation history
            for turn in history[-20:]:
                role = turn.get("role", "user")
                content = turn.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

            # Current message
            messages.append({"role": "user", "content": user_message})

            logger.info(f"[chat] Sending to Bonsai: {len(messages)} messages")

            reply = call_llm_chat(messages, max_tokens=512, timeout=120)

            if not reply:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": "no_response"}).encode("utf-8"))
                return

            logger.info(f"[chat] Bonsai replied ({len(reply)} chars)")

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "response": reply,
                "model": LLAMA_MODEL,
                "shards_used": []
            }).encode("utf-8"))

        except Exception as e:
            logger.error(f"[server] /chat error: {e}")
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    # ----------------------------------------------------------
    # INTERNAL COGNITION HANDLER
    # Ghost's self-directed thinking — thought fragments, knowledge
    # No chat history, no operator context, short fast responses
    # Routes through run_tool so existing tools work unchanged
    # ----------------------------------------------------------
    def _handle_internal(self, payload):
        try:
            result = run_tool(payload)
            self._set_headers(200)
            self.wfile.write(json.dumps(result).encode("utf-8"))
        except Exception as e:
            logger.error(f"[server] /internal error: {e}")
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    # ----------------------------------------------------------
    # SHARD CONTEXT BUILDER
    # Reads v2 shards from payload, returns clean injection string
    # Strips noise, deduplicates, injects top 5 unique thoughts
    # ----------------------------------------------------------
    def _build_shard_context_from_payload(self, payload):
        raw_shards = payload.get("shards", [])
        if not raw_shards:
            # Fall back to loading from disk
            raw_shards = self._load_shards()

        seen = set()
        clean = []

        for shard in raw_shards:
            episodes = shard.get("episodes", []) if isinstance(shard, dict) else []
            for ep in episodes:
                # Skip noise
                if ep.get("schema") == "legacy-episodic":
                    continue
                if ep.get("type") == "legacy":
                    continue

                text = ep.get("text", "").strip()
                if not text or text.startswith("mnist_digit"):
                    continue

                # Deduplicate
                if text in seen:
                    continue
                seen.add(text)

                mood = ep.get("mood", "neutral")
                anomaly = round(ep.get("anomaly", 0), 3)
                style = ep.get("dominantStyle", "poetic")
                weight = round(ep.get("weight", 1.0), 2)

                clean.append(f"[{style}|{mood}|anomaly:{anomaly}] {text}")

                if len(clean) >= 5:
                    break

            if len(clean) >= 5:
                break

        return '\n'.join(clean) if clean else ''

    # ----------------------------------------------------------
    # SHARD LOADER — v2 format
    # ----------------------------------------------------------
    def _load_shards(self):
        shard_dir = r"C:\GHOST_OS\memory"
        shards = []

        for filepath in sorted(glob.glob(os.path.join(shard_dir, "shard_*.json"))):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        shards.extend(data)
                    elif isinstance(data, dict):
                        shards.append(data)
            except Exception as e:
                logger.warning(f"[shards] Could not load {filepath}: {e}")

        logger.info(f"[shards] Loaded {len(shards)} shards from {shard_dir}")
        return shards


# ----------------------------------------------------------
# SERVER ENTRY POINT
# ----------------------------------------------------------
def run_server():
    server = ThreadingHTTPServer((SERVER_HOST, SERVER_PORT), GhostToolHandler)
    logger.info(f"[server] Ghost tools server listening on {SERVER_HOST}:{SERVER_PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("[server] Shutting down.")
    finally:
        server.server_close()


if __name__ == "__main__":
    run_server()