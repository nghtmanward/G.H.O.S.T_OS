// core/visual_sensory_engine.js

let lastFrameGray = null;

function downsampleToGray(pixels, width, height, targetSize = 32) {
  const result = [];
  const xStep = width / targetSize;
  const yStep = height / targetSize;

  for (let ty = 0; ty < targetSize; ty++) {
    for (let tx = 0; tx < targetSize; tx++) {
      const x = Math.floor(tx * xStep);
      const y = Math.floor(ty * yStep);
      const idx = (y * width + x) * 4;

      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      const gray = (r + g + b) / 3;
      result.push(gray / 255); // normalize 0–1
    }
  }

  return result;
}

function computeBrightness(grayArray) {
  let sum = 0;
  for (const v of grayArray) sum += v;
  return grayArray.length ? sum / grayArray.length : 0;
}

function computeMotion(grayArray) {
  if (!lastFrameGray || lastFrameGray.length !== grayArray.length) {
    lastFrameGray = grayArray.slice();
    return 0;
  }

  let diffSum = 0;
  for (let i = 0; i < grayArray.length; i++) {
    diffSum += Math.abs(grayArray[i] - lastFrameGray[i]);
  }
  lastFrameGray = grayArray.slice();
  return diffSum / grayArray.length;
}

// simple “edge-ish” measure using variance
function computeEdgeDensity(grayArray) {
  const mean = computeBrightness(grayArray);
  let varSum = 0;
  for (const v of grayArray) {
    const d = v - mean;
    varSum += d * d;
  }
  return grayArray.length ? varSum / grayArray.length : 0;
}

// rough entropy-like measure: bin into a few buckets
function computeEntropy(grayArray, bins = 8) {
  if (!grayArray.length) return 0;
  const counts = new Array(bins).fill(0);
  for (const v of grayArray) {
    const idx = Math.min(bins - 1, Math.floor(v * bins));
    counts[idx]++;
  }
  let entropy = 0;
  const n = grayArray.length;
  for (const c of counts) {
    if (!c) continue;
    const p = c / n;
    entropy -= p * Math.log2(p);
  }
  return entropy / Math.log2(bins); // normalize 0–1
}

// main entry point: pixels/width/height -> sensory vector
function processFrame(pixels, width, height) {
  const gray = downsampleToGray(pixels, width, height, 32);

  const brightness = computeBrightness(gray);
  const motion = computeMotion(gray);
  const edges = computeEdgeDensity(gray);
  const entropy = computeEntropy(gray);

  return {
    brightness, // 0–1
    motion,     // 0–something small
    edges,      // 0–something small
    entropy     // 0–1
  };
}

module.exports = {
  processFrame
};