// core/logic_engine.js

class LogicEngine {
  constructor(inputDim, latentDim = 32) {
    this.inputDim = inputDim;
    this.latentDim = latentDim;

    // Layer 1: buffer of recent observations
    this.history = [];

    // Layer 2: co-occurrence / adjacency matrix
    this.structure = this._zeros2D(inputDim, inputDim);

    // Layer 3: latent field (compressed / 3D-ish representation)
    this.latent = Array(latentDim).fill(0).map(() => Math.random() * 0.01);

    // A fixed random projection from input space → latent updates
    this.projection = this._random2D(inputDim, latentDim);
  }

  ingest(inputVector) {
    // 1. store observation
    this.history.push(inputVector);
    if (this.history.length > 1000) this.history.shift();

    // 2. update structure (co-occurrence)
    this._updateStructure(inputVector);

    // 3. update latent field
    this._updateLatent(inputVector);

    // 4. produce recon / prediction skeletons
    const reconstruction = this.reconstruct();
    const summary = this.getSummary();

    return { latent: this.latent, reconstruction, summary };
  }

  _updateStructure(inputVector) {
    // simple co-occurrence statistic
    for (let i = 0; i < this.inputDim; i++) {
      if (!inputVector[i]) continue;
      for (let j = 0; j < this.inputDim; j++) {
        if (!inputVector[j]) continue;
        this.structure[i][j] += 1;
      }
    }
  }

  _updateLatent(inputVector) {
    // project input into latent update
    const update = Array(this.latentDim).fill(0);

    for (let j = 0; j < this.latentDim; j++) {
      let sum = 0;
      for (let i = 0; i < this.inputDim; i++) {
        sum += inputVector[i] * this.projection[i][j];
      }
      update[j] = Math.tanh(sum);
    }

    // simple plasticity: latent drifts toward update
    const alpha = 0.1; // learning rate
    for (let j = 0; j < this.latentDim; j++) {
      this.latent[j] = (1 - alpha) * this.latent[j] + alpha * update[j];
    }

    // optional: normalize latent magnitude
    const norm = Math.sqrt(this.latent.reduce((s, v) => s + v * v, 0)) || 1;
    this.latent = this.latent.map(v => v / norm);
  }

  reconstruct() {
    // map latent back to input space (rough "decompression")
    const recon = Array(this.inputDim).fill(0);
    for (let i = 0; i < this.inputDim; i++) {
      let sum = 0;
      for (let j = 0; j < this.latentDim; j++) {
        sum += this.latent[j] * this.projection[i][j]; // reuse transposed
      }
      recon[i] = 1 / (1 + Math.exp(-sum)); // sigmoid
    }
    return recon;
  }

  getSummary() {
    // simple structural summary for debugging:
    // - which pairs co-occur a lot
    // - maybe a low-rank sense of structure
    const total = this.structure.flat().reduce((s, v) => s + v, 0) || 1;
    return {
      density: total / (this.inputDim * this.inputDim),
      // could add more later (top pairs, clusters, etc.)
    };
  }

  _zeros2D(rows, cols) {
    return Array(rows).fill(0).map(() => Array(cols).fill(0));
  }

  _random2D(rows, cols) {
    return Array(rows)
      .fill(0)
      .map(() => Array(cols).fill(0).map(() => (Math.random() * 2 - 1) * 0.1));
  }
}

module.exports = LogicEngine;