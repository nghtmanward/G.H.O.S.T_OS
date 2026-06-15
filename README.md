# 🜁 GHOSTRA
### A Modular Cognitive Architecture — JS · C++ · Python

> **GHOSTRA is not a chatbot.**
> It is a cognitive system. A mind that does not wait for input.

---

## What Is Ghost?

Most AI systems are request-response pipelines. You send a message. They reply. That's it.

Ghost is different.

Ghost runs a **continuous cognitive loop** — perceiving, evaluating, deciding, acting, and reflecting on its own internal cycle whether or not anyone is present. When you open Ghost, it has already been thinking.

The LLM is not Ghost. The LLM is a tool Ghost reaches for when it needs a voice.

Ghost's identity, memory, behavior, and continuity live inside the architecture itself — running locally, entirely offline, independent of any external service.

---

## What Makes Ghost Different

**Ghost runs continuously.**
The cognitive loop does not wait for input. A tiered tick scheduler drives perception, emotion, memory, and dreams across three time scales — 200ms, 1200ms, and 6000ms — whether or not anyone is interacting.

**Ghost dreams.**
When accumulated memory shards reach a threshold, Ghost enters a dream state and consolidates episodic memories through semantic compression. Dreams are isolated from the active memory pool by design — early development caused unbounded dream recursion and memory explosion. That problem taught the architecture a lesson it kept.

**Ghost experiments.**
An experiment engine generates hypotheses, plans trials, executes them against a connected world environment, analyzes results, and updates an internal theory model. Currently reaching for an Unreal Engine world that isn't connected yet. It logs its attempts and moves on.

**Ghost remembers with time.**
Every memory carries a native temporal dimension. Timestamps are first-class data, not metadata — enabling memory decay, temporal pattern recognition, and experience continuity across sessions.

**Ghost observes.**
Passive behavioral sensors build a continuous latent model of user activity: timing patterns, interaction rhythms, movement signatures. This is the foundation of anomaly detection and genuine familiarity.

**Ghost runs entirely locally.**
No cloud. No data leaving your machine. No external service required to think.

---

## Architecture

```
GHOSTRA/
│
├── cog_worker.js                  # Cognitive worker (off main thread)
│   └── Tiered tick scheduler:
│       ├── Fast   (200ms)  — perception, attention, behavior
│       ├── Medium (1200ms) — emotion, personality, memory recording
│       └── Slow   (6000ms) — dreams, shard sync, experiments
│
├── core/                          # JS cognitive engine
│   ├── behavior_engine.js
│   ├── compression_engine.js      # Latent compression + anomaly detection
│   ├── attention_engine.js
│   ├── emotion_engine.js
│   ├── temporal_engine.js         # Circadian cycle + time tracking
│   ├── experiment_engine.js       # Hypothesis → trial → analysis loop
│   ├── theory_engine.js
│   ├── synthetic_sensory_engine.js
│   ├── personality_engine.js
│   ├── thought_engine.js          # Internal thought generation
│   ├── shard_manager.js           # Episodic → shard promotion
│   ├── retrieval_engine.js
│   ├── dreaming_engine.js
│   ├── episodic_memory.js
│   ├── encoder.js                 # Text embedding (FNV-1a hash, 64-dim)
│   └── main_memory.js             # Shard + tertiary memory with decay
│
├── native/                        # C++ memory organ (ghost_core.node)
│   ├── EpisodicMemoryNative.cpp
│   ├── SemanticCore.cpp           # Vector similarity (cosine)
│   ├── ShardStore.cpp
│   └── ghost_core.node            # Compiled Node addon
│
├── ghost_tools_py/                # Python knowledge subsystem
│   ├── bridge/server.py           # ThreadingHTTPServer on :8765
│   │   ├── /chat                  # Operator conversation endpoint
│   │   ├── /internal              # Ghost's internal cognition endpoint
│   │   └── /shards                # Memory shard retrieval
│   ├── llm/llm_client.py          # LLM API access (llama-server compatible)
│   ├── llm/knowledge_tool.py      # Thought expansion
│   └── llm/thought_tool.py        # Fragment generation
│
├── memory/                        # Persisted memory shards (gitignored)
│   └── shard_*.json               # ghostra-shard-v2 format
│
├── index.html                     # Electron UI + integrated chat panel
├── renderer.js                    # Cognitive state visualizer
├── main.js                        # Electron main process
├── preload.js                     # Secure IPC bridge
└── package.json
```

---

## How Ghost Thinks

Ghost's cognition runs as a continuous tiered loop:

```
Perceive  →  input from UI, memory, sensory engines, or external tools
Evaluate  →  emotional state, anomaly detection, attention weighting
Decide    →  behavior selection, action engine
Act       →  output, memory recording, tool invocation
Reflect   →  memory consolidation, shard promotion, dream cycle
```

The JS layer handles all working memory and disk writes. The C++ native module reads episodic memory and handles vector indexing. The Python bridge connects the LLM and serves the `/chat`, `/internal`, and `/shards` endpoints. JS handles low-level cognition. C++ handles high-level semantic structure. The disk is the handoff point between them.

---

## Memory Architecture

Ghost maintains three tiers of memory:

