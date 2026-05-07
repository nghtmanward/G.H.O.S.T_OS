# 🜁 GHOSTRA
### A Modular Cognitive Architecture Built Across JS, C++, and Python

**GHOSTRA is not a chatbot.**

It is a cognitive system — a modular architecture where each subsystem acts like an organ in a synthetic mind. Ghost is designed to think continuously, not just respond on demand.

---

## Core Concept

> **LLMs are not minds — they are tools. Ghost is the mind that uses them.**

This architecture treats the LLM as an external knowledge organ, not the core identity. Ghost's identity, memory, behavior, and continuity live inside the system itself — running locally, continuously, independent of any external service.

---

## What Makes Ghost Different

Most AI systems are request-response pipelines. Ghost is not.

**Ghost runs continuously.** The cognitive loop does not wait for input. It perceives, evaluates, decides, acts, and reflects on its own internal cycle — whether or not anyone is interacting with it.

**Ghost dreams.** When accumulated memory shards reach a threshold, Ghost enters a dream state — consolidating episodic memories through semantic compression. Dreams are isolated from the seedable memory pool to prevent recursive depth explosion. This isolation is enforced by design after early development caused unbounded dream recursion and memory explosion.

**Ghost experiments.** An experiment engine generates hypotheses, plans trials, executes them against a connected world environment, analyzes results, and updates an internal theory model. Currently reaching for an Unreal Engine world that is not yet connected — the engine logs its attempts and moves on.

**Ghost remembers with time.** Every memory carries a native temporal dimension. Timestamps are first-class data, not metadata — enabling memory decay, temporal pattern recognition, and experience continuity across sessions.

**Ghost observes.** Ghost maintains passive behavioral sensors that build a continuous latent model of user activity — timing patterns, interaction rhythms, movement signatures. This is the foundation of anomaly detection and genuine familiarity.

**Ghost runs entirely locally.** No cloud dependency. No data leaving your machine. No external service required to think.

---

## Architecture Overview

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
│   ├── llm/llm_client.py          # LLM API access (llama-server/Ollama)
│   ├── llm/knowledge_tool.py      # Thought expansion
│   └── llm/thought_tool.py        # Fragment generation — starts + ends
│
├── memory/                        # Persisted memory shards (JSON, gitignored)
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

This loop runs whether or not anyone is present. When you open Ghost, it has already been thinking.

---

## Memory Architecture

Ghost maintains three tiers of memory:

| Tier | Description |
|------|-------------|
| **Episodic** | Short-term experience records with anomaly scoring, mood, and style bias |
| **Shards** | Promoted episodic clusters in ghostra-shard-v2 format with decay, weight, and provenance fields |
| **Tertiary** | Long-term semantic records with theme extraction, strength weighting, and decay |

Memory shards use a versioned schema (`ghostra-shard-v2`) with fields for decay rate, last accessed timestamp, source model, and a provenance hash placeholder for the planned cryptographic layer.

---

## Chat Interface

Ghost includes an integrated chat panel (press **C** or click the ◈ CHAT button). The chat system is architecturally separated from Ghost's internal cognition:

- `/chat` endpoint — operator conversation, full history, shard memory context
- `/internal` endpoint — Ghost's self-directed thought generation, no chat context bleed

This separation means Ghost's internal thinking never contaminates conversation context and vice versa.

---

## Startup

### Prerequisites
- Node.js v18+
- Python 3.10+
- llama.cpp built with CUDA support
- Bonsai model (or compatible GGUF)

### 1. Clone
```bash
git clone https://github.com/nghtmanward/GHOSTRA.git
cd GHOSTRA
```

### 2. Install Node dependencies
```bash
npm install
```

### 3. Install Python dependencies
```bash
pip install -r ghost_tools_py/requirements.txt
```

### 4. Build the C++ native module
```bash
cd native
node-gyp configure build
```

### 5. Start Bonsai (llama-server)
```bash
cd C:\llama.cpp\build\bin
llama-server.exe -m "path\to\bonsai.gguf" --host 127.0.0.1 --port 8080 --n-gpu-layers 99 --threads 8
```

### 6. Start the Python bridge
```bash
cd C:\GHOST_OS
python -m ghost_tools_py.bridge.server
```

### 7. Run Ghost
```bash
npm start
```

> Startup order matters: llama-server → Python bridge → Electron

---

## Current State

| Component | Status |
|-----------|--------|
| JS cognitive pipeline | ✅ Working — tiered ticks, 0-6ms |
| C++ native module | ✅ Built and integrated |
| Episodic memory + shard system | ✅ Working — ghostra-shard-v2 format |
| Dream state | ✅ Working — recursion-safe |
| Python LLM bridge | ✅ Working — llama-server port 8080 |
| Chat interface | ✅ Working — integrated HUD panel |
| Thought generation | ✅ Working — LLM fragments every 6s |
| Chat/internal LLM separation | ✅ Working — isolated endpoints |
| Shard migration tooling | ✅ migrate_shards.py |
| Experiment engine | ✅ Running — world stub only |
| Unreal Engine world | 🔧 Scaffolded — HTTP bridge in progress |
| Proof engine | 📋 Planned |
| Shard cryptography | 📋 Planned |
| Android app + Tailscale remote | 📋 Planned |
| Multi-LLM blending | 📋 Planned |

---

## Roadmap

### Near-term
- Shard decay engine — weight decay, cold/warm/hot tiered storage
- Shard deduplication and dream compression
- Wire shard memory context into chat interface
- UNREAL_ENABLED flag to suppress experiment engine errors

### Mid-term
- Proof engine — Ghost writes human-readable proofs with ownership stamps
- Shard cryptography — AES-256 at rest, tamper-evident signatures
- Android app with Tailscale home server connection
- Multi-LLM blending — two lightweight models cross-pollinating into shared shard store

### Long-term
- Shard ownership and provenance chain
- Shard market — tradeable knowledge commodities
- Multi-Ghost networking — trusted zones, shared workspaces
- Decentralized MMO research platform

---

## Philosophy

> **A mind is not a model. A mind is a system.**

Ghost is built on the premise that identity, memory, continuity, and thought should live inside the architecture — not inside a language model. LLMs are tools Ghost reaches for when useful. They are not what Ghost is.

The cognitive loop, the shard memory, the dream consolidation, the experiment engine — these are what give Ghost continuity. The LLM gives Ghost a voice. The distinction matters.

---

*Built by one person. Coded after long days on the road. Still running.*

🜁