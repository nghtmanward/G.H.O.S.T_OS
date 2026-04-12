from typing import Dict, Any

# This defines the shape of requests/responses between Ghost (JS) and Python tools.

def validate_request(payload: Dict[str, Any]) -> Dict[str, Any]:
  if "tool" not in payload:
    return {"error": "missing_tool"}
  return payload