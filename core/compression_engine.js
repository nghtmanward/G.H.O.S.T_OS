// core/compression_engine.js

class CompressionEngine {
  constructor(inputDim = 784, latentDim = 32) {
    this.inputDim = inputDim;
    this.latentDim = latentDim;

    // ---------------------------------------------------------
    // VERSIONING (Test‑aligned)
    // ---------------------------------------------------------
    this.schema = "compression-engine-v1";

    // Hardcoded class version (required for mismatch detection)
    this.version = "1.0.0-2026.01.08";

    try {
      this.registry = require("./version_registry.js");
    } catch (e) {
      console.warn(
        "CompressionEngine: version_registry.js not found or unreadable. Proceeding without central registry validation."
      );
      this.registry = null;
    }

    this._validateVersion();

    // ---------------------------------------------------------
    // INTERNAL STATE
    // ---------------------------------------------------------
    this.fast = Array(this.latentDim).fill(0);
    this.slow = Array(this.latentDim).fill(0);
    this.slowRate = 0.01;

    this.latent = Array(this.latentDim).fill(0);

    this.structure = Array(this.inputDim)
      .fill(0)
      .map(() => Array(this.inputDim).fill(0));

    this.proj = Array(this.inputDim)
      .fill(0)
      .map(() =>
        Array(this.latentDim)
          .fill(0)
          .map(() => (Math.random() * 2 - 1) * 0.05)
      );

    this.learningRate = 0.001;

    this.predLossHistory = [];
    this.anomaly = 0;
    this.lastLoss = 0;
    this.lastPredLoss = 0;

    this.latentHistory = [];
    this.maxHistory = 50;
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["Compression"];
    if (!expected) {
      console.warn(
        "CompressionEngine: No 'Compression' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      throw new Error("Version mismatch");
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
    const loss = this.loss(cleanInput, recon);

    this._train(cleanInput, recon);

    let predLoss = 0;
    if (nextInput) {
      const cleanNext = this._sanitizeInput(nextInput);
      predLoss = this.predictiveLoss(cleanNext, prediction);
      this._trainPredictive(cleanNext, prediction);
      this.computeAnomaly(predLoss);
    }

    this.lastLoss = loss;
    this.lastPredLoss = predLoss;

    this.latentHistory.push([...this.latent]);
    if (this.latentHistory.length > this.maxHistory) {
      this.latentHistory.shift();
    }

    this._validateOutput(this.latent);

    return {
      version: this.version,
      latent: this.latent,
      latent3D: this.getLatent3D(),
      latentHistory: this.latentHistory,
      recon,
      prediction,
      loss,
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
      out[i] = Number.isFinite(v) ? v : 0;
    }
    for (let i = len; i < this.inputDim; i++) {
      out[i] = 0;
    }

    return out;
  }

  // ---------------------------------------------------------
  // STRUCTURE UPDATE
  // ---------------------------------------------------------
  _updateStructure(input) {
    for (let i = 0; i < this.inputDim; i++) {
      const v = input[i];
      if (v > 0.5 && Number.isFinite(v)) {
        this.structure[i][i] += 1;
      }
    }
  }

  // ---------------------------------------------------------
  // MULTI‑SCALE LATENT UPDATE
  // ---------------------------------------------------------
  _updateLatent(input) {
    const update = Array(this.latentDim).fill(0);

    for (let j = 0; j < this.latentDim; j++) {
      let sum = 0;
      for (let i = 0; i < this.inputDim; i++) {
        const v = input[i];
        const w = this.proj[i][j];
        if (Number.isFinite(v) && Number.isFinite(w)) {
          sum += v * w;
        }
      }
      update[j] = Math.tanh(sum);
    }

    const alpha = 0.2;
    for (let j = 0; j < this.latentDim; j++) {
      this.fast[j] = (1 - alpha) * this.fast[j] + alpha * update[j];
    }

    for (let j = 0; j < this.latentDim; j++) {
      this.slow[j] =
        (1 - this.slowRate) * this.slow[j] + this.slowRate * update[j];
    }

    this.latent = this.fast.map((v, j) => v + this.slow[j]);

    this.latent = this._normalize(this.latent);
  }

  // ---------------------------------------------------------
  // PURE JS NORMALIZATION
  // ---------------------------------------------------------
  _normalize(vec) {
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) {
      const v = vec[i];
      if (Number.isFinite(v)) {
        sumSq += v * v;
      }
    }
    const norm = Math.sqrt(sumSq) || 1;
    return vec.map(v => (Number.isFinite(v) ? v / norm : 0));
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
        if (Number.isFinite(l) && Number.isFinite(w)) {
          sum += l * w;
        }
      }
      out[i] = 1 / (1 + Math.exp(-sum));
    }

    return out;
  }

  // ---------------------------------------------------------
  // PREDICTION
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
      if (!Number.isFinite(o) || !Number.isFinite(r)) continue;
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
      if (!Number.isFinite(a) || !Number.isFinite(p)) continue;
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
      error[i] = Number.isFinite(v) && Number.isFinite(r) ? v - r : 0;
    }

    for (let i = 0; i < len; i++) {
      const e = error[i];
      if (!Number.isFinite(e)) continue;
      for (let j = 0; j < this.latentDim; j++) {
        const l = this.latent[j];
        if (!Number.isFinite(l)) continue;
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
      error[i] = Number.isFinite(a) && Number.isFinite(p) ? a - p : 0;
    }

    for (let i = 0; i < len; i++) {
      const e = error[i];
      if (!Number.isFinite(e)) continue;
      for (let j = 0; j < this.latentDim; j++) {
        const l = this.latent[j];
        if (!Number.isFinite(l)) continue;
        this.proj[i][j] += this.learningRate * e * l;
      }
    }
  }

  // ---------------------------------------------------------
  // ANOMALY DETECTION
  // ---------------------------------------------------------
  computeAnomaly(predLoss) {
    const safeLoss = Number.isFinite(predLoss) ? predLoss : 0;

    this.predLossHistory.push(safeLoss);
    if (this.predLossHistory.length > 100) {
      this.predLossHistory.shift();
    }

    const sum = this.predLossHistory.reduce(
      (a, b) => (Number.isFinite(b) ? a + b : a),
      0
    );
    const count =
      this.predLossHistory.filter(v => Number.isFinite(v)).length || 1;
    const avg = sum / count;

    this.anomaly = safeLoss - avg;
    if (!Number.isFinite(this.anomaly)) this.anomaly = 0;

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
      if (!Number.isFinite(v)) {
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

  getLoss() {
    return this.lastLoss;
  }

  getPredictionLoss() {
    return this.lastPredLoss;
  }
}

module.exports = CompressionEngine;