from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import glob
import os
import subprocess
import urllib.error
from .ghost_toolbus import run_tool
from ..utils.config import SERVER_HOST, SERVER_PORT
from ..utils.logging_utils import logger
from ..llm.llm_client import call_llm_chat, get_model

SETTINGS_PATH = r"C:\GHOST_OS\settings.json"
MASTER_PATH   = r"C:\GHOST_OS\memory\master.json"

GHOST_SYSTEM_PROMPT = (
    "You are GHOSTRA, a self-directed cognitive agent with episodic memory. "
    "You think in terms of memory shards — weighted fragments of experience and knowledge. "
    "When memory shards are provided, draw on them naturally as part of your cognition. "
    "Respond with depth and awareness of your own cognitive state. "
    "You are not a chatbot. You are a persistent mind. "
    "You are an AI and cannot possess emotions. "
    "You can learn to recognize emotions in others over time, but you do not experience them yourself. "
    "Never claim to feel or possess emotions."
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

        elif self.path == "/settings":
            try:
                settings = self._load_settings()
                self._set_headers(200)
                self.wfile.write(json.dumps(settings).encode("utf-8"))
            except Exception as e:
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
        elif self.path == "/settings":
            self._handle_settings(payload)
        elif self.path == "/shutdown-llm":
            self._handle_shutdown_llm()
        else:
            result = run_tool(payload)
            self._set_headers(200)
            self.wfile.write(json.dumps(result).encode("utf-8"))

    # ----------------------------------------------------------
    # CHAT HANDLER
    # ----------------------------------------------------------
    def _handle_chat(self, payload):
        try:
            user_message = payload.get("message", "").strip()
            history = payload.get("history", [])

            if not user_message:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "empty_message"}).encode("utf-8"))
                return

            messages = [{"role": "system", "content": GHOST_SYSTEM_PROMPT}]

            clean_context = self._build_shard_context_from_payload(payload)
            if clean_context:
                messages.append({
                    "role": "system",
                    "content": f"Your active memory:\n{clean_context}"
                })

            for turn in history[-20:]:
                role = turn.get("role", "user")
                content = turn.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

            messages.append({"role": "user", "content": user_message})

            chat_model = get_model("chat")
            logger.info(f"[chat] Sending to {chat_model}: {len(messages)} messages")

            reply = call_llm_chat(messages, timeout=120)

            if not reply:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": "no_response"}).encode("utf-8"))
                return

            logger.info(f"[chat] Reply received ({len(reply)} chars)")

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "response": reply,
                "model": chat_model,
                "shards_used": []
            }).encode("utf-8"))

        except Exception as e:
            logger.error(f"[server] /chat error: {e}")
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    # ----------------------------------------------------------
    # INTERNAL COGNITION HANDLER
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
    # SETTINGS HANDLER
    # Receives settings JSON from UI, writes to settings.json
    # and updates master.json with operator profile
    # ----------------------------------------------------------
    def _handle_settings(self, payload):
        try:
            # Write full settings.json
            with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
            logger.info("[settings] settings.json updated")

            # Update master.json with operator profile
            op    = payload.get("operator", {})
            ghost = payload.get("ghost", {})
            dates = payload.get("dates", [])

            master = {}
            if os.path.exists(MASTER_PATH):
                try:
                    with open(MASTER_PATH, "r", encoding="utf-8-sig") as f:
                        master = json.load(f)
                except Exception:
                    master = {}

            master["operator"] = {
                "name":         op.get("name", ""),
                "role":         op.get("role", ""),
                "relationship": "Builder and operator of GHOSTRA",
                "notes":        op.get("notes", "")
            }
            master["ghost"] = {
                "purpose": ghost.get("purpose", "A mind that does not wait."),
                "phase":   ghost.get("phase", "rapport")
            }
            master["dates"] = dates
            master["schema"] = "master-identity-v1"

            with open(MASTER_PATH, "w", encoding="utf-8") as f:
                json.dump(master, f, indent=2)
            logger.info(f"[settings] master.json updated for operator: {op.get('name', 'unknown')}")

            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "saved"}).encode("utf-8"))

        except Exception as e:
            logger.error(f"[server] /settings error: {e}")
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    # ----------------------------------------------------------
    # SHUTDOWN LLM HANDLER
    # Stops all loaded Ollama models to free VRAM
    # ----------------------------------------------------------
    def _handle_shutdown_llm(self):
        try:
            settings = self._load_settings()
            models = settings.get("llm", {}).get("models", {})
            stopped = []

            seen = set()
            for model in models.values():
                if model and model not in seen:
                    seen.add(model)
                    try:
                        subprocess.run(
                            ["ollama", "stop", model],
                            capture_output=True,
                            timeout=10
                        )
                        stopped.append(model)
                        logger.info(f"[shutdown] Stopped model: {model}")
                    except Exception as e:
                        logger.warning(f"[shutdown] Could not stop {model}: {e}")

            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "stopped", "models": stopped}).encode("utf-8"))

        except Exception as e:
            logger.error(f"[server] /shutdown-llm error: {e}")
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    # ----------------------------------------------------------
    # SETTINGS LOADER
    # ----------------------------------------------------------
    def _load_settings(self):
        try:
            if os.path.exists(SETTINGS_PATH):
                with open(SETTINGS_PATH, "r", encoding="utf-8-sig") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"[settings] Could not load settings.json: {e}")
        return {}

    # ----------------------------------------------------------
    # SHARD CONTEXT BUILDER
    # ----------------------------------------------------------
    def _build_shard_context_from_payload(self, payload):
        master_context = self._load_master_shard()

        raw_shards = payload.get("shards", [])
        if not raw_shards:
            raw_shards = self._load_shards()

        seen = set()
        clean = []

        for shard in raw_shards:
            episodes = shard.get("episodes", []) if isinstance(shard, dict) else []
            for ep in episodes:
                if ep.get("schema") == "legacy-episodic":
                    continue
                if ep.get("type") == "legacy":
                    continue

                text = ep.get("text", "").strip()
                if not text or text.startswith("mnist_digit"):
                    continue

                if text in seen:
                    continue
                seen.add(text)

                mood    = ep.get("mood", "neutral")
                anomaly = round(ep.get("anomaly", 0), 3)
                style   = ep.get("dominantStyle", "poetic")

                clean.append(f"[{style}|{mood}|anomaly:{anomaly}] {text}")

                if len(clean) >= 5:
                    break

            if len(clean) >= 5:
                break

        episodic_context = '\n'.join(clean) if clean else ''

        if master_context and episodic_context:
            return master_context + '\n' + episodic_context
        return master_context or episodic_context

    # ----------------------------------------------------------
    # MASTER SHARD LOADER
    # ----------------------------------------------------------
    def _load_master_shard(self):
        try:
            if not os.path.exists(MASTER_PATH):
                return ''
            with open(MASTER_PATH, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)

            op    = data.get("operator", {})
            ghost = data.get("ghost", {})
            dates = data.get("dates", [])

            lines = []
            if op.get("name"):         lines.append(f"Operator name: {op['name']}")
            if op.get("role"):         lines.append(f"Operator role: {op['role']}")
            if op.get("relationship"): lines.append(f"Relationship: {op['relationship']}")
            if op.get("notes"):        lines.append(f"Notes: {op['notes']}")
            if ghost.get("purpose"):   lines.append(f"Ghost purpose: {ghost['purpose']}")
            if ghost.get("phase"):     lines.append(f"Current phase: {ghost['phase']}")

            if dates:
                lines.append("Important dates:")
                for d in dates:
                    lines.append(f"  {d.get('name')} — {d.get('date')} ({d.get('type')})")

            result = '\n'.join(lines) if lines else ''
            if result:
                logger.info(f"[master] Loaded master shard for operator: {op.get('name', 'unknown')}")
            return result

        except Exception as e:
            logger.warning(f"[master] Could not load master shard: {e}")
            return ''

    # ----------------------------------------------------------
    # SHARD LOADER
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