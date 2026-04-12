from typing import List
from pathlib import Path

def load_text_files(paths: List[str]) -> str:
  texts = []
  for p in paths:
    path = Path(p)
    if path.is_file():
      try:
        texts.append(path.read_text(encoding="utf-8", errors="ignore"))
      except Exception:
        continue
  return "\n\n".join(texts)