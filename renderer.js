const { ipcRenderer } = require('electron');
const visualSensoryEngine = require('./core/visual_sensory_engine');

let video = null;

/* ---------------------------------------------------------
   SAFE HELPERS
--------------------------------------------------------- */
function safeVal(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

/* ---------------------------------------------------------
   WEBCAM + VISUAL SENSORY PIPELINE
--------------------------------------------------------- */
async function startWebcam() {
  video = document.getElementById("webcam");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    console.log("Webcam started");
  } catch (err) {
    console.error("Webcam error:", err);
  }
}

function startVisualProcessing() {
  const canvas = document.getElementById("webcam-canvas");
  if (!canvas) {
    console.error("webcam-canvas not found in DOM");
    return;
  }

  const ctx = canvas.getContext("2d");

  function tick() {
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const w = video.videoWidth || 320;
      const h = video.videoHeight || 240;

      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(video, 0, 0, w, h);
      const frame = ctx.getImageData(0, 0, w, h);
      const pixels = frame.data;

      const sensoryVector = visualSensoryEngine.processFrame(pixels, w, h);

      try {
        ipcRenderer.send("visual-sensory", sensoryVector);
      } catch (err) {
        console.error("Error sending visual input:", err);
      }

      // Update UI for visual sensory
      updateVisualUI(sensoryVector);
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------
   VISUAL SENSORY UI
--------------------------------------------------------- */
function updateVisualUI(v) {
  document.getElementById("vis-brightness").innerText = safeVal(v.brightness).toFixed(3);
  document.getElementById("vis-motion").innerText = safeVal(v.motion).toFixed(3);
  document.getElementById("vis-edges").innerText = safeVal(v.edges).toFixed(3);
  document.getElementById("vis-entropy").innerText = safeVal(v.entropy).toFixed(3);
}

/* ---------------------------------------------------------
   USER INPUT EVENTS → MAIN
--------------------------------------------------------- */
window.addEventListener('mousemove', e => {
  ipcRenderer.send('mouse-move', e.clientX, e.clientY);
});

window.addEventListener('keydown', () => {
  ipcRenderer.send('key-press');
});

window.addEventListener('click', () => {
  ipcRenderer.send('mouse-click');
});

window.addEventListener('wheel', e => {
  ipcRenderer.send('mouse-scroll', e.deltaY);
});

window.addEventListener('focus', () => {
  ipcRenderer.send('focus-change', true);
});

window.addEventListener('blur', () => {
  ipcRenderer.send('focus-change', false);
});

/* ---------------------------------------------------------
   FACIAL FEATURES (STUB)
--------------------------------------------------------- */
function extractFacialFeatures(video) {
  if (!video) return null;

  return {
    smile: Math.random(),
    frown: Math.random(),
    eyeOpen: Math.random(),
    browTension: Math.random(),
    jawTension: Math.random(),
    motionEnergy: Math.random()
  };
}

/* ---------------------------------------------------------
   GHOST UI UPDATE LOOP
--------------------------------------------------------- */
async function updateGhost() {
  try {
    const result = await ipcRenderer.invoke('ghost-input');
    if (!result) return;

    const latent = safeArray(result.latent);
    const latent3D = safeArray(result.latent3D);
    const history = safeArray(result.latentHistory);

    const loss = safeVal(result.loss);
    const predLoss = safeVal(result.predLoss);
    const anomaly = safeVal(result.anomaly);
    const behavior = result.behavior || { text: "", color: "#ffffff" };
    const attention = safeArray(result.attention);

    const memory = result.memorySummary || { count: 0, limit: 0 };
    const personality = result.personality || {
      moodBaseline: 0,
      traits: [0, 0, 0, 0],
      styleBias: {}
    };

    const emotion = result.emotion || {
      emotion: "neutral",
      valence: 0,
      arousal: 0,
      tension: 0
    };

    /* -----------------------------
       TEXT + COLOR
    ----------------------------- */
    document.getElementById("ghost-state").innerText = behavior.text;
    document.getElementById("ghost-voice").innerText = result.voice || "";

    document.documentElement.style.setProperty(
      "--glow-color",
      behavior.color || "rgba(255,255,255,0.35)"
    );

    /* -----------------------------
       LOSS + ANOMALY
    ----------------------------- */
    document.getElementById("loss-display").innerText =
      `Compression Loss: ${loss.toFixed(4)}`;

    document.getElementById("prediction-loss").innerText =
      `Prediction Loss: ${predLoss.toFixed(4)}`;

    document.getElementById("anomaly-display").innerText =
      `Anomaly: ${anomaly.toFixed(4)}`;

    /* -----------------------------
       ATTENTION BARS
    ----------------------------- */
    const attDiv = document.getElementById("attention-bars");
    attDiv.innerHTML = "";
    attention.forEach(w => {
      const bar = document.createElement("div");
      bar.className = "attention-bar";
      bar.style.height = `${safeVal(w) * 100}px`;
      attDiv.appendChild(bar);
    });

    /* -----------------------------
       LATENT BARS
    ----------------------------- */
    const latentContainer = document.getElementById("latent-visualizer");
    latentContainer.innerHTML = "";
    latent.forEach(v => {
      const bar = document.createElement("div");
      bar.className = "latent-bar";
      bar.style.height = `${Math.abs(safeVal(v)) * 100}px`;
      bar.style.background = v > 0 ? "#00ffff" : "#ff00ff";
      latentContainer.appendChild(bar);
    });

    /* -----------------------------
       LATENT 3D
    ----------------------------- */
    const latent3DContainer = document.getElementById("latent-3d-container");
    latent3DContainer.innerHTML = "";
    latent3D.forEach(layer => {
      const layerDiv = document.createElement("div");
      layerDiv.className = "latent-layer";
      layer.forEach(row => {
        row.forEach(v => {
          const cell = document.createElement("div");
          cell.className = "latent-cell";
          const intensity = Math.abs(safeVal(v));
          cell.style.background = `rgba(0,255,255,${0.2 + 0.6 * intensity})`;
          layerDiv.appendChild(cell);
        });
      });
      latent3DContainer.appendChild(layerDiv);
    });

    /* -----------------------------
       LATENT HISTORY
    ----------------------------- */
    const histDiv = document.getElementById("latent-history");
    histDiv.innerHTML = "";
    history.forEach(vec => {
      const row = document.createElement("div");
      row.className = "history-row";
      vec.forEach(v => {
        const cell = document.createElement("div");
        cell.className = "history-cell";
        cell.style.background = `rgba(0,255,255,${Math.abs(safeVal(v))})`;
        row.appendChild(cell);
      });
      histDiv.appendChild(row);
    });

    /* -----------------------------
       EMOTIONAL TELL UI
    ----------------------------- */
    document.getElementById("emotion-label").innerText = emotion.emotion;
    document.getElementById("emotion-valence").innerText = safeVal(emotion.valence).toFixed(3);
    document.getElementById("emotion-arousal").innerText = safeVal(emotion.arousal).toFixed(3);
    document.getElementById("emotion-tension").innerText = safeVal(emotion.tension).toFixed(3);

    /* -----------------------------
       MEMORY + PERSONALITY UI
    ----------------------------- */
    document.getElementById("memory-count").innerText = memory.count;
    document.getElementById("memory-limit").innerText = memory.limit;

    document.getElementById("mood-baseline").innerText =
      safeVal(personality.moodBaseline).toFixed(3);

    const traits = safeArray(personality.traits);
    document.getElementById("trait-curiosity").innerText =
      safeVal(traits[0]).toFixed(3);

    document.getElementById("trait-emotionality").innerText =
      safeVal(traits[2]).toFixed(3);

  } catch (err) {
    console.error("Error in updateGhost:", err);
  }
}

/* ---------------------------------------------------------
   PERIODIC LOOPS
--------------------------------------------------------- */
setInterval(() => {
  if (!video) return;
  const features = extractFacialFeatures(video);
  ipcRenderer.send("facial-features", features);
}, 100);

setInterval(updateGhost, 100);

/* ---------------------------------------------------------
   STARTUP
--------------------------------------------------------- */
window.addEventListener("DOMContentLoaded", () => {
  startWebcam();
  startVisualProcessing();
});