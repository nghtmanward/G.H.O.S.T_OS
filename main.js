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

const engine = new CompressionEngine(8, 32);
const behavior = new BehaviorEngine();
const mapper = new InputMapper();
const attention = new AttentionEngine(8);
const persistence = new Persistence();
const thought = new ThoughtEngine();
const voice = new VoiceEngine(thought);
const personality = new PersonalityEngine();
const episodic = new EpisodicMemory();
const reflection = new ReflectionState();
const thoughtMapper = new ThoughtMapper();
const facial = new FacialEmotionalTellEngine();


// LOAD MEMORY ON STARTUP
const saved = persistence.load();
if (saved) {
  console.log("Loaded ghost memory.");

  if (saved.proj) engine.proj = saved.proj;
  if (saved.structure) engine.structure = saved.structure;
  if (saved.fast) engine.fast = saved.fast;
  if (saved.slow) engine.slow = saved.slow;
  if (saved.attention) attention.weights = saved.attention;
  // Step M1: we could later load personality here once we persist it
}

// SAVE MEMORY EVERY 5 SECONDS
setInterval(() => {
  persistence.save({
    proj: engine.proj,
    structure: engine.structure,
    fast: engine.fast,
    slow: engine.slow,
    attention: attention.weights
    // Step M2+: add personality state here when you’re ready to persist it
  });
}, 5000);

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

  // --- M4.1: Build reflection state ---
  const reflectionState = reflection.build({
    latentHistory: engine.latentHistory || [],     // if you track it
    anomalyHistory: engine.anomalyHistory || [],   // if you track it
    predLossHistory: engine.predLossHistory || [], // optional
    memorySummary: episodic.getSummary(),
    personality: personalityState,
    attention: attention.weights
  });

  // --- M4.2: Map reflection → thought seed ---
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

  // Store voice output in episodic memory
  if (typeof voiceLine === "string") {
  // Quick reaction → minimal metadata
    episodic.addEpisode(voiceLine, {
      thought: voiceLine,
      latent: result.latent,
      anomaly: result.anomaly,
      mood: behaviorState.mood,
      styleBias: personalityState.styleBias,
      timestamp: Date.now()
    });
  } else if (voiceLine && voiceLine.metadata) {
  // Deep thought → full metadata
    episodic.addEpisode(voiceLine.text, voiceLine.metadata);
  }
  return {
  ...result,
  loss: engine.loss(attendedInput, result.recon),
  behavior: behaviorState,
  attention: attention.weights,
  voice: typeof voiceLine === "string" ? voiceLine : voiceLine.text,
  personality: personalityState,
  episodicMemory: episodic.getSummary(),
  reflection: reflectionState,
  thoughtSeed: thoughtSeed
  };

});

ipcMain.on('mouse-move', (e, x, y) => mapper.updateMouse(x, y));
ipcMain.on('key-press', () => mapper.updateKeypress());
ipcMain.on('mouse-click', () => mapper.updateClick());
ipcMain.on('mouse-scroll', (e, delta) => mapper.updateScroll(delta));
ipcMain.on('focus-change', (e, state) => mapper.setFocus(state));
ipcMain.on("facial-features", (event, data) => {
  webcamFeatures = data;
});



app.whenReady().then(() => {
  createWindow();
});