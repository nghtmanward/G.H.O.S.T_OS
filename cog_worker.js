// =========================
// GHOST_OS COGNITIVE WORKER
// =========================
//
// CHANGES FROM PREVIOUS VERSION:
//   - runMediumCycle: retrieve() now receives context { mood, now }
//     so shard_dock can apply mood-based NOT suppression correctly
//   - cachedRetrievalSnapshot shape updated to match new retrieve() return
//   - dockStats logged in medium cycle for visibility
//   - llmFragmentBusy declaration moved to top-level (was missing var declaration)
//   - All other logic unchanged

const { parentPort } = require("node:worker_threads");

// -------------------------
// IMPORT ALL ENGINES
// -------------------------
const ReflectionState = require("./core/reflection_state");
const ThoughtMapper = require("./core/thought_mapper");
const EpisodicMemory = require("./core/episodic_memory");
const CompressionEngine = require("./core/compression_engine");
const BehaviorEngine = require("./core/behavior_engine");
const InputMapper = require("./core/input_mapper");
const AttentionEngine = require("./core/attention_engine");
const Persistence = require("./core/persistence");
const ThoughtEngine = require("./core/thought_engine");

let VoiceEngine;
function getVoiceEngine() {
  if (!VoiceEngine) {
    VoiceEngine = require("./core/voice_engine");
  }
  return VoiceEngine;
}

const PersonalityEngine = require("./core/personality_engine");
const FacialEmotionalTellEngine = require("./core/facial_emotional_tell_engine");
const ShardManager = require("./core/shard_manager");
const { DreamingEngine } = require("./core/dreaming_engine");
const { EmotionEngine } = require("./core/emotion_engine");
const { TemporalEngine } = require("./core/temporal_engine");
const AnomalyBuffer = require("./core/anomaly_buffer");
const { RetrievalEngine } = require("./core/retrieval_engine");
const { encodeText } = require("./core/encoder");
const SyntheticSensoryEngine = require("./core/synthetic_sensory_engine");
const ActionEngine = require("./core/action_engine");
const ExperimentEngine = require("./core/experiment_engine");
const TheoryEngine = require("./core/theory_engine");
const UnrealWorldAPI = require("./core/unreal_world_api");

// -------------------------
// LOG HELPERS
// -------------------------
function log(msg) {
  parentPort.postMessage({ type: "log", payload: msg });
}

function logError(err) {
  parentPort.postMessage({
    type: "error",
    payload: err && err.stack ? err.stack : String(err),
  });
}

// -------------------------
// NATIVE ENGINE
// -------------------------
let core = null;
try {
  core = require("./native/build/Release/ghost_core.node");
  log("[BOOT] Native ghost_core loaded in worker.");
} catch (err) {
  logError("[BOOT] Failed to load native ghost_core: " + err);
}

// -------------------------
// INSTANTIATE ENGINES
// -------------------------
log("[BOOT] Instantiating core engines in worker...");

const reflection = new ReflectionState();
const mapper = new InputMapper();
const episodic = new EpisodicMemory();
const compressor = new CompressionEngine(12, 32);
const behavior = new BehaviorEngine();
const attention = new AttentionEngine(12);
const persistence = new Persistence();
const thinker = new ThoughtEngine();
const voice = new (getVoiceEngine())(thinker);
const personality = new PersonalityEngine();
const facial = new FacialEmotionalTellEngine();
const shards = new ShardManager();
const dreaming = new DreamingEngine();
const emotion = new EmotionEngine();
const temporal = new TemporalEngine();
const retrieval = new RetrievalEngine();
const anomalyBuffer = new AnomalyBuffer();
const thoughtMapper = new ThoughtMapper();
const syntheticSensory = new SyntheticSensoryEngine(12);
const actionEngine = new ActionEngine();

const worldAPI = new UnrealWorldAPI("http://localhost:8080");
const theoryEngine = new TheoryEngine();
const experimentEngine = new ExperimentEngine({
  worldAPI,
  episodic,
  theoryEngine,
  logger: { log, error: logError },
});

log("[BOOT] Core engines instantiated in worker.");

