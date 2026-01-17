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
   GHOST PAINTING ENGINE
--------------------------------------------------------- */
const ghostCanvas = document.getElementById("ghostCanvas");
const gctx = ghostCanvas.getContext("2d");

// match pixel resolution to CSS size
ghostCanvas.width = ghostCanvas.clientWidth;
ghostCanvas.height = ghostCanvas.clientHeight;

// DRAGGABLE WINDOW
let dragging = false;
let offsetX = 0;
let offsetY = 0;

ghostCanvas.addEventListener("mousedown", e => {
  dragging = true;
  offsetX = e.clientX - ghostCanvas.offsetLeft;
  offsetY = e.clientY - ghostCanvas.offsetTop;
});

window.addEventListener("mousemove", e => {
  if (dragging) {
    ghostCanvas.style.left = `${e.clientX - offsetX}px`;
    ghostCanvas.style.top = `${e.clientY - offsetY}px`;
  }
});

window.addEventListener("mouseup", () => dragging = false);

// FULL-SCREEN VISION MODE
ghostCanvas.addEventListener("dblclick", () => {
  ghostCanvas.classList.toggle("vision-mode");
});

/* ---------------------------------------------------------
   PAINTING FUNCTION
--------------------------------------------------------- */
function paintGhostState(data) {
  const t = data.temporalSummary || {};
  const b = data.behavior || {};
  const p = data.personality || {};

  const w = ghostCanvas.width;
  const h = ghostCanvas.height;

  // PERSONALITY PALETTE
  const trait = p.traits?.primary || "neutral";

  const palettes = {
    calm: [80, 180, 255],
    chaotic: [255, 80, 120],
    analytical: [120, 255, 180],
    neutral: [200, 200, 200],
    dark: [80, 80, 120],
    bright: [255, 220, 120]
  };

  const base = palettes[trait] || palettes.neutral;

  // EMOTION + ANOMALY COLORING
  const mood = b.mood === "positive" ? 1 : b.mood === "negative" ? -1 : 0;
  const anomaly = safeVal(data.anomalyFlag);
  const baseline = safeVal(t.baselineShift);
  const intensity = safeVal(b.intensity);

  const r = base[0] + anomaly * 120;
  const g = base[1] + mood * 120;
  const bcol = base[2] + baseline * 120;

  // MOTION BLUR / MEMORY GHOSTS
  gctx.fillStyle = "rgba(0,0,0,0.05)";
  gctx.fillRect(0, 0, w, h);

  // BRUSH TEXTURE
  for (let i = 0; i < 20; i++) {
    gctx.fillStyle = `rgba(${r}, ${g}, ${bcol}, ${0.02 + intensity * 0.05})`;
    gctx.beginPath();
    gctx.arc(
      Math.random() * w,
      Math.random() * h,
      5 + Math.random() * 10 * intensity,
      0,
      Math.PI * 2
    );
    gctx.fill();
  }

  // DREAM FRACTALS
  if (safeVal(t.dreamFrequency) > 0.1) {
    gctx.strokeStyle = `rgba(255,255,255,${0.1 + t.dreamFrequency})`;
    gctx.lineWidth = 1 + t.dreamFrequency * 3;

    for (let i = 0; i < 3; i++) {
      gctx.beginPath();
      gctx.moveTo(Math.random() * w, Math.random() * h);
      for (let j = 0; j < 6; j++) {
        gctx.lineTo(Math.random() * w, Math.random() * h);
      }
      gctx.stroke();
    }
  }

  // EMOTIONAL PULSE
  gctx.beginPath();
  gctx.arc(
    w / 2 + (Math.random() - 0.5) * 20,
    h / 2 + (Math.random() - 0.5) * 20,
    20 + intensity * 40,
    0,
    Math.PI * 2
  );
  gctx.fillStyle = `rgba(${r}, ${g}, ${bcol}, 0.25)`;
  gctx.fill();
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

    /* -----------------------------
       PAINT THE GHOST'S INNER WORLD
    ----------------------------- */
    paintGhostState(result);

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