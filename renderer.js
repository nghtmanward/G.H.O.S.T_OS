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

  window.addEventListener(
    "wheel",
    (e) => {
      window.ghost.sendMouseScroll(e.deltaY);
    },
    { passive: true }
  );

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
let latentBars = [];
let latent3DLayers = [];
let historyRows = [];

function initDOM() {
  // Attention bars (32)
  const attDiv = document.getElementById("attention-bars");
  for (let i = 0; i < 32; i++) {
    const bar = document.createElement("div");
    bar.className = "attention-bar";
    attDiv.appendChild(bar);
    attentionBars.push(bar);
  }

  // Latent bars (32)
  const latentDiv = document.getElementById("latent-visualizer");
  for (let i = 0; i < 32; i++) {
    const bar = document.createElement("div");
    bar.className = "latent-bar";
    latentDiv.appendChild(bar);
    latentBars.push(bar);
  }

  // Latent 3D grid (4 layers × 4×4)
  const latent3DContainer = document.getElementById("latent-3d-container");
  for (let l = 0; l < 4; l++) {
    const layerDiv = document.createElement("div");
    layerDiv.className = "latent-layer";
    latent3DLayers.push([]);

    for (let i = 0; i < 16; i++) {
      const cell = document.createElement("div");
      cell.className = "latent-cell";
      layerDiv.appendChild(cell);
      latent3DLayers[l].push(cell);
    }

    latent3DContainer.appendChild(layerDiv);
  }

  // Latent history (32 rows × 32 cells)
  const histDiv = document.getElementById("latent-history");
  for (let r = 0; r < 32; r++) {
    const row = document.createElement("div");
    row.className = "history-row";
    historyRows.push([]);

    for (let c = 0; c < 32; c++) {
      const cell = document.createElement("div");
      cell.className = "history-cell";
      row.appendChild(cell);
      historyRows[r].push(cell);
    }

    histDiv.appendChild(row);
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

      document.getElementById("ghost-state").innerText =
        behavior.text || "";

      document.documentElement.style.setProperty(
        "--glow-color",
        behavior.color || "rgba(255,255,255,0.35)"
      );

      document.getElementById("loss-display").innerText =
        `Compression Loss: ${safeVal(result.loss).toFixed(4)}`;
      document.getElementById("prediction-loss").innerText =
        `Prediction Loss: ${safeVal(result.predLoss).toFixed(4)}`;

      // FIXED: anomalyFlag, not anomaly
      document.getElementById("anomaly-display").innerText =
        `Anomaly: ${safeVal(result.anomalyFlag).toFixed(4)}`;
    });

    // -----------------------------
    // 2. MEDIUM UPDATES (bars)
    // -----------------------------
    requestIdleCallback(() => {
      const attention = safeArray(result.attention ?? []);
      const maxW = attention.length
        ? Math.max(...attention) || 0.0001
        : 0.0001;

      attentionBars.forEach((bar, i) => {
        const w = safeVal(attention[i]);
        const norm = w / maxW;
        bar.style.height = `${Math.max(norm * 120, 2)}px`;
        bar.style.background = `rgba(255,170,0,${
          0.2 + norm * 0.8
        })`;
      });

      const latent = safeArray(result.latent ?? []);
      latentBars.forEach((bar, i) => {
        const v = safeVal(latent[i]);
        bar.style.height = `${Math.abs(v) * 100}px`;
        bar.style.background = v > 0 ? "#00ffff" : "#ff00ff";
      });
    });

    // -----------------------------
    // 3. HEAVY UPDATES (1× per second)
    // -----------------------------
    if (performance.now() - lastHeavyUpdate > 600) {
      lastHeavyUpdate = performance.now();

      requestIdleCallback(() => {
        const latent3D = safeArray(result.latent3D ?? []);

        latent3D.forEach((layer, l) => {
          if (!latent3DLayers[l]) return;

          layer.forEach((row, i) => {
            const baseIndex = i * 4;
            if (!latent3DLayers[l][baseIndex]) return;

            row.forEach((v, j) => {
              const idx = baseIndex + j;
              const cell = latent3DLayers[l][idx];
              if (!cell) return;

              const intensity = Math.abs(safeVal(v));
              cell.style.background = `rgba(0,255,255,${
                0.2 + 0.6 * intensity
              })`;
            });
          });
        });

        const history = safeArray(result.latentHistory ?? []);
        history.forEach((vec, r) => {
          if (!historyRows[r]) return;

          vec.forEach((v, c) => {
            const cell = historyRows[r][c];
            if (!cell) return;

            cell.style.background = `rgba(0,255,255,${Math.abs(
              safeVal(v)
            )})`;
          });
        });

        // -----------------------------
        // EMOTION / MEMORY / TRAITS PANEL
        // -----------------------------
        const emotion = result.emotion || {};
        const memory = result.memorySummary || {};
        const personality = result.personality || {};
        const traits = Array.isArray(personality.traits)
          ? personality.traits
          : [];

        const curiosity = safeVal(traits[0]);
        const emotionality = safeVal(traits[2]);

        // Emotional tell
        document.getElementById("emotion-label").innerText =
          emotion.emotion || "neutral";
        document.getElementById("emotion-valence").innerText =
          safeVal(emotion.valence).toFixed(2);
        document.getElementById("emotion-arousal").innerText =
          safeVal(emotion.arousal).toFixed(2);
        document.getElementById("emotion-tension").innerText =
          safeVal(emotion.tension).toFixed(2);

        // Memory & mood
        document.getElementById("memory-count").innerText =
          safeVal(memory.count);
        document.getElementById("memory-limit").innerText =
          safeVal(memory.limit);
        document.getElementById("mood-baseline").innerText =
          safeVal(personality.moodBaseline).toFixed(2);

        // Traits
        document.getElementById("trait-curiosity").innerText =
          curiosity.toFixed(2);
        document.getElementById("trait-emotionality").innerText =
          emotionality.toFixed(2);
      });
    }
  } catch (err) {
    console.error("Error in updateGhost:", err);
  }
}

// ---------------------------------------------------------
// NON‑BLOCKING rAF LOOP
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