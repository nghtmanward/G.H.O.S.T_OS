class CompressionEngine {
  constructor(inputDim, latentDim = 32) {
    this.inputDim = inputDim;
    this.latentDim = latentDim;

    // Multi‑scale latent channels
    this.fast = Array(latentDim).fill(0);
    this.slow = Array(latentDim).fill(0);
    this.slowRate = 0.01;

    // Combined latent
    this.latent = Array(latentDim).fill(0);

    // Structure matrix
    this.structure = Array(inputDim).fill(0).map(() =>
      Array(inputDim).fill(0)
    );

    // Projection matrix
    this.proj = Array(inputDim).fill(0).map(() =>
      Array(latentDim).fill(0).map(() => (Math.random() * 2 - 1) * 0.1)
    );

    this.learningRate = 0.01;

    // Prediction loss history for anomaly detection
    this.predLossHistory = [];
    this.anomaly = 0;

    // Temporal latent history
    this.latentHistory = [];
    this.maxHistory = 50;
  }

  // ---------------------------------------------------------
  // INGEST
  // ---------------------------------------------------------
  ingest(input, nextInput = null) {
    this._updateStructure(input);
    this._updateLatent(input);

    const recon = this.reconstruct();
    const prediction = this.predictNext();

    // Train reconstruction
    this._train(input, recon);

    // Predictive training
    let predLoss = 0;
    if (nextInput) {
      predLoss = this.predictiveLoss(nextInput, prediction);
      this._trainPredictive(nextInput, prediction);
      this.computeAnomaly(predLoss);
    }

    // Store latent history
    this.latentHistory.push([...this.latent]);
    if (this.latentHistory.length > this.maxHistory) {
      this.latentHistory.shift();
    }

    return {
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
  // STRUCTURE UPDATE
  // ---------------------------------------------------------
  _updateStructure(input) {
    for (let i = 0; i < this.inputDim; i++) {
      if (!input[i]) continue;
      for (let j = 0; j < this.inputDim; j++) {
        if (!input[j]) continue;
        this.structure[i][j] += 1;
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
        sum += input[i] * this.proj[i][j];
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
      this.slow[j] = (1 - this.slowRate) * this.slow[j] + this.slowRate * update[j];
    }

    // Combine channels
    this.latent = this.fast.map((v, j) => v + this.slow[j]);

    // Normalize
    const norm = Math.sqrt(this.latent.reduce((s, v) => s + v * v, 0)) || 1;
    this.latent = this.latent.map(v => v / norm);
  }

  // ---------------------------------------------------------
  // RECONSTRUCTION
  // ---------------------------------------------------------
  reconstruct() {
    const out = Array(this.inputDim).fill(0);

    for (let i = 0; i < this.inputDim; i++) {
      let sum = 0;
      for (let j = 0; j < this.latentDim; j++) {
        sum += this.latent[j] * this.proj[i][j];
      }
      out[i] = 1 / (1 + Math.exp(-sum));
    }

    return out;
  }

  // ---------------------------------------------------------
  // PREDICTION
  // ---------------------------------------------------------
  predictNext() {
    const out = Array(this.inputDim).fill(0);

    for (let i = 0; i < this.inputDim; i++) {
      let sum = 0;
      for (let j = 0; j < this.latentDim; j++) {
        sum += this.latent[j] * this.proj[i][j];
      }
      out[i] = 1 / (1 + Math.exp(-sum));
    }

    return out;
  }

  // ---------------------------------------------------------
  // LOSSES
  // ---------------------------------------------------------
  loss(original, recon) {
    let sum = 0;
    for (let i = 0; i < original.length; i++) {
      const diff = original[i] - recon[i];
      sum += diff * diff;
    }
    return sum / original.length;
  }

  predictiveLoss(actualNext, predictedNext) {
    let sum = 0;
    for (let i = 0; i < actualNext.length; i++) {
      const diff = actualNext[i] - predictedNext[i];
      sum += diff * diff;
    }
    return sum / actualNext.length;
  }

  // ---------------------------------------------------------
  // TRAINING
  // ---------------------------------------------------------
  _train(input, recon) {
    const error = input.map((v, i) => v - recon[i]);

    for (let i = 0; i < this.inputDim; i++) {
      for (let j = 0; j < this.latentDim; j++) {
        this.proj[i][j] += this.learningRate * error[i] * this.latent[j];
      }
    }
  }

  _trainPredictive(actualNext, predictedNext) {
    const error = actualNext.map((v, i) => v - predictedNext[i]);

    for (let i = 0; i < this.inputDim; i++) {
      for (let j = 0; j < this.latentDim; j++) {
        this.proj[i][j] += this.learningRate * error[i] * this.latent[j];
      }
    }
  }

  // ---------------------------------------------------------
  // ANOMALY DETECTION
  // ---------------------------------------------------------
  computeAnomaly(predLoss) {
    this.predLossHistory.push(predLoss);
    if (this.predLossHistory.length > 100) {
      this.predLossHistory.shift();
    }

    const avg = this.predLossHistory.reduce((a, b) => a + b, 0) /
                this.predLossHistory.length;

    this.anomaly = predLoss - avg;
    return this.anomaly;
  }

  // ---------------------------------------------------------
  // 3D LATENT
  // ---------------------------------------------------------
  getLatent3D() {
    const w = 4, h = 4, d = 2;
    const out = [];
    let idx = 0;

    for (let z = 0; z < d; z++) {
      const layer = [];
      for (let y = 0; y < h; y++) {
        const row = [];
        for (let x = 0; x < w; x++) {
          row.push(this.latent[idx++]);
        }
        layer.push(row);
      }
      out.push(layer);
    }

    return out;
  }
}

module.exports = CompressionEngine;