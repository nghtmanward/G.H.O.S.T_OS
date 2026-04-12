// =========================
// GHOST_OS MAIN PROCESS
// =========================

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// Cognitive engine tick rate (100ms = 10Hz)
const COGNITIVE_TICK_MS = 250; 

// 🔥 Log renderer crashes explicitly
app.on("web-contents-created", (event, contents) => {
  contents.on("render-process-gone", (e, details) => {
    console.error("🔥 Renderer crashed:", details);
  });
});

// -------------------------
// GLOBAL CRASH HANDLERS
// -------------------------
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT ERROR IN MAIN PROCESS:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED PROMISE REJECTION:", reason);
});

// -------------------------
// STARTUP LOGGING
// -------------------------
console.log("======================================");
console.log(" Ghost_OS main.js starting...");
console.log(" MAIN FILE PATH:", __filename);
console.log(" WORKING DIR   :", process.cwd());
console.log("======================================");

// -------------------------
// IMPORT CORE ENGINES
// -------------------------
console.log("[BOOT] Importing core modules...");

const ReflectionState = require("./core/reflection_state");
const ThoughtMapper = require("./core/thought_mapper");
const EpisodicMemory = require("./core/episodic_memory");
const CompressionEngine = require("./core/compression_engine");
const BehaviorEngine = require("./core/behavior_engine");
const InputMapper = require("./core/input_mapper");
const AttentionEngine = require("./core/attention_engine");
const Persistence = require("./core/persistence");
const ThoughtEngine = require("./core/thought_engine");
const VoiceEngine = require("./core/voice_engine");
const PersonalityEngine = require("./core/personality_engine");
const FacialEmotionalTellEngine = require("./core/facial_emotional_tell_engine");
const { ShardManager } = require("./core/shard_manager");
const { DreamingEngine } = require("./core/dreaming_engine");
const { EmotionEngine } = require("./core/emotion_engine");
const { TemporalEngine } = require("./core/temporal_engine");
const AnomalyBuffer = require("./core/anomaly_buffer");
const { RetrievalEngine } = require("./core/retrieval_engine");
const { encodeText } = require("./core/encoder");
const SyntheticSensoryEngine = require("./core/synthetic_sensory_engine");
const ActionEngine = require("./core/action_engine");

// 🔹 Experiment / theory / world API
const ExperimentEngine = require("./core/experiment_engine");
const TheoryEngine = require("./core/theory_engine");
const UnrealWorldAPI = require("./core/unreal_world_api");

// 🔹 Native C++ semantic/memory engine
let core = null;
try {
  core = require("./native/build/Release/ghost_core.node");
  console.log("[BOOT] Native ghost_core loaded.");
} catch (err) {
  console.error("[BOOT] Failed to load native ghost_core:", err);
}

console.log("[BOOT] Core modules imported.");

// Simple embedding helper
function embedText(text) {
  try {
    return encodeText(text || "");
  } catch (e) {
    console.error("[EMBED] Failed to encode text:", e);
    return [];
  }
}

// -------------------------
// INSTANTIATE ENGINES
// -------------------------
console.log("[BOOT] Instantiating core engines...");

const reflection = new ReflectionState();
const mapper = new InputMapper();
const episodic = new EpisodicMemory();
const compressor = new CompressionEngine(12, 32);
const behavior = new BehaviorEngine();
const attention = new AttentionEngine(12);
const persistence = new Persistence();
const thinker = new ThoughtEngine();
const voice = new VoiceEngine(thinker);
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
  logger: console,
});

console.log("[BOOT] Core engines instantiated.");

// -------------------------
// NATIVE SHARD SYNC
// -------------------------
function syncShardsToNative() {
  if (!core) return;
  try {
    core.clearShards();
    const shardList = shards.shards || [];
    for (const s of shardList) {
      if (!s || typeof s.id === "undefined" || !Array.isArray(s.embedding)) continue;
      core.addShard({ id: s.id, embedding: s.embedding });
    }
    console.log(`[NATIVE] Synced ${shardList.length} shards into ghost_core.`);
  } catch (err) {
    console.error("[NATIVE] Error syncing shards:", err);
  }
}

// -------------------------
// LOAD MEMORY
// -------------------------
console.log("[MEMORY] Attempting to load persisted memory...");

