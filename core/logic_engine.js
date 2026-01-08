class LogicEngine {
  constructor(inputDim, latentDim = 32) {
    this.inputDim = inputDim;
    this.latentDim = latentDim;

    // Layer 1: recent observations
    this.history = [];

    // Lightweight structure vector (no 784×784 matrix)
    this.structure = Array(inputDim).fill(0);

    // Latent field
    this.latent = Array(latentDim).fill(0).map(() => Math.random() * 0.01);

    // Random projection
    this.projection = this._random2D(inputDim, latentDim);
  }

  ingest(inputVector) {
    const clean = this._sanitize(inputVector);

    // Store history
    this.history.push(clean);
    if (this.history.length > 1000) this.history.shift();

    // Update structure
    this._updateStructure(clean);

    // Update latent
    this._updateLatent(clean);

    // Reconstruction + summary
    const reconstruction = this.reconstruct();
    const summary = this.getSummary();

    return { latent: this.latent, reconstruction, summary };
  }

  // ---------------------------------------------------------
  // SANITIZE INPUT
  // ---------------------------------------------------------
  _sanitize(vec) {
    const out = new Array(this.inputDim);
    const len = Math.min(vec.length, this.inputDim);

    for (let i = 0; i < len; i++) {
      const v = vec[i];
      out[i] = isFinite(v) ? v : 0;
    }
    for (let i = len; i < this.inputDim; i++) out[i] = 0;

    return out;
  }

  // ---------------------------------------------------------
  // STRUCTURE UPDATE (lightweight)
  // ---------------------------------------------------------
  _updateStructure(inputVector) {
    for (let i = 0; i < this.inputDim; i++) {
      const v = inputVector[i];
      if (v > 0.5) this.structure[i] += 1;
    }
  }

  // ---------------------------------------------------------
  // LATENT UPDATE
  // ---------------------------------------------------------
  _updateLatent(inputVector) {
    const update = Array(this.latentDim).fill(0);

    for (let j = 0; j < this.latentDim; j++) {
      let sum = 0;
      for (let i = 0; i < this.inputDim; i++) {
        const v = inputVector[i];
        const w = this.projection[i][j];
        if (isFinite(v) && isFinite(w)) sum += v * w;
      }
      update[j] = Math.tanh(sum);
    }

    // Plasticity
    const alpha = 0.1;
    for (let j = 0; j < this.latentDim; j++) {
      this.latent[j] = (1 - alpha) * this.latent[j] + alpha * update[j];
    }

    // Normalize
    const normSq = this.latent.reduce((s, v) => s + v * v, 0);
    const norm = Math.sqrt(normSq) || 1;
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
        const l = this.latent[j];
        const w = this.projection[i][j];
        if (isFinite(l) && isFinite(w)) sum += l * w;
      }
      out[i] = 1 / (1 + Math.exp(-sum));
    }

    return out;
  }

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------
  getSummary() {
    const total = this.structure.reduce((s, v) => s + v, 0) || 1;
    return {
      density: total / this.inputDim
    };
  }

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------
  _random2D(rows, cols) {
    return Array(rows)
      .fill(0)
      .map(() =>
        Array(cols)
          .fill(0)
          .map(() => (Math.random() * 2 - 1) * 0.05)
      );
  }
}

module.exports = LogicEngine;