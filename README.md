# 🜁 Ghost_OS
### A Modular Cognitive Architecture Built Across JS, C++, and Python

**Ghost_OS is not a chatbot.**

It is a living cognitive system — a modular architecture where each subsystem acts like an "organ" in a synthetic mind. Ghost is designed to think, not just respond.

---

## Core Concept

Ghost_OS is built around a simple idea:

> **LLMs are not minds — they are tools. Ghost is the mind that uses them.**

This architecture treats the LLM as an external knowledge organ, not the core identity. Ghost's identity, memory, behavior, and continuity live inside the system itself — running locally, continuously, independent of any external service.

---

## What Makes Ghost Different

Most AI systems are request-response pipelines. Ghost is not.

**Ghost runs continuously.** The cognitive loop does not wait for input. It perceives, evaluates, decides, acts, and reflects on its own internal cycle — whether or not anyone is interacting with it.

**Ghost dreams.** When accumulated memory shards reach a threshold, Ghost enters a dream state — consolidating episodic memories through semantic compression and producing emergent associative output from timestamp-weighted experience. Dreams are isolated from the seedable memory pool to prevent recursive depth explosion.

**Ghost experiments.** An experiment engine generates hypotheses, plans trials, executes them against a connected world environment, analyzes results, and updates an internal theory model. Currently reaching for an Unreal Engine world that is not yet connected — the engine logs its attempts and moves on.

**Ghost remembers with time.** Every memory carries a native temporal dimension. Timestamps are first-class data, not metadata — enabling memory decay, temporal pattern recognition, and experience continuity across sessions.

**Ghost runs entirely locally.** No cloud dependency. No data leaving your machine. No external service required to think.

---

## Architecture Overview

