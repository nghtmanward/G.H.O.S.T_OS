const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const ReflectionState = require('./core/reflection_state');
const ThoughtMapper = require('./core/thought_mapper');
const EpisodicMemory = require('./core/episodic_memory');
const CompressionEngine = require('./core/compression_engine');
const BehaviorEngine = require('./core/behavior_engine');
const InputMapper = require('./core/input_mapper');
const AttentionEngine = require('./core/attention_engine');
const Persistence = require('./core/persistence');
const ThoughtEngine = require('./core/thought_engine');
const VoiceEngine = require('./core/voice_engine');
const PersonalityEngine = require('./core/personality_engine');
const FacialEmotionalTellEngine = require('./core/facial_emotional_tell_engine');

let webcamFeatures = null;

/* -----------------------------------------
   CORE ENGINES
----------------------------------------- */

const engine = new CompressionEngine(12, 32);   // 12‑dim input vector
const behavior = new BehaviorEngine();
const mapper = new InputMapper();
const attention = new AttentionEngine(12);
const persistence = new Persistence();
const thought = new ThoughtEngine();
const voice = new VoiceEngine(thought);
const personality = new PersonalityEngine();
const episodic = new EpisodicMemory();
const reflection = new ReflectionState();
const thoughtMapper = new ThoughtMapper();
const facial = new FacialEmotionalTellEngine();

/* -----------------------------------------
   LOAD MEMORY ON STARTUP
----------------------------------------- */

const saved = persistence.load();
if (saved) {
  console.log("Loaded ghost memory.");

  if (saved.proj) engine.proj = saved.proj;
  if (saved.structure) engine.structure = saved.structure;
  if (saved.fast) engine.fast = saved.fast;
  if (saved.slow) engine.slow = saved.slow;
  if (saved.attention) attention.weights = saved.attention;
}

/* -----------------------------------------
   SAVE MEMORY EVERY 5 SECONDS
----------------------------------------- */

setInterval(() => {
  persistence.save({
    proj: engine.proj,
    structure: engine.structure,
    fast: engine.fast,
    slow: engine.slow,
    attention: attention.weights
  });
}, 5000);

/* -----------------------------------------
   CREATE WINDOW
----------------------------------------- */

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 600,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

/* -----------------------------------------
   RECEIVE VISUAL SENSORY INPUT
----------------------------------------- */

ipcMain.on("visual-sensory", (event, sensoryVector) => {
  mapper.updateVisual(sensoryVector);
});

/* -----------------------------------------
   RECEIVE FACIAL FEATURES
----------------------------------------- */

ipcMain.on("facial-features", (event, data) => {
  webcamFeatures = data;
});

/* -----------------------------------------
   MAIN GHOST UPDATE LOOP
----------------------------------------- */

ipcMain.handle('ghost-input', () => {

  const rawInput = mapper.getVector();
  const attendedInput = attention.applyAttention(rawInput);

  const facialState = facial.update(webcamFeatures);

  const pre = engine.predictNext();
  const predLossBefore = engine.predictiveLoss(attendedInput, pre);

  const result = engine.ingest(attendedInput, attendedInput);

  const post = engine.predictNext();
  const predLossAfter = engine.predictiveLoss(attendedInput, post);

  attention.updateAttention(rawInput, predLossBefore, predLossAfter);

  const behaviorState = behavior.update({
    anomaly: result.anomaly,
    predLoss: result.predLoss,
    latent: result.latent,
    slow: engine.slow,
    fast: engine.fast,
    facial: facialState
  });

  const personalityState = personality.update({
    anomaly: result.anomaly,
    predLoss: result.predLoss,
    intensity: behaviorState.intensity,
    mood: behaviorState.mood,
    facial: facialState
  });

  const reflectionState = reflection.build({
    latentHistory: engine.latentHistory || [],
    anomalyHistory: engine.anomalyHistory || [],
    predLossHistory: engine.predLossHistory || [],
    memorySummary: episodic.getSummary(),
    personality: personalityState,
    attention: attention.weights
  });

  const thoughtSeed = thoughtMapper.map(reflectionState);

  const voiceLine = voice.generate({
    anomaly: result.anomaly,
    predLoss: result.predLoss,
    attention: attention.weights,
    mood: behaviorState.mood,
    intensity: behaviorState.intensity,
    latent: result.latent,
    styleBias: personalityState.styleBias,
    moodBaseline: personalityState.moodBaseline,
    traits: personalityState.traits,
    facial: facialState
  });

  // Store episodic memory
  if (typeof voiceLine === "string") {
    episodic.addEpisode(voiceLine, {
      thought: voiceLine,
      latent: result.latent,
      anomaly: result.anomaly,
      mood: behaviorState.mood,
      styleBias: personalityState.styleBias,
      timestamp: Date.now()
    });
  } else if (voiceLine && voiceLine.metadata) {
    episodic.addEpisode(voiceLine.text, voiceLine.metadata);
  }

  /* -----------------------------------------
     SAFE RETURN OBJECT (no null/undefined)
  ----------------------------------------- */

  return {
    ...result,
    loss: engine.loss(attendedInput, result.recon),
    behavior: behaviorState,
    attention: attention.weights,

    // ⭐ SAFE voice output (never null/undefined)
    voice: typeof voiceLine === "string"
      ? voiceLine
      : (voiceLine?.text || ""),

    personality: personalityState,
    episodicMemory: episodic.getSummary(),
    reflection: reflectionState,
    thoughtSeed: thoughtSeed || ""
  };
});

/* -----------------------------------------
   INPUT EVENTS
----------------------------------------- */

ipcMain.on('mouse-move', (e, x, y) => mapper.updateMouse(x, y));
ipcMain.on('key-press', () => mapper.updateKeypress());
ipcMain.on('mouse-click', () => mapper.updateClick());
ipcMain.on('mouse-scroll', (e, delta) => mapper.updateScroll(delta));
ipcMain.on('focus-change', (e, state) => mapper.setFocus(state));

/* -----------------------------------------
   START APP
----------------------------------------- */

app.whenReady().then(() => {
  createWindow();
});