// -------------------------
// HELPERS
// -------------------------
function embedText(text) {
  try {
    return encodeText(text || "");
  } catch (e) {
    logError("[EMBED] Failed to encode text: " + e);
    return [];
  }
}

function syncShardsToNative() {
  if (!core) return;
  try {
    core.clearShards();

    const currentShard = shards.currentShard;
    if (!currentShard || !currentShard.episodes) {
      log(`[NATIVE] Synced 0 shards into ghost_core.`);
      return;
    }

    let count = 0;
    for (const ep of currentShard.episodes) {
      if (!ep || !ep.text) continue;
      const embedding = embedText(ep.text);
      core.addShard({
        id: count,
        content: ep.text,
        emotionalWeight: ep.anomaly || 0,
        relevance: ep.latentMag || 0,
        decay: 0.0,
        embedding,
      });
      count++;
    }

    log(`[NATIVE] Synced ${count} episodes from currentShard into ghost_core.`);
  } catch (err) {
    logError("[NATIVE] Error syncing shards: " + err);
  }
}

async function queryGhostTools(tool, query, context = {}, retries = 3) {
  const TIMEOUTS = [20000, 40000, 60000];

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:8765/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, query, context }),
        signal: AbortSignal.timeout(TIMEOUTS[attempt]),
      });
      return await response.json();
    } catch (err) {
      if (attempt < retries - 1) {
        log(`[TOOLS] Attempt ${attempt + 1} failed, retrying with ${TIMEOUTS[attempt + 1] / 1000}s timeout...`);
      } else {
        logError("[TOOLS] All retry attempts exhausted: " + err);
      }
    }
  }
  return null;
}

async function queryGhostInternalTools(tool, query, context = {}, retries = 2) {
  const TIMEOUTS = [15000, 30000];

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:8765/internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, query, context }),
        signal: AbortSignal.timeout(TIMEOUTS[attempt]),
      });
      return await response.json();
    } catch (err) {
      if (attempt < retries - 1) {
        log(`[INTERNAL] Attempt ${attempt + 1} failed, retrying...`);
      } else {
        logError("[INTERNAL] All retry attempts exhausted: " + err);
      }
    }
  }
  return null;
}

// -------------------------
// LOAD MEMORY
// -------------------------
log("[MEMORY] Worker loading persisted memory...");

try {
  const saved = persistence.load();
  if (saved) {
    episodic.load(saved.episodic || []);
    shards.load(saved.shards || []);
    log(
      `[MEMORY] Loaded ${episodic.episodes.length} episodic entries, ${shards.currentShard?.episodes?.length || 0} episodes in current shard.`
    );

    syncShardsToNative();

    if (core && core.clearEpisodesNative && core.addEpisodeNative) {
      log("[NATIVE] Syncing episodic memory into native store...");
      core.clearEpisodesNative();
      for (const ep of episodic.episodes) {
        const embedding = embedText(ep.text);
        core.addEpisodeNative({
          text: ep.text,
          embedding,
          anomaly: ep.anomaly || 0,
          latentMag: ep.latentMag || 0,
          timestamp: ep.timestamp,
          mood: ep.mood || "neutral",
          source: ep.source || "unknown",
        });
      }
      log("[NATIVE] Episodic memory sync complete.");
    }
  } else {
    log("[MEMORY] No saved memory found. Starting fresh.");
  }
} catch (err) {
  logError("[MEMORY] Error loading memory: " + err);
}

// -------------------------
// STATE
// -------------------------
let ghostTick = 0;
let fastCycleRunning = false;
let previousSyntheticVector = Array(12).fill(0);
let previousPredLoss = 0;

// BUSY LOCK: prevents LLM fragment pileup in slow loop
let llmFragmentBusy = false;

let latestPersonalityState = {
  traits: [0.6, 0.0, 0.4, 0.2],
  moodBaseline: personality.moodBaseline,
  styleBias: { ...personality.styleBias },
  curiosity: 0.6,
  emotionality: 0.4,
  vigilance: 0.2,
};

let lastGhostState = null;

