class CompressionEngine {
  constructor(inputDim = 784, latentDim = 32) {
    this.inputDim = inputDim;
    this.latentDim = latentDim;

    // Local module version (Hybrid Semantic + Date)
    this.version = "1.0.0-2026.01.08";

    // Central registry reference (expects a "Compression" entry)
    try {
      this.registry = require("./version_registry.json");
    } catch (e) {
      console.warn(
        "CompressionEngine: version_registry.json not found or unreadable. Proceeding without central registry validation."
      );
      this.registry = null;
    }

    // Validate version on startup (if registry is available)
    this._validateVersion();

    // Multi‑scale latent channels
    this.fast = Array(this.latentDim).fill(0);
    this.slow = Array(this.latentDim).fill(0);
    this.slowRate = 0.01;

    // Combined latent
    this.latent = Array(this.latentDim).fill(0);

    // Structure matrix (co‑occurrence, lightweight)
    this.structure = Array(this.inputDim)
      .fill(0)
      .map(() => Array(this.inputDim).fill(0));

    // Projection matrix: inputDim × latentDim
    this.proj = Array(this.inputDim)
      .fill(0)
      .map(() =>
        Array(this.latentDim)
          .fill(0)
          .map(() => (Math.random() * 2 - 1) * 0.05)
      );

    this.learningRate = 0.001; // slightly lower for 784‑dim stability

    // Prediction loss history for anomaly detection
    this.predLossHistory = [];
    this.anomaly = 0;

    // Temporal latent history
    this.latentHistory = [];
    this.maxHistory = 50;
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) {
      // No registry available; we already warned in constructor
      return;
    }

