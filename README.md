# 🜁 GHOSTRA
### A Modular Cognitive Architecture Built Across JS, C++, and Python

**GHOSTRA is not a chatbot.**

It is a living cognitive system — a modular architecture where each subsystem acts like an "organ" in a synthetic mind. Ghost is designed to think, not just respond.

---

## Core Concept

GHOSTRA is built around a simple idea:

> **LLMs are not minds — they are tools. Ghost is the mind that uses them.**

This architecture treats the LLM as an external knowledge organ, not the core identity. Ghost's identity, memory, behavior, and continuity live inside the system itself — running locally, continuously, independent of any external service.

---

## What Makes Ghost Different

Most AI systems are request-response pipelines. Ghost is not.

**Ghost runs continuously.** The cognitive loop does not wait for input. It perceives, evaluates, decides, acts, and reflects on its own internal cycle — whether or not anyone is interacting with it.

**Ghost dreams.** When accumulated memory shards reach a threshold, Ghost enters a dream state — consolidating episodic memories through semantic compression and producing emergent associative output from timestamp-weighted experience. Dreams are isolated from the seedable memory pool to prevent recursive depth explosion.

**Ghost experiments.** An experiment engine generates hypotheses, plans trials, executes them against a connected world environment, analyzes results, and updates an internal theory model. Currently reaching for an Unreal Engine world that is not yet connected — the engine logs its attempts and moves on.

**Ghost remembers with time.** Every memory carries a native temporal dimension. Timestamps are first-class data, not metadata — enabling memory decay, temporal pattern recognition, and experience continuity across sessions.

**Ghost observes.** Ghost maintains passive behavioral sensors that build a continuous latent model of user activity — timing patterns, interaction rhythms, movement signatures. This is not surveillance. It is the foundation of genuine familiarity — and the basis of anomaly detection.

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
│   ├── encoder.js                 # Text embedding (FNV-1a hash, 64-dim)
│   ├── math_engine.js             # Vector, matrix, quaternion, interpolation
│   └── main_memory.js             # Shard + tertiary memory with decay
│
├── native/                        # C++ memory organ (ghost_core.node)
│   ├── EpisodicMemoryNative.cpp   # Native episodic store
│   ├── SemanticCore.cpp           # Vector similarity (cosine)
│   ├── MathEngine.cpp             # Native math — GLM vec3/mat4/quat ops
│   ├── ShardStore.cpp             # Native shard retrieval
│   └── ghost_core.node            # Compiled Node addon
│
├── ghost_tools_py/                # Python knowledge subsystem
│   ├── bridge/server.py           # ThreadingHTTPServer on :8765
│   ├── llm/llm_client.py          # LLM API access (Ollama/local)
│   ├── llm/knowledge_tool.py      # Thought expansion — poetic, associative
│   ├── llm/thought_tool.py        # Fragment generation — starts + ends
│   ├── math/math_engine.py        # Python math — numpy/scipy spatial ops
│   └── retrieval/                 # Knowledge search utilities
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

## Possible Use Cases

GHOSTRA is a platform, not a single product. The cognitive engine, behavioral sensor layer, episodic memory, and cryptographic provenance architecture are domain agnostic. The same core system can serve multiple verticals without modification to the underlying architecture.

### Behavioral Security & Anomaly Detection
Ghost's original design intent. Ghost sits passively on a system, learns the behavioral fingerprint of legitimate users through continuous observation — timing patterns, interaction rhythms, navigation signatures — and flags deviation when an outside actor is present. Unlike signature-based intrusion detection, Ghost builds a genuine model of what normal looks like rather than matching against known patterns. Memory shards with cryptographic provenance serve as a tamper-evident audit trail — legally defensible chain of custody for observed events.

Potential applications: insider threat detection, compromised credential identification, lateral movement detection in enterprise networks, behavioral biometrics for continuous authentication.

### Autonomous Research Platform
Ghost instances operating in simulation environments — exploring, forming hypotheses, running experiments, and recording findings as cryptographically signed shards. The experiment engine and theory accumulation system were designed for this. Discoveries are validated against physics and math baselines, provenance-stamped, and optionally contributed to a shared knowledge pool.