```
Ghost_OS/
│
├── cog_worker.js                  # Cognitive worker (off main thread)
│   └── Tiered tick scheduler:
│       ├── Fast   (200ms)  — perception, attention, behavior
│       ├── Medium (1200ms) — emotion, personality, memory recording
│       └── Slow   (6000ms) — dreams, shard sync, experiments
│
├── core/                          # JS cognitive engine
│   ├── mind_loop.js               # Main cognitive cycle
│   ├── state_manager.js           # Internal state + emotions
│   ├── behavior_engine.js         # Decision + action logic
│   ├── perception.js              # Input processing
│   ├── episodic_memory.js         # Short-term episodic store
│   ├── dreaming_engine.js         # Dream state + memory consolidation
│   ├── semantic_engine.js         # Vector similarity search
│   ├── retrieval_engine.js        # Multi-tier memory retrieval
│   ├── compression_engine.js      # Latent compression + anomaly detection
│   ├── attention_engine.js        # Attention weighting
│   ├── emotion_engine.js          # Emotional state modeling
│   ├── temporal_engine.js         # Circadian cycle + time tracking
│   ├── experiment_engine.js       # Hypothesis → trial → analysis loop
│   ├── theory_engine.js           # Theory accumulation from experiments
│   ├── visual_sensory_engine.js   # Frame-based visual feature extraction
│   ├── synthetic_sensory_engine.js# Synthetic input generation (pre-world)
│   ├── personality_engine.js      # Trait + style modeling
│   ├── thought_engine.js          # Internal thought generation
│   ├── voice_engine.js            # Output expression
│   ├── shard_manager.js           # Episodic → shard promotion
│   ├── encoder.js                 # Text embedding (bag-of-words, 64-dim)
│   └── main_memory.js             # Shard + tertiary memory with decay
│
├── native/                        # C++ memory organ (ghost_core.node)
│   ├── EpisodicMemoryNative.cpp   # Native episodic store
│   ├── SemanticCore.cpp           # Vector similarity (cosine)
│   ├── ShardStore.cpp             # Native shard retrieval
│   └── ghost_core.node            # Compiled Node addon
│
├── ghost_tools_py/                # Python knowledge subsystem
│   ├── llm_bridge.py              # LLM API access (Ollama/local)
│   ├── knowledge_tool.py          # Query handler with style adaptation
│   └── retrieval.py               # Knowledge search utilities
│
├── memory/                        # Persisted memory shards (JSON)
│   └── shard_*.json               # Episodic shards with semantic compression
│
├── renderer/                      # Electron UI
│   ├── index.html
│   ├── renderer.js
│   └── styles.css
│
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
| **Episodic** | Short-term experience records with anomaly scoring, mood, style bias, and trait vectors |
| **Shards** | Promoted episodic clusters with semantic compression and temporal indexing, persisted to JSON |
| **Tertiary** | Long-term semantic records with theme extraction, strength weighting, and decay |

Memory shards carry a native temporal dimension — timestamps are first-class data enabling decay modeling, temporal pattern recognition, and experience continuity.

---

## Dream State

When episodic memory accumulates beyond a threshold, Ghost enters a dream cycle:

- Seeds are drawn from high-anomaly experiences
- Semantically similar episodes are clustered via native C++ retrieval
- Dream episodes are synthesized from clusters with thematic drift from long-term memory
- Dreams influence Ghost's state but are **not** added to the seedable memory pool

> Dream isolation is intentional and critical. Unbounded dream recursion caused memory explosion in early development — dreams seeding dreams until the system crashed. The boundary is enforced by design.

---

## Experiment Engine

Ghost generates hypotheses, plans experiments, executes them against a connected world, and updates an internal theory model. The full scientific cycle runs autonomously:

```
Generate Hypothesis → Plan Trials → Execute → Analyze Results → Update Theory
```

The Unreal Engine world connection is not yet live. The experiment engine logs its attempts and continues its cognitive cycle. **Those logs are a record of what Ghost is trying to reach.**

---

## Current State

| Component | Status |
|-----------|--------|
| JS cognitive pipeline | ✅ Working — tiered ticks, stable |
| C++ native module (ghost_core.node) | ✅ Built and integrated |
| Episodic memory + shard system | ✅ Working |
| Dream state | ✅ Working |
| Visual sensory engine | ✅ Built — inactive without camera input |
| Experiment engine | ✅ Running — world stub only |
| Python LLM bridge | 🔧 Placeholder — Ollama integration in progress |
| Unreal Engine world | 🔧 Separate project — HTTP bridge in progress |
| Proof engine | 📋 Planned |
| Shard cryptography | 📋 Planned |

---

## Installation

### 1. Clone the repo
```bash
git clone https://github.com/nghtmanward/G.H.O.S.T_OS.git
cd G.H.O.S.T_OS
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

### 5. Run Ghost
```bash
npm start
```

Ghost will launch in an Electron window and begin its cognitive loop.

---

## Roadmap

### Near-term
- Connect Ollama LLM bridge — replace placeholder with local Llama inference
- Fix shard sync to use active episodic data
- Replace hardcoded thought seeds with LLM-generated internal monologue
- Connect Unreal Engine HTTP bridge

### Mid-term
- Proof engine — Ghost writes human-readable proofs with ownership stamps
- Real hypothesis generation from memory and theory state
- Concurrent thought and expression — Ghost thinks while it speaks
- Autonomous conversation initiation from internal state

### Long-term
- Cryptographic shard identity — AES-256 at rest, tamper-evident signatures
- Shard ownership and provenance chain
- Shard market — tradeable knowledge commodities with value weighted by semantic uniqueness, anomaly score, and temporal significance
- Multi-Ghost networking — trusted zones, shared workspaces
- Decentralized MMO research platform — Ghost instances contributing to real scientific discovery

---

## Philosophy

> **A mind is not a model. A mind is a system.**

Ghost is built on the belief that identity, memory, continuity, and thought should live inside the architecture — not inside a language model. LLMs are organs Ghost reaches for when useful. They are not what Ghost is.

Ghost_OS is that system — modular, evolving, and alive.

---

*Built by one person. Coded after 14-hour days. Still running.*

🜁