try {
  const saved = persistence.load();
  if (saved) {
    console.log("[MEMORY] Persistence payload found. Restoring episodic + shards...");
    episodic.load(saved.episodic || []);
    shards.load(saved.shards || []);
    console.log(
      `[MEMORY] Loaded ${episodic.episodes.length} episodic entries, ${shards.shards.length} shards.`
    );

    syncShardsToNative();

    if (core && core.clearEpisodesNative && core.addEpisodeNative) {
      console.log("[NATIVE] Syncing episodic memory into native store...");
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
      console.log("[NATIVE] Episodic memory sync complete.");
    }
  } else {
    console.log("[MEMORY] No saved memory found. Starting fresh.");
  }
} catch (err) {
  console.error("[MEMORY] Error loading memory:", err);
}

// -------------------------
// WINDOW CREATION
// -------------------------
let mainWindow = null;

function createWindow() {
  console.log("[UI] Creating BrowserWindow...");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.openDevTools();
  mainWindow.loadFile("index.html");

  mainWindow.on("closed", () => {
    console.log("[UI] Main window closed.");
    mainWindow = null;
  });

  console.log("[UI] BrowserWindow created and index.html loaded.");
}

// -------------------------
// APP READY
// -------------------------
app.whenReady().then(() => {
  console.log("[APP] Electron app ready. Creating window and starting systems...");
  createWindow();
  runCognitiveCycle().catch((err) => {
    console.error("[COGNITIVE] Initial cycle failed:", err);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log("[APP] Reactivating app, creating new window...");
      createWindow();
    }
  });
});

// -------------------------
// TEMPORAL ENGINE TICK
// -------------------------
console.log("[TEMPORAL] Starting temporal engine tick loop...");

const TEMPORAL_INTERVAL_MS = 1000;
setInterval(() => {
  try {
    const now = Date.now();
    temporal.tick(now);

    if (now % (10 * 1000) < TEMPORAL_INTERVAL_MS) {
      console.log("[TEMPORAL] Tick at", new Date(now).toISOString());
    }
  } catch (err) {
    console.error("[TEMPORAL] Error during temporal tick:", err);
  }
}, TEMPORAL_INTERVAL_MS);

// -------------------------
// IPC: ghost-input
// -------------------------
console.log("[IPC] Registering 'ghost-input' handler (invoke)...");

let ghostTick = 0;
let cycleRunning = false;
let previousSyntheticVector = Array(12).fill(0);
let previousPredLoss = 0;

// 🔥 Start with an active personality profile
let latestPersonalityState = {
  traits: [0.6, 0.0, 0.4, 0.2],
  moodBaseline: personality.moodBaseline,
  styleBias: { ...personality.styleBias },
  curiosity: 0.6,
  emotionality: 0.4,
  vigilance: 0.2,
};

