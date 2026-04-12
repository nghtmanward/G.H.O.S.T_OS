from typing import Dict

def adapt_to_style(text: str, style_bias: Dict[str, float]) -> str:
  """
  Ghost already has styleBias (poetic, analytic, emotional, cryptic).
  We don't override it; we just nudge the LLM output a bit.
  For now this is a stub that could later:
    - add metaphor for poetic
    - add structure for analytic
    - add affective language for emotional
    - add obliqueness for cryptic
  """
  # You can implement real transforms later; keep it identity for now.
  return text