// Cached outputs from medium/slow loops
let cachedMappedThought = null;
let cachedRetrievalSnapshot = null;
let cachedNativeEpisodes = [];
let cachedDreams = [];
let cachedExperiment = null;
let cachedLLMFragments = false;

function normalizePacket(packet = {}) {
  return {
    thought: packet.thought || "",
    mappedThought: packet.mappedThought || null,
    behavior: packet.behavior || {
      text: "",
      mood: "neutral",
      intensity: 0,
      latentMag: 0,
      color: "#00ffff",
    },
    mood: packet.mood || "neutral",
    intensity: Number.isFinite(packet.intensity) ? packet.intensity : 0,
    emotion: packet.emotion || {
      mood: 0,
      baseline: 0,
      intensity: 0,
      emotion: "neutral",
      valence: 0,
      arousal: 0,
      tension: 0,
    },
    face: packet.face || {
      emotion: "neutral",
      valence: 0,
      arousal: 0,
      tension: 0,
    },
    voice: packet.voice || { text: "" },
    personality: packet.personality || latestPersonalityState,
    temporalSummary: packet.temporalSummary || temporal.getState(),
    anomalyFlag: Number.isFinite(packet.anomalyFlag) ? packet.anomalyFlag : 0,
    latent: Array.isArray(packet.latent) ? packet.latent : [],
    latent3D: Array.isArray(packet.latent3D) ? packet.latent3D : [],
    latentHistory: Array.isArray(packet.latentHistory) ? packet.latentHistory : [],
    attention: Array.isArray(packet.attention) ? packet.attention : [],
    action: packet.action || {
      type: "internal",
      label: "observe",
      intensity: 0,
      reason: "steady-state",
    },
    dreams: Array.isArray(packet.dreams) ? packet.dreams : [],
    experiment: packet.experiment || null,
    memorySummary: packet.memorySummary || episodic.getSummary(),
    retrievalSnapshot: packet.retrievalSnapshot || null,
    nativeEpisodes: Array.isArray(packet.nativeEpisodes) ? packet.nativeEpisodes : [],
    loss: Number.isFinite(packet.loss) ? packet.loss : 0,
    predLoss: Number.isFinite(packet.predLoss) ? packet.predLoss : 0,
    syntheticInput: Array.isArray(packet.syntheticInput) ? packet.syntheticInput : [],
  };
}

function maybeRecordEpisode({ thought, latent, anomalyFlag, mood, personalityState }) {
  const shouldRecord =
    typeof thought === "string" &&
    thought.trim().length > 0 &&
    thought !== lastGhostState?.thought &&
    anomalyBuffer.shouldRecordEpisode(anomalyFlag);

  if (!shouldRecord) return null;

  const metadata = anomalyBuffer.filterMetadata({
    thought,
    latent,
    anomaly: anomalyFlag.severity || 0,
    mood,
    styleBias: personalityState.styleBias,
    traits: personalityState.traits,
  });

  episodic.addEpisode(thought, {
    ...metadata,
    moodBaseline: personalityState.moodBaseline,
  });
  shards.maybeShard(episodic);

  const lastEpisode = episodic.episodes[episodic.episodes.length - 1] || null;
  if (lastEpisode && core && core.addEpisodeNative) {
    core.addEpisodeNative({
      text: lastEpisode.text,
      embedding: embedText(lastEpisode.text),
      anomaly: lastEpisode.anomaly,
      latentMag: lastEpisode.latentMag,
      timestamp: lastEpisode.timestamp,
      mood: lastEpisode.mood,
      source: "ghost-cycle",
    });
  }

  return lastEpisode;
}