    const expected = this.registry["Compression"];
    if (!expected) {
      console.warn(
        "CompressionEngine: No 'Compression' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      console.error(
        `CompressionEngine version mismatch: expected ${expected}, got ${this.version}`
      );
      throw new Error("Version mismatch in CompressionEngine");
    }
  }

  // ---------------------------------------------------------
  // INGEST
  // ---------------------------------------------------------
  ingest(input, nextInput = null) {
    const cleanInput = this._sanitizeInput(input);

    this._updateStructure(cleanInput);
    this._updateLatent(cleanInput);

    const recon = this.reconstruct();
    const prediction = this.predictNext();

    // Train reconstruction
    this._train(cleanInput, recon);

    // Predictive training
    let predLoss = 0;
    if (nextInput) {
      const cleanNext = this._sanitizeInput(nextInput);
      predLoss = this.predictiveLoss(cleanNext, prediction);
      this._trainPredictive(cleanNext, prediction);
      this.computeAnomaly(predLoss);
    }

    // Store latent history
    this.latentHistory.push([...this.latent]);
    if (this.latentHistory.length > this.maxHistory) {
      this.latentHistory.shift();
    }

    // Validate latent output shape and values before returning
    this._validateOutput(this.latent);

    return {
      version: this.version,
      latent: this.latent,
      latent3D: this.getLatent3D(),
      latentHistory: this.latentHistory,
      recon,
      prediction,
      predLoss,
      anomaly: this.anomaly
    };
  }

  // ---------------------------------------------------------
  // SANITIZE INPUT
  // ---------------------------------------------------------
  _sanitizeInput(input) {
    const out = new Array(this.inputDim);

    const len = Math.min(input.length, this.inputDim);
    for (let i = 0; i < len; i++) {
      const v = input[i];
      out[i] = isFinite(v) ? v : 0;
    }
    for (let i = len; i < this.inputDim; i++) {
      out[i] = 0;
    }

    return out;
  }

  // ---------------------------------------------------------
  // STRUCTURE UPDATE (lightweight)
  // ---------------------------------------------------------
  _updateStructure(input) {
    // Increment only diagonal entries for active pixels
    for (let i = 0; i < this.inputDim; i++) {
      const v = input[i];
      if (v > 0.5 && isFinite(v)) {
        this.structure[i][i] += 1;
      }
    }
  }

  // ---------------------------------------------------------
  // MULTI‑SCALE LATENT UPDATE
  // ---------------------------------------------------------
  _updateLatent(input) {
    const update = Array(this.latentDim).fill(0);

    // Project input → update vector
    for (let j = 0; j < this.latentDim; j++) {
      let sum = 0;
      for (let i = 0; i < this.inputDim; i++) {
        const v = input[i];
        const w = this.proj[i][j];
        if (isFinite(v) && isFinite(w)) {
          sum += v * w;
        }
      }
      update[j] = Math.tanh(sum);
    }

    // Fast channel (reactive)
    const alpha = 0.2;
    for (let j = 0; j < this.latentDim; j++) {
      this.fast[j] = (1 - alpha) * this.fast[j] + alpha * update[j];
    }

    // Slow channel (memory)
    for (let j = 0; j < this.latentDim; j++) {
      this.slow[j] =
        (1 - this.slowRate) * this.slow[j] + this.slowRate * update[j];
    }

    // Combine channels
    this.latent = this.fast.map((v, j) => v + this.slow[j]);

    // Normalize
    const normSq = this.latent.reduce(
      (s, v) => (isFinite(v) ? s + v * v : s),
      0
    );
    const norm = Math.sqrt(normSq) || 1;
    this.latent = this.latent.map(v => (isFinite(v) ? v / norm : 0));
  }

  // ---------------------------------------------------------
  // RECONSTRUCTION
  // ---------------------------------------------------------
  reconstruct() {
    const out = Array(this.inputDim).fill(0);

    for (let i = 0; i < this.inputDim; i++) {
      let sum = 0;
      for (let j = 0; j < this.latentDim; j++) {
        const l = this.latent[j];
        const w = this.proj[i][j];
        if (isFinite(l) && isFinite(w)) {
          sum += l * w;
        }
      }
      // Sigmoid
      out[i] = 1 / (1 + Math.exp(-sum));
    }

    return out;
  }

  // ---------------------------------------------------------
  // PREDICTION (same as reconstruction for now)
  // ---------------------------------------------------------
  predictNext() {
    return this.reconstruct();
  }

  // ---------------------------------------------------------
  // LOSSES
  // ---------------------------------------------------------
  loss(original, recon) {
    const len = Math.min(original.length, recon.length);
    if (len === 0) return 0;

    let sum = 0;
    for (let i = 0; i < len; i++) {
      const o = original[i];
      const r = recon[i];
      if (!isFinite(o) || !isFinite(r)) continue;
      const diff = o - r;
      sum += diff * diff;
    }
    return sum / len;
  }

  predictiveLoss(actualNext, predictedNext) {
    const len = Math.min(actualNext.length, predictedNext.length);
    if (len === 0) return 0;

    let sum = 0;
    for (let i = 0; i < len; i++) {
      const a = actualNext[i];
      const p = predictedNext[i];
      if (!isFinite(a) || !isFinite(p)) continue;
      const diff = a - p;
      sum += diff * diff;
    }
    return sum / len;
  }

  // ---------------------------------------------------------
  // TRAINING
  // ---------------------------------------------------------
  _train(input, recon) {
    const len = Math.min(this.inputDim, input.length, recon.length);
    const error = new Array(len);

    for (let i = 0; i < len; i++) {
      const v = input[i];
      const r = recon[i];
      if (!isFinite(v) || !isFinite(r)) {
        error[i] = 0;
      } else {
        error[i] = v - r;
      }
    }

    for (let i = 0; i < len; i++) {
      const e = error[i];
      if (!isFinite(e)) continue;
      for (let j = 0; j < this.latentDim; j++) {
        const l = this.latent[j];
        if (!isFinite(l)) continue;
        this.proj[i][j] += this.learningRate * e * l;
      }
    }
  }

  _trainPredictive(actualNext, predictedNext) {
    const len = Math.min(
      this.inputDim,
      actualNext.length,
      predictedNext.length
    );
    const error = new Array(len);

    for (let i = 0; i < len; i++) {
      const a = actualNext[i];
      const p = predictedNext[i];
      if (!isFinite(a) || !isFinite(p)) {
        error[i] = 0;
      } else {
        error[i] = a - p;
      }
    }

    for (let i = 0; i < len; i++) {
      const e = error[i];
      if (!isFinite(e)) continue;
      for (let j = 0; j < this.latentDim; j++) {
        const l = this.latent[j];
        if (!isFinite(l)) continue;
        this.proj[i][j] += this.learningRate * e * l;
      }
    }
  }

  // ---------------------------------------------------------
  // ANOMALY DETECTION
  // ---------------------------------------------------------
  computeAnomaly(predLoss) {
    const safeLoss = isFinite(predLoss) ? predLoss : 0;

    this.predLossHistory.push(safeLoss);
    if (this.predLossHistory.length > 100) {
      this.predLossHistory.shift();
    }

    const sum = this.predLossHistory.reduce(
      (a, b) => (isFinite(b) ? a + b : a),
      0
    );
    const count =
      this.predLossHistory.filter(v => isFinite(v)).length || 1;
    const avg = sum / count;

    this.anomaly = safeLoss - avg;
    if (!isFinite(this.anomaly)) this.anomaly = 0;

    return this.anomaly;
  }

  // ---------------------------------------------------------
  // OUTPUT VALIDATION
  // ---------------------------------------------------------
  _validateOutput(latent) {
    if (!Array.isArray(latent) || latent.length !== this.latentDim) {
      throw new Error("CompressionEngine: latent vector shape mismatch");
    }

    for (let i = 0; i < latent.length; i++) {
      const v = latent[i];
      if (!isFinite(v)) {
        throw new Error(
          "CompressionEngine: latent vector contains invalid values"
        );
      }
    }
  }

  // ---------------------------------------------------------
  // 3D LATENT
  // ---------------------------------------------------------
  getLatent3D() {
    const w = 4,
      h = 4,
      d = 2;
    const out = [];
    let idx = 0;

    for (let z = 0; z < d; z++) {
      const layer = [];
      for (let y = 0; y < h; y++) {
        const row = [];
        for (let x = 0; x < w; x++) {
          const v = this.latent[idx] ?? 0;
          row.push(v);
          idx++;
        }
        layer.push(row);
      }
      out.push(layer);
    }

    return out;
  }
}

module.exports = CompressionEngine;