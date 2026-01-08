// core/visual_sensory_engine.js

// ---------------------------------------------------------
// INTERNAL STATE (encapsulated inside module)
// ---------------------------------------------------------
let lastFrameGray = null;

class VisualSensoryEngine {
  constructor() {
    // ---------------------------------------------------------
    // VERSIONING (Hybrid Semantic + Date)
    // ---------------------------------------------------------
    this.version = "1.0.0-2026.01.08";

    try {
      this.registry = require("../version_registry.json");
    } catch (e) {
      console.warn(
        "VisualSensoryEngine: version_registry.json missing or unreadable. Proceeding without registry validation."
      );
      this.registry = null;
    }

    this._validateVersion();
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["VisualSensoryEngine"];
    if (!expected) {
      console.warn(
        "VisualSensoryEngine: No 'VisualSensoryEngine' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      console.error(
        `VisualSensoryEngine version mismatch: expected ${expected}, got ${this.version}`
      );
      throw new Error("Version mismatch in VisualSensoryEngine");
    }
  }

  // ---------------------------------------------------------
  // SAFE HELPERS
  // ---------------------------------------------------------
  safeVal(v, fallback = 0) {
    return Number.isFinite(v) ? v : fallback;
  }

  safePixel(pixels, idx) {
    const v = pixels[idx];
    return Number.isFinite(v) ? v : 0;
  }

  // ---------------------------------------------------------
  // DOWNSAMPLE TO GRAYSCALE
  // ---------------------------------------------------------
  downsampleToGray(pixels, width, height, targetSize = 32) {
    const result = [];
    const xStep = width / targetSize;
    const yStep = height / targetSize;

    for (let ty = 0; ty < targetSize; ty++) {
      for (let tx = 0; tx < targetSize; tx++) {
        const x = Math.floor(tx * xStep);
        const y = Math.floor(ty * yStep);
        const idx = (y * width + x) * 4;

        const r = this.safePixel(pixels, idx);
        const g = this.safePixel(pixels, idx + 1);
        const b = this.safePixel(pixels, idx + 2);

        const gray = (r + g + b) / 3;
        result.push(gray / 255);
      }
    }

    return result;
  }

  // ---------------------------------------------------------
  // BRIGHTNESS
  // ---------------------------------------------------------
  computeBrightness(grayArray) {
    if (!grayArray.length) return 0;

    let sum = 0;
    for (const v of grayArray) sum += this.safeVal(v, 0);

    return Math.min(1, Math.max(0, sum / grayArray.length));
  }

  // ---------------------------------------------------------
  // MOTION
  // ---------------------------------------------------------
  computeMotion(grayArray) {
    if (!lastFrameGray || lastFrameGray.length !== grayArray.length) {
      lastFrameGray = grayArray.slice();
      return 0;
    }

    let diffSum = 0;
    for (let i = 0; i < grayArray.length; i++) {
      const a = this.safeVal(grayArray[i], 0);
      const b = this.safeVal(lastFrameGray[i], 0);
      diffSum += Math.abs(a - b);
    }

    lastFrameGray = grayArray.slice();

    return Math.min(1, diffSum / grayArray.length);
  }

  // ---------------------------------------------------------
  // EDGE DENSITY (variance)
  // ---------------------------------------------------------
  computeEdgeDensity(grayArray) {
    if (!grayArray.length) return 0;

    const mean = this.computeBrightness(grayArray);

    let varSum = 0;
    for (const v of grayArray) {
      const d = this.safeVal(v, 0) - mean;
      varSum += d * d;
    }

    const variance = varSum / grayArray.length;
    return Math.min(1, Math.max(0, variance));
  }

  // ---------------------------------------------------------
  // ENTROPY
  // ---------------------------------------------------------
  computeEntropy(grayArray, bins = 8) {
    if (!grayArray.length) return 0;

    const counts = new Array(bins).fill(0);

    for (const v of grayArray) {
      const val = this.safeVal(v, 0);
      const idx = Math.min(bins - 1, Math.max(0, Math.floor(val * bins)));
      counts[idx]++;
    }

    let entropy = 0;
    const n = grayArray.length;

    for (const c of counts) {
      if (c <= 0) continue;
      const p = c / n;
      entropy -= p * Math.log2(p);
    }

    const normalized = entropy / Math.log2(bins);
    return Math.min(1, Math.max(0, normalized));
  }

  // ---------------------------------------------------------
  // MAIN ENTRY POINT
  // ---------------------------------------------------------
  processFrame(pixels, width, height) {
    if (!pixels || !width || !height) {
      return {
        version: this.version,
        brightness: 0,
        motion: 0,
        edges: 0,
        entropy: 0
      };
    }

    const gray = this.downsampleToGray(pixels, width, height, 32);

    const brightness = this.computeBrightness(gray);
    const motion = this.computeMotion(gray);
    const edges = this.computeEdgeDensity(gray);
    const entropy = this.computeEntropy(gray);

    const out = {
      version: this.version,
      brightness,
      motion,
      edges,
      entropy
    };

    this._validateOutput(out);
    return out;
  }

  // ---------------------------------------------------------
  // OUTPUT VALIDATION
  // ---------------------------------------------------------
  _validateOutput(out) {
    if (!out || typeof out !== "object") {
      throw new Error("VisualSensoryEngine: invalid output object");
    }

    const fields = ["brightness", "motion", "edges", "entropy"];
    for (let f of fields) {
      if (!Number.isFinite(out[f])) {
        throw new Error(`VisualSensoryEngine: invalid numeric field '${f}'`);
      }
    }
  }
}

module.exports = VisualSensoryEngine;