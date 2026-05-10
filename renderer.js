// renderer.js
// ---------------------------------------------------------
// SAFE HELPERS
// ---------------------------------------------------------
function safeVal(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

// ---------------------------------------------------------
// INPUT SOURCE BINDINGS
// ---------------------------------------------------------
function bindInputSources() {
  window.addEventListener("mousemove", (e) => {
    window.ghost.sendMouseMove(e.clientX, e.clientY);
  });

  window.addEventListener("mousedown", () => {
    window.ghost.sendMouseClick();
  });

  window.addEventListener("wheel", (e) => {
    window.ghost.sendMouseScroll(e.deltaY);
  }, { passive: true });

  window.addEventListener("keydown", () => {
    window.ghost.sendKeyPress();
  });

  window.addEventListener("focus", () => {
    window.ghost.sendFocusChange(true);
  });

  window.addEventListener("blur", () => {
    window.ghost.sendFocusChange(false);
  });
}

// ---------------------------------------------------------
// DOM RECYCLING SETUP
// ---------------------------------------------------------
let attentionBars = [];

function initDOM() {
  // Attention bars (32)
  const attDiv = document.getElementById("attention-bars");
  if (attDiv) {
    for (let i = 0; i < 32; i++) {
      const bar = document.createElement("div");
      bar.className = "attention-bar";
      attDiv.appendChild(bar);
      attentionBars.push(bar);
    }
  }
}

// ---------------------------------------------------------
// GHOST UI UPDATE LOOP
// ---------------------------------------------------------
let lastHeavyUpdate = 0;

async function updateGhost() {
  try {
    const result = await window.ghost.requestGhostUpdate();
    if (!result) return;

    // -----------------------------
    // 1. LIGHT UPDATES
    // -----------------------------
    requestIdleCallback(() => {
      const behavior =
        typeof result.behavior === "string"
          ? { text: result.behavior, color: "#ffffff" }
          : result.behavior || {
              text: result.mappedThought || result.thought || "",
              color: "#ffffff",
            };

      const ghostState = document.getElementById("ghost-state");
      if (ghostState) ghostState.innerText = behavior.text || "";

      document.documentElement.style.setProperty(
        "--glow-color",
        behavior.color || "rgba(255,255,255,0.35)"
      );

      const lossEl = document.getElementById("loss-display");
      const predEl = document.getElementById("prediction-loss");
      const anomEl = document.getElementById("anomaly-display");

      if (lossEl) lossEl.innerText = safeVal(result.loss).toFixed(4);
      if (predEl) predEl.innerText = safeVal(result.predLoss).toFixed(4);
      if (anomEl) anomEl.innerText = safeVal(result.anomalyFlag).toFixed(4);
    });

    // -----------------------------
    // 2. MEDIUM UPDATES (attention bars)
    // -----------------------------
    requestIdleCallback(() => {
      const attention = safeArray(result.attention ?? []);
      const maxW = attention.length ? Math.max(...attention) || 0.0001 : 0.0001;

      attentionBars.forEach((bar, i) => {
        const w = safeVal(attention[i]);
        const norm = w / maxW;
        bar.style.height = `${Math.max(norm * 50, 2)}px`;
        bar.style.background = `rgba(255,170,0,${0.2 + norm * 0.8})`;
      });
    });

    // -----------------------------
    // 3. HEAVY UPDATES (1x per second)
    // -----------------------------
    if (performance.now() - lastHeavyUpdate > 600) {
      lastHeavyUpdate = performance.now();

      requestIdleCallback(() => {
        // EMOTION / MEMORY / TRAITS
        const emotion = result.emotion || {};
        const memory = result.memorySummary || {};
        const personality = result.personality || {};
        const traits = Array.isArray(personality.traits) ? personality.traits : [];

        const curiosity    = safeVal(traits[0]);
        const emotionality = safeVal(traits[2]);

        const el = (id) => document.getElementById(id);

        if (el("emotion-label"))      el("emotion-label").innerText      = emotion.emotion || "neutral";
        if (el("emotion-valence"))    el("emotion-valence").innerText    = safeVal(emotion.valence).toFixed(2);
        if (el("emotion-arousal"))    el("emotion-arousal").innerText    = safeVal(emotion.arousal).toFixed(2);
        if (el("emotion-tension"))    el("emotion-tension").innerText    = safeVal(emotion.tension).toFixed(2);
        if (el("memory-count"))       el("memory-count").innerText       = safeVal(memory.count);
        if (el("memory-limit"))       el("memory-limit").innerText       = safeVal(memory.limit);
        if (el("mood-baseline"))      el("mood-baseline").innerText      = safeVal(personality.moodBaseline).toFixed(2);
        if (el("trait-curiosity"))    el("trait-curiosity").innerText    = curiosity.toFixed(2);
        if (el("trait-emotionality")) el("trait-emotionality").innerText = emotionality.toFixed(2);

        // Drive status lights
        if (window.onCognitiveUpdate) window.onCognitiveUpdate();
        if (window.onMemoryUpdate)    window.onMemoryUpdate(safeVal(memory.count));
      });
    }
  } catch (err) {
    console.error("Error in updateGhost:", err);
  }
}

// ---------------------------------------------------------
// NON-BLOCKING rAF LOOP
// ---------------------------------------------------------
let lastUpdate = 0;

function ghostLoop(timestamp) {
  if (timestamp - lastUpdate > 250) {
    updateGhost();
    lastUpdate = timestamp;
  }
  requestAnimationFrame(ghostLoop);
}

// ---------------------------------------------------------
// DOM READY: SETUP + START
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initDOM();
  bindInputSources();
  window.ghost.sendFocusChange(document.hasFocus());
  requestAnimationFrame(ghostLoop);
});