const { ipcRenderer } = require('electron');
const visualSensoryEngine = require('./core/visual_sensory_engine');

let video = null;

/* -----------------------------
   WEBCAM + VISUAL SENSORY PIPELINE
----------------------------- */

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
        // send visual sensory vector to main process → InputMapper.updateVisual
        ipcRenderer.send("visual-sensory", sensoryVector);
      } catch (err) {
        console.error("Error sending visual input:", err);
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/* -----------------------------
   USER INPUT EVENTS → MAIN
----------------------------- */

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

/* -----------------------------
   FACIAL FEATURES (STUB)
----------------------------- */

function extractFacialFeatures(video) {
  if (!video) return null;

  // Placeholder until you add real detection
  return {
    smile: Math.random(),
    frown: Math.random(),
    eyeOpen: Math.random(),
    browTension: Math.random(),
    jawTension: Math.random(),
    motionEnergy: Math.random()
  };
}

/* -----------------------------
   GHOST UI UPDATE LOOP
----------------------------- */

async function updateGhost() {
  try {
    const result = await ipcRenderer.invoke('ghost-input');

    // Debug heartbeat
    // console.log("GHOST RESULT:", result);

    if (!result) return;

    const latent = result.latent || [];
    const latent3D = result.latent3D || [];
    const history = result.latentHistory || [];

    const loss = result.loss ?? 0;
    const predLoss = result.predLoss ?? 0;
    const anomaly = result.anomaly ?? 0;
    const behavior = result.behavior || { text: '', color: '#ffffff' };
    const attention = result.attention || [];

    // Text + color
    const ghostStateEl = document.getElementById('ghost-state');
    const ghostVoiceEl = document.getElementById('ghost-voice');

    if (ghostStateEl) ghostStateEl.innerText = behavior.text;
    if (ghostVoiceEl) ghostVoiceEl.innerText = result.voice || '';

    document.documentElement.style.setProperty(
      '--glow-color',
      behavior.color || 'rgba(255,255,255,0.35)'
    );

    // Loss displays
    const lossEl = document.getElementById('loss-display');
    const predLossEl = document.getElementById('prediction-loss');
    const anomalyEl = document.getElementById('anomaly-display');

    if (lossEl) lossEl.innerText = `Compression Loss: ${loss.toFixed(4)}`;
    if (predLossEl) predLossEl.innerText = `Prediction Loss: ${predLoss.toFixed(4)}`;
    if (anomalyEl) anomalyEl.innerText = `Anomaly: ${anomaly.toFixed(4)}`;

    // Attention visualization
    const attDiv = document.getElementById('attention-bars');
    if (attDiv) {
      attDiv.innerHTML = '';
      attention.forEach(w => {
        const bar = document.createElement('div');
        bar.className = 'attention-bar';
        bar.style.height = `${w * 100}px`;
        bar.style.background = '#ffaa00';
        attDiv.appendChild(bar);
      });
    }

    // Latent bars
    const latentContainer = document.getElementById('latent-visualizer');
    if (latentContainer) {
      latentContainer.innerHTML = '';
      latent.forEach(v => {
        const bar = document.createElement('div');
        bar.className = 'latent-bar';
        bar.style.height = `${Math.abs(v) * 100}px`;
        bar.style.background = v > 0 ? '#00ffff' : '#ff00ff';
        latentContainer.appendChild(bar);
      });
    }

    // 3D latent
    const latent3DContainer = document.getElementById('latent-3d-container');
    if (latent3DContainer) {
      latent3DContainer.innerHTML = '';
      latent3D.forEach(layer => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'latent-layer';
        layer.forEach(row => {
          row.forEach(v => {
            const cell = document.createElement('div');
            cell.className = 'latent-cell';
            const intensity = Math.abs(v);
            cell.style.background = `rgba(0,255,255,${0.2 + 0.6 * intensity})`;
            layerDiv.appendChild(cell);
          });
        });
        latent3DContainer.appendChild(layerDiv);
      });
    }

    // Latent history
    const histDiv = document.getElementById('latent-history');
    if (histDiv) {
      histDiv.innerHTML = '';
      history.forEach(vec => {
        const row = document.createElement('div');
        row.className = 'history-row';
        vec.forEach(v => {
          const cell = document.createElement('div');
          cell.className = 'history-cell';
          cell.style.background = `rgba(0,255,255,${Math.abs(v)})`;
          row.appendChild(cell);
        });
        histDiv.appendChild(row);
      });
    }
  } catch (err) {
    console.error("Error in updateGhost:", err);
  }
}

/* -----------------------------
   PERIODIC LOOPS
----------------------------- */

setInterval(() => {
  if (!video) return;
  const features = extractFacialFeatures(video);
  ipcRenderer.send("facial-features", features);
}, 100);

setInterval(updateGhost, 100);

/* -----------------------------
   STARTUP
----------------------------- */

window.addEventListener("DOMContentLoaded", () => {
  startWebcam();
  startVisualProcessing();
});