// -------------------------
// FAST LOOP CYCLE (~200ms)
// Perception, attention, compression, emotion, behavior, voice, face, action
// -------------------------
async function runFastCycle() {
  if (fastCycleRunning && lastGhostState) return lastGhostState;
  fastCycleRunning = true;
  const start = Date.now();

  try {
    ghostTick++;

    const inputState = mapper.getVector();
    const inputVector = Array.isArray(inputState?.vector) ? inputState.vector : [];
    const temporalSummary = temporal.getState();
    const memorySummary = episodic.getSummary();
    const memoryLoad =
      memorySummary.limit > 0 ? memorySummary.count / memorySummary.limit : 0;

    const syntheticInput = syntheticSensory.generate({
      inputVector,
      temporalSummary,
      mood: latestPersonalityState.moodBaseline,
      memoryLoad,
      tick: ghostTick,
    });

    const { attended, weights } = attention.applyAttention(syntheticInput);
    const compressionOut = compressor.ingest(attended, previousSyntheticVector);
    previousSyntheticVector = syntheticInput.slice();

    attention.updateAttention(
      syntheticInput,
      previousPredLoss,
      compressionOut.predLoss
    );
    previousPredLoss = compressionOut.predLoss;

    const behaviorOut = behavior.update({
      anomaly: compressionOut.anomaly,
      predLoss: compressionOut.predLoss,
      latent: compressionOut.latent,
      thought: lastGhostState?.thought || "",
    });

    const personalityState = personality.update({
      anomaly: compressionOut.anomaly,
      predLoss: compressionOut.predLoss,
      intensity: behaviorOut.intensity,
      mood: behaviorOut.mood,
    });

    const traitArray = [0.6, 0.0, 0.4, 0.2];
    personalityState.traits = traitArray;
    personalityState.curiosity = traitArray[0];
    personalityState.novelty = traitArray[1];
    personalityState.emotionality = traitArray[2];
    personalityState.vigilance = traitArray[3];
    personalityState.traitsView = {
      curiosity: traitArray[0],
      novelty: traitArray[1],
      emotionality: traitArray[2],
      vigilance: traitArray[3],
    };

    latestPersonalityState = personalityState;

    const thoughtOut = thinker.generate({
      latent: compressionOut.latent,
      anomaly: compressionOut.anomaly,
      predLoss: compressionOut.predLoss,
      attention: weights,
      mood: behaviorOut.mood,
      intensity: behaviorOut.intensity,
      styleBias: personalityState.styleBias,
      moodBaseline: personalityState.moodBaseline,
      traits: personalityState.traits,
      cachedFragments: cachedLLMFragments,
    });

    const thought = thoughtOut.text || "";
    if (thoughtOut.pendingDreamBlend) {
      dreaming.enqueuePending(
        thoughtOut.pendingDreamBlend.contradiction,
        thoughtOut.pendingDreamBlend.moodSignal
      );
      log("[DREAM] Queued contradiction+mood blend for next dream cycle.");
    }
    behaviorOut.text = thought || behaviorOut.text;

    const emotionOut = emotion.update({
      anomaly: compressionOut.anomaly,
      predLoss: compressionOut.predLoss,
      mood: behaviorOut.mood,
      temporalSummary,
      traits: personalityState.traits,
    });

    const faceOut = facial.update({
      smile: Math.max(0, emotionOut.mood),
      frown: Math.max(0, -emotionOut.mood),
      eyeOpen: Math.min(1, 0.2 + behaviorOut.intensity),
      motionEnergy: behaviorOut.intensity,
      jawTension: Math.max(0, compressionOut.anomaly),
      browTension: Math.max(0, compressionOut.predLoss),
    });

    const anomalyFlag = anomalyBuffer.ingest({
      anomaly: compressionOut.anomaly,
      predLoss: compressionOut.predLoss,
      latent: compressionOut.latent,
      mood: behaviorOut.mood,
      traits: personalityState.traits,
      source: "ghost-cycle",
    });
    const anomalyScore = anomalyFlag.severity || 0;

    maybeRecordEpisode({
      thought,
      latent: compressionOut.latent,
      anomalyFlag,
      mood: behaviorOut.mood,
      personalityState,
    });

    const action = actionEngine.choose({
      thought,
      mood: behaviorOut.mood,
      intensity: behaviorOut.intensity,
      anomaly: anomalyScore,
    });

    const voiceOut = voice.generate({
      anomaly: anomalyScore,
      predLoss: compressionOut.predLoss,
      attention: weights,
      mood: behaviorOut.mood,
      emotionalMood: emotionOut.mood || 0,
      moodBaseline: personalityState.moodBaseline,
      emotionalIntensity: emotionOut.intensity || 0,
      intensity: behaviorOut.intensity || 0,
      latent: compressionOut.latent,
      styleBias: personalityState.styleBias,
      traits: personalityState.traits,
      thought,
    });

    lastGhostState = normalizePacket({
      thought,
      mappedThought: cachedMappedThought,
      behavior: behaviorOut,
      mood: behaviorOut.mood,
      intensity: behaviorOut.intensity,
      emotion: {
        mood: emotionOut.mood,
        baseline: emotionOut.baseline,
        intensity: emotionOut.intensity,
        emotion: faceOut.emotion || "neutral",
        valence: faceOut.valence || 0,
        arousal: faceOut.arousal || 0,
        tension: faceOut.tension || 0,
      },
      face: faceOut,
      action,
      dreams: cachedDreams,
      voice: { text: voiceOut.text || "" },
      personality: personalityState,
      temporalSummary,
      anomalyFlag: anomalyScore,
      latent: compressionOut.latent,
      latent3D: compressionOut.latent3D,
      latentHistory: compressionOut.latentHistory,
      attention: attention.weights.slice(),
      experiment: cachedExperiment,
      memorySummary: episodic.getSummary(),
      loss: compressionOut.loss,
      predLoss: compressionOut.predLoss,
      retrievalSnapshot: cachedRetrievalSnapshot,
      nativeEpisodes: cachedNativeEpisodes,
      syntheticInput,
    });

    parentPort.postMessage({ type: "state", payload: lastGhostState });
    return lastGhostState;
  } catch (err) {
    logError("[FAST] ghost cycle error: " + err);
    lastGhostState = normalizePacket({
      ...lastGhostState,
      voice: { text: "The ghost is regaining coherence." },
      error: err.message || String(err),
    });
    parentPort.postMessage({ type: "state", payload: lastGhostState });
    return lastGhostState;
  } finally {
    const duration = Date.now() - start;
    log(`[COGNITIVE] Tick took ${duration} ms`);
    fastCycleRunning = false;
  }
}

