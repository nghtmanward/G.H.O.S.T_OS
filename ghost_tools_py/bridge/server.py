from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from .ghost_toolbus import run_tool
from ..utils.config import SERVER_HOST, SERVER_PORT
from ..utils.logging_utils import logger

class GhostToolHandler(BaseHTTPRequestHandler):
  def _set_headers(self, status=200):
    self.send_response(status)
    self.send_header("Content-Type", "application/json")
    self.end_headers()

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

    result = run_tool(payload)
    self._set_headers(200)
    self.wfile.write(json.dumps(result).encode("utf-8"))

def run_server():
  server = HTTPServer((SERVER_HOST, SERVER_PORT), GhostToolHandler)
  logger.info(f"[server] Ghost tools server listening on {SERVER_HOST}:{SERVER_PORT}")
  try:
    server.serve_forever()
  except KeyboardInterrupt:
    logger.info("[server] Shutting down.")
  finally:
    server.server_close()

if __name__ == "__main__":
  run_server()