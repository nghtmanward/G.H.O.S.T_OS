const { ipcRenderer } = require('electron');

let video = null;

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

startWebcam();

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

async function updateGhost() {
  const result = await ipcRenderer.invoke('ghost-input');

  console.log("GHOST RESULT:", result);

  const latent = result.latent;
  const latent3D = result.latent3D;
  const history = result.latentHistory;

  const loss = result.loss;
  const predLoss = result.predLoss;
  const anomaly = result.anomaly;
  const behavior = result.behavior;
  const attention = result.attention;

  document.getElementById('ghost-state').innerText = behavior.text;
  document.getElementById('ghost-voice').innerText = result.voice;
  document.documentElement.style.setProperty('--glow-color', behavior.color);

  document.getElementById('loss-display').innerText =
    `Compression Loss: ${loss.toFixed(4)}`;

  document.getElementById('prediction-loss').innerText =
    `Prediction Loss: ${predLoss.toFixed(4)}`;

  document.getElementById('anomaly-display').innerText =
    `Anomaly: ${anomaly.toFixed(4)}`;

  // Attention visualization
  const attDiv = document.getElementById('attention-bars');
  attDiv.innerHTML = '';
  attention.forEach(w => {
    const bar = document.createElement('div');
    bar.className = 'attention-bar';
    bar.style.height = `${w * 100}px`;
    bar.style.background = '#ffaa00';
    attDiv.appendChild(bar);
  });

  // Latent bars
  const container = document.getElementById('latent-visualizer');
  container.innerHTML = '';
  latent.forEach(v => {
    const bar = document.createElement('div');
    bar.className = 'latent-bar';
    bar.style.height = `${Math.abs(v) * 100}px`;
    bar.style.background = v > 0 ? '#00ffff' : '#ff00ff';
    container.appendChild(bar);
  });

  // 3D latent
  const latent3DContainer = document.getElementById('latent-3d-container');
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

  // Latent history
  const histDiv = document.getElementById('latent-history');
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

setInterval(() => {
  if (!video) return;
  const features = extractFacialFeatures(video);
  ipcRenderer.send("facial-features", features);
}, 100);

setInterval(updateGhost, 100);