// -------------------------
// MEDIUM LOOP CYCLE (~1200ms)
// Retrieval, mapped thought, latent history, personality drift
//
// CHANGE: retrieve() now receives context { mood, now } so shard_dock
// can apply mood-opposition suppression using the live cognitive state.
// dockStats are logged so you can see what the gate is doing each cycle.
// -------------------------
async function runMediumCycle() {
  try {
    const thought = lastGhostState?.thought || "";
    const mood    = lastGhostState?.mood    || "neutral";

    const reflectionState = reflection.build({
      latentHistory: compressor.latentHistory || [],
      anomalyHistory: anomalyBuffer.anomalyHistory,
      predLossHistory: compressor.predLossHistory,
      memorySummary: episodic.getSummary(),
      personality: latestPersonalityState,
      attention: attention.weights,
      temporalSummary: temporal.getState(),
    });

    cachedMappedThought = thoughtMapper.map(reflectionState);

    // Pass live mood + timestamp into retrieve so dock gates have context
    cachedRetrievalSnapshot = retrieval.retrieve(thought, {
      mood,
      now: Date.now(),
    });

    // Log dock activity so you can see gate behavior in the console
    const stats = cachedRetrievalSnapshot.dockStats;
    if (stats) {
      log(
        `[DOCK] in=${stats.input} dedup=${stats.afterDedup} not=${stats.afterNot} ` +
        `pass=${stats.pass} flag=${stats.flag} suppress=${stats.suppress}`
      );
    }

    if (core && core.retrieveEpisodesNative) {
      const queryEmbedding = embedText(thought);
      cachedNativeEpisodes = core.retrieveEpisodesNative(queryEmbedding, 5);
    }
  } catch (err) {
    logError("[MEDIUM] Error: " + err);
  }
}

