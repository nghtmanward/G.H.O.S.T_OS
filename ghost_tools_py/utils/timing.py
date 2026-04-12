import time
from contextlib import contextmanager

@contextmanager
def timed(label: str):
  start = time.time()
  try:
    yield
  finally:
    end = time.time()
    print(f"[TIMING] {label}: {(end - start)*1000:.2f} ms")