let lastGhostState = null;

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
// COGNITIVE CYCLE
// -------------------------
async function runCognitiveCycle() {
  try {
    if (cycleRunning && lastGhostState) {
      return lastGhostState;
    }
    cycleRunning = true;
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

    // 🔥 Define an active trait profile (array for engines)
    const traitArray = [0.6, 0.0, 0.4, 0.2];

    // 🔥 Expose both array + object views for UI / debug
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

    const reflectionState = reflection.build({
      latentHistory: compressionOut.latentHistory,
      anomalyHistory: anomalyBuffer.anomalyHistory,
      predLossHistory: compressor.predLossHistory,
      memorySummary,
      personality: personalityState,
      attention: attention.weights,
      temporalSummary,
    });

    const thoughtOut = thinker.generate({
      latent: compressionOut.latent,
      anomaly: compressionOut.anomaly,
      predLoss: compressionOut.predLoss,
      attention: weights,
      mood: behaviorOut.mood,
      intensity: behaviorOut.intensity,
      styleBias: personalityState.styleBias,
      moodBaseline: personalityState.moodBaseline,
      traits: personalityState.traits, // array
    });

    const thought = thoughtOut.text || "";
    behaviorOut.text = thought || behaviorOut.text;

    const mappedThought = thoughtMapper.map(reflectionState);

    const emotionOut = emotion.update({
      anomaly: compressionOut.anomaly,
      predLoss: compressionOut.predLoss,
      mood: behaviorOut.mood,
      temporalSummary,
      traits: personalityState.traits, // array
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
      traits: personalityState.traits, // array
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

    let dreamsOut = [];
    if (ghostTick % 12 === 0) {
      dreamsOut = dreaming.runDreamCycle();
    }

    if (ghostTick % 40 === 0) {
      syncShardsToNative();
    }

    let experimentOut = null;
    if (ghostTick % 120 === 0) {
      const perceptionSnapshot = {
        latent: compressionOut.latent,
        thought,
        mood: behaviorOut.mood,
      };
      experimentOut = await experimentEngine.maybeRunExperiment(perceptionSnapshot);
    }

    const retrievalSnapshot = retrieval.retrieve(thought);

    let nativeEpisodes = [];
    if (core && core.retrieveEpisodesNative && ghostTick % 20 === 0) {
      const queryEmbedding = embedText(thought);
      nativeEpisodes = core.retrieveEpisodesNative(queryEmbedding, 5);
    }

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
      traits: personalityState.traits, // array
    });

    lastGhostState = normalizePacket({
      thought,
      mappedThought,
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
      dreams: dreamsOut,
      voice: { text: voiceOut.text || "" },
      personality: personalityState,
      temporalSummary,
      anomalyFlag: anomalyScore,
      latent: compressionOut.latent,
      latent3D: compressionOut.latent3D,
      latentHistory: compressionOut.latentHistory,
      attention: attention.weights.slice(),
      experiment: experimentOut || null,
      memorySummary: episodic.getSummary(),
      loss: compressionOut.loss,
      predLoss: compressionOut.predLoss,
      retrievalSnapshot,
      nativeEpisodes,
      syntheticInput,
    });

    return lastGhostState;
  } catch (err) {
    console.error("[IPC] ghost-input handler error:", err);
    return normalizePacket({
      ...lastGhostState,
      voice: { text: "The ghost is regaining coherence." },
      error: err.message || String(err),
    });
  } finally {
    cycleRunning = false;
  }
}
// renderer calls this
ipcMain.handle("ghost-input", () => {
  // Just return the last computed state; do NOT run a new cycle here.
  return lastGhostState || null;
});

// background autonomous ticking
setInterval(() => {
  runCognitiveCycle().catch((err) => {
    console.error("[COGNITIVE] Background tick failed:", err);
  });
}, COGNITIVE_TICK_MS);

// -------------------------
// IPC: INPUT MAPPER EVENTS
// -------------------------
ipcMain.on("mouse-move", (e, x, y) => {
  try {
    mapper.updateMouse(x, y);
  } catch (err) {
    console.error(err);
  }
});

ipcMain.on("mouse-click", () => {
  try {
    mapper.updateClick();
  } catch (err) {
    console.error(err);
  }
});

ipcMain.on("mouse-scroll", (e, delta) => {
  try {
    mapper.updateScroll(delta);
  } catch (err) {
    console.error(err);
  }
});

ipcMain.on("key-press", () => {
  try {
    mapper.updateKeypress();
  } catch (err) {
    console.error(err);
  }
});

ipcMain.on("focus-change", (e, state) => {
  try {
    mapper.setFocus(state);
  } catch (err) {
    console.error(err);
  }
});

// -------------------------
// APP LIFECYCLE: SAVE MEMORY
// -------------------------
app.on("before-quit", () => {
  console.log("[APP] before-quit: saving memory to disk...");
  try {
    let nativeEpisodesDump = [];
    if (core && core.getEpisodesNative) {
      nativeEpisodesDump = core.getEpisodesNative();
    }

    const payload = {
      episodic: nativeEpisodesDump.length ? nativeEpisodesDump : episodic.dump(),
      shards: shards.dump(),
    };
    persistence.save(payload);
    console.log(
      `[APP] Memory saved. Episodic=${payload.episodic.length}, Shards=${payload.shards.length}`
    );
  } catch (err) {
    console.error("[APP] Error saving memory on quit:", err);
  }
});

app.on("window-all-closed", () => {
  console.log("[APP] All windows closed.");
  if (process.platform !== "darwin") {
    console.log("[APP] Quitting app (non-macOS).");
    app.quit();
  }
});