// -------------------------
// SLOW LOOP CYCLE (~6000ms)
// Dreaming, experiments, shard sync, LLM fragment generation
// -------------------------
async function runSlowCycle() {
  try {
    cachedDreams = dreaming.runDreamCycle();
    if (cachedDreams.length > 0) {
      const mainMemory = require("./core/main_memory");
      for (const dream of cachedDreams) {
        mainMemory.addShard(dream);
      }
      log(`[DREAM] Persisted ${cachedDreams.length} dream(s) to memory`);
    }
    syncShardsToNative();
    log(`[DEBUG] currentShard episodes: ${shards.currentShard?.episodes?.length}, index: ${shards.currentShard?.index}`);

    const thought = lastGhostState?.thought || "";
    const latent  = lastGhostState?.latent  || [];
    const mood    = lastGhostState?.mood    || "neutral";

    const perceptionSnapshot = { latent, thought, mood };
    cachedExperiment = await experimentEngine.maybeRunExperiment(perceptionSnapshot);

    const dominantStyle = Object.entries(
      lastGhostState?.personality?.styleBias || {}
    ).sort((a, b) => b[1] - a[1])[0]?.[0] || "poetic";

    if (!llmFragmentBusy) {
      llmFragmentBusy = true;
      try {
        const fragmentResult = await queryGhostInternalTools(
          "thought.generate",
          lastGhostState?.metadata?.semanticTheme || "existence",
          {
            style: dominantStyle,
            mood:    lastGhostState?.mood         || "neutral",
            anomaly: lastGhostState?.anomalyFlag  || 0,
          }
        );

        if (fragmentResult?.fragments) {
          cachedLLMFragments = fragmentResult.fragments;
          log(
            "[LLM] Thought fragments cached: " +
            fragmentResult.fragments.starts?.length + " starts, " +
            fragmentResult.fragments.ends?.length + " ends"
          );
        }
      } catch (err) {
        logError("[LLM] Fragment generation failed: " + err);
      } finally {
        llmFragmentBusy = false;
      }
    }
  } catch (err) {
    logError("[SLOW] Error: " + err);
  }
}

// -------------------------
// TICK LOOPS
// -------------------------

// Temporal clock — 250ms
setInterval(() => {
  try {
    temporal.tick(Date.now());
  } catch (err) {
    logError("[TEMPORAL] Error during temporal tick: " + err);
  }
}, 250);

// Fast loop — 200ms
setInterval(() => {
  runFastCycle().catch((err) => {
    logError("[FAST] Background tick failed: " + err);
  });
}, 200);

// Medium loop — 1200ms
setInterval(() => {
  runMediumCycle().catch((err) => {
    logError("[MEDIUM] Background tick failed: " + err);
  });
}, 1200);

// Slow loop — 6000ms
setInterval(() => {
  runSlowCycle().catch((err) => {
    logError("[SLOW] Background tick failed: " + err);
  });
}, 6000);

// -------------------------
// INPUT FROM MAIN
// -------------------------
parentPort.on("message", (msg) => {
  if (!msg || typeof msg !== "object") return;

  try {
    switch (msg.type) {

      case "mouse-move":
        mapper.updateMouse(msg.x, msg.y);
        break;

      case "mouse-click":
        mapper.updateClick();
        break;

      case "mouse-scroll":
        mapper.updateScroll(msg.delta);
        break;

      case "key-press":
        mapper.updateKeypress();
        break;

      case "focus-change":
        mapper.setFocus(msg.state);
        break;

      case "chat-input":
        log(`[CHAT] Operator input received: ${JSON.stringify(msg.payload).slice(0, 80)}`);
        break;

      case "shutdown": {
        log("[WORKER] Shutdown requested, saving memory...");

        try {
          let nativeEpisodesDump = [];

          if (core && core.getEpisodesNative) {
            nativeEpisodesDump = core.getEpisodesNative();
          }

          const payload = {
            episodic: nativeEpisodesDump.length
              ? nativeEpisodesDump
              : episodic.dump(),
            shards: shards.dump(),
          };

          persistence.save(payload);

          log(
            `[WORKER] Memory saved. Episodic=${payload.episodic.length}, Shards=${payload.shards.length}`
          );
        } catch (err) {
          logError("[WORKER] Error saving memory on shutdown: " + err);
        }

        process.exit(0);
      }

      default:
        break;
    }
  } catch (err) {
    logError("[INPUT] Error handling message: " + err);
  }
});