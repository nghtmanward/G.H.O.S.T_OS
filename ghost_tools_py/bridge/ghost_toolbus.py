from typing import Dict, Any
from ..utils.logging_utils import logger
from .ghost_protocol import validate_request
from ..llm.knowledge_tool import answer_query
from ..llm.summarization_tool import summarize_episodes

def run_tool(request: Dict[str, Any]) -> Dict[str, Any]:
  req = validate_request(request)
  if "error" in req:
    return req

  tool = req.get("tool")
  logger.info(f"[toolbus] Dispatching tool={tool}")

  if tool == "knowledge.query":
    return answer_query(req)
  if tool == "memory.summarize":
    return summarize_episodes(req)

  return {"error": "unknown_tool", "tool": tool}