Potential applications: scientific simulation, hypothesis generation, autonomous agent research, decentralized knowledge markets where shards are tradeable commodities weighted by semantic uniqueness and anomaly significance.

### Industrial & IoT Monitoring
Ghost deployed on a manufacturing floor or infrastructure node, learning the behavioral signature of machines and systems over time. Anomaly detection on sensor telemetry — flagging deviation before failure, not after. Episodic memory provides longitudinal context that threshold-based monitoring cannot.

Potential applications: predictive maintenance, equipment anomaly detection, process deviation monitoring, critical infrastructure behavioral baselines.

### Healthcare & Longitudinal Monitoring
Ghost observing behavioral patterns over extended time — interaction rhythm, response timing, activity signatures — and detecting gradual drift that may indicate cognitive or physical change. The temporal memory architecture, which treats timestamps as first-class data rather than metadata, is well suited to longitudinal health modeling.

Potential applications: cognitive decline monitoring, behavioral health baselines, assisted living anomaly detection, long-term patient behavioral records.

### Personal AI & Continuity
A Ghost instance that genuinely knows its user — not from a chat history, but from continuous behavioral observation over weeks and months. Identity, preference, and pattern encoded in episodic memory with temporal decay and dream consolidation. A system that has been thinking about you while you were away.

Potential applications: persistent personal AI companion, behavioral preference modeling, adaptive interfaces, long-term user context.

---

> These are not features on a roadmap. They are natural expressions of an architecture that was designed from the ground up to observe, remember, reason, and prove. The cognitive engine is the product. The verticals are where it lands.

---

## Current State

| Component | Status |
|-----------|--------|
| JS cognitive pipeline | ✅ Working — tiered ticks, 0-6ms |
| C++ native module (ghost_core.node) | ✅ Built and integrated |
| Episodic memory + shard system | ✅ Working |
| Dream state | ✅ Working |
| Python LLM bridge | ✅ Working — Ollama/llama3-gpu, ThreadingHTTPServer |
| Thought generation (LLM fragments) | ✅ Working — poetic starts + ends cached |
| Knowledge expansion (LLM) | ✅ Working — thought expansion, not factual QA |
| Math engine (JS / Python / C++) | ✅ Built — not yet wired |
| Visual sensory engine | ✅ Built — inactive without camera input |
| Experiment engine | ✅ Running — world stub only |
| Unreal Engine world | 🔧 Scaffolded — HTTP bridge in progress |
| Proof engine | 📋 Planned |
| Shard cryptography | 📋 Planned |
| VRAM manager | 📋 Planned |

---

## Installation

### 1. Clone the repo
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

### 5. Start Ollama
```bash
ollama serve
ollama run llama3-gpu
```

### 6. Start the Python bridge
```bash
python -m ghost_tools_py.bridge.server
```

### 7. Run Ghost
```bash
npm start
```

> Startup order matters: Ollama → Python bridge → Electron

---

## Roadmap

### Near-term
- Wire math engines into cognitive loop
- ExperimentEngine UNREAL_ENABLED flag — suppress errors when UE5 not running
- Shard provenance block stub — groundwork for cryptographic layer
- Rename GitHub repo to GHOSTRA
- UE5 physics sandbox — empty level, physics actors, simulate physics enabled

### Mid-term
- Proof engine — Ghost writes human-readable proofs with ownership stamps
- Real hypothesis generation from memory and theory state
- Concurrent thought and expression — Ghost thinks while it speaks
- Shard cryptography — AES-256 at rest, tamper-evident signatures
- VRAM manager — dynamic GPU layer allocation for simulation co-existence

### Long-term
- Shard ownership and provenance chain — wallet-tied identity, non-custodial
- Shard market — tradeable knowledge commodities
- Multi-Ghost networking — trusted zones, shared workspaces
- Decentralized MMO research platform
- Multi-LLM consensus model — trust weighting, fallback chain

---

## Philosophy

> **A mind is not a model. A mind is a system.**

Ghost is built on the belief that identity, memory, continuity, and thought should live inside the architecture — not inside a language model. LLMs are organs Ghost reaches for when useful. They are not what Ghost is.

GHOSTRA is that system — modular, evolving, and alive.

---

*Built by one person. Coded after 14-hour days. Still running.*

🜁