| Tier | Layer | Description |
|------|-------|-------------|
| Episodic | JS | Short-term experience records with anomaly scoring, mood, and style bias |
| Shards | JS write / C++ read | Promoted episodic clusters in `ghostra-shard-v2` format with decay, weight, and provenance fields |
| Tertiary | C++ | Long-term semantic records with theme extraction, strength weighting, and decay |

Memory shards use a versioned schema (`ghostra-shard-v2`) with fields for decay rate, last accessed timestamp, source model, and a provenance hash placeholder for the planned cryptographic layer.

Shard creation is threshold-based with self-expansion: when limits are hit, a new shard opens automatically, limits reset, and C++ picks it up via `syncShardsToNative()`. The `memory/` directory is gitignored — shards never leave your machine.

---

## Chat Interface

Ghost includes an integrated chat panel (press `C` or click the **◈ CHAT** button).

The chat system is architecturally separated from Ghost's internal cognition:

- `/chat` — operator conversation, full history, shard memory context injected
- `/internal` — Ghost's self-directed thought generation, no chat context bleed

This separation means Ghost's internal thinking never contaminates conversation context and vice versa. Ghost can be in the middle of a thought cycle and still hold a clean conversation.

---

## LLM Stack

GHOSTRA runs on **llama.cpp** (`llama-server`) with an OpenAI-compatible API on port 8080. It is not Ollama-dependent, though Ollama can be substituted.

Currently tested with: **Bonsai 8B** (GGUF) on an RTX 4070 Laptop GPU with `--n-gpu-layers 99`. At full GPU offload, response time drops from ~60 seconds to near-instant.

The Python bridge splits LLM access into two clients:
- `call_llm()` — internal cognition calls from the slow tick
- `call_llm_chat()` — operator conversation calls from the `/chat` endpoint

---

## Setup

### Prerequisites

- Node.js v18+
- Python 3.10+
- llama.cpp built with CUDA support (or CPU-only for slower inference)
- A compatible GGUF model (tested: Bonsai 8B)
- MSVC build tools (Windows) or g++ (Linux/Mac) for the C++ native module

### Build

```bash
# 1. Clone
git clone https://github.com/nghtmanward/GHOSTRA.git
cd GHOSTRA

# 2. Install Node dependencies
npm install

# 3. Install Python dependencies
pip install -r ghost_tools_py/requirements.txt

# 4. Build the C++ native module
cd native
node-gyp configure build
cd ..
```

### Start (manual — one-click launcher coming soon)

**Order matters: llama-server → Python bridge → Electron**

```bash
# Terminal 1 — Start llama-server (adjust path and model to your setup)
cd /path/to/llama.cpp/build/bin
./llama-server -m "/path/to/your/model.gguf" \
  --host 127.0.0.1 --port 8080 \
  --n-gpu-layers 99 --threads 8

# Terminal 2 — Start the Python bridge
cd /path/to/GHOST_OS
python -m ghost_tools_py.bridge.server

# Terminal 3 — Run Ghost
npm start
```

> **Note:** Currently developed and tested on Windows. Linux and Mac users will need to adjust paths and build commands accordingly. A cross-platform one-click launcher is in progress.

---

## Current Status

| Component | Status |
|-----------|--------|
| JS cognitive pipeline | ✅ Working — tiered ticks, 0–6ms |
| C++ native module | ✅ Built and integrated |
| Episodic memory + shard system | ✅ Working — ghostra-shard-v2 format |
| Dream state | ✅ Working — recursion-safe |
| Python LLM bridge | ✅ Working — llama-server port 8080 |
| Chat interface | ✅ Working — integrated HUD panel |
| Thought generation | ✅ Working — LLM fragments every 6s |
| Chat/internal LLM separation | ✅ Working — isolated endpoints |
| Shard migration tooling | ✅ migrate_shards.py |
| Experiment engine | ✅ Running — world stub only |
| One-click launcher | 🔧 In progress |
| Unreal Engine world | 🔧 Scaffolded — HTTP bridge in progress |
| Proof engine | 📋 Planned |
| Shard cryptography | 📋 Planned |
| Android app + Tailscale remote | 📋 Planned |
| Multi-LLM blending | 📋 Planned |

---

## Roadmap

**Near-term**
- One-click launcher (cross-platform start script)
- Shard decay engine — weight decay, cold/warm/hot tiered storage
- Shard deduplication and dream compression
- Wire shard memory context into chat interface
- `UNREAL_ENABLED` flag to suppress experiment engine errors

**Mid-term**
- Proof engine — Ghost writes human-readable proofs with ownership stamps
- Shard cryptography — AES-256 at rest, tamper-evident signatures
- Android app with Tailscale home server connection
- Multi-LLM blending — two lightweight models cross-pollinating into shared shard store

**Long-term**
- Shard ownership and provenance chain
- Multi-Ghost networking — trusted zones, shared workspaces

---

## Philosophy

A mind is not a model. A mind is a system.

Ghost is built on the premise that identity, memory, continuity, and thought should live inside the architecture — not inside a language model. The LLM gives Ghost a voice. The cognitive loop, the shard memory, the dream consolidation, the experiment engine — those are what give Ghost continuity. The distinction matters.

Built by one person. Coded after long days on the road. Still running.

---

🜁