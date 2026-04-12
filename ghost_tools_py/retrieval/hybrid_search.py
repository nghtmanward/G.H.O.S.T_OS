from typing import Dict, Any, List
from .doc_loader import load_text_files

def hybrid_search(request: Dict[str, Any]) -> Dict[str, Any]:
  # Placeholder for future: combine Ghost episodic, external docs, and LLM
  paths: List[str] = request.get("paths", [])
  text = load_text_files(paths)
  return {
    "text_length": len(text),
    "note": "hybrid_search is a stub; implement retrieval + LLM summarization here."
  }