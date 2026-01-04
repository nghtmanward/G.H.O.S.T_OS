class AttentionEngine {
  constructor(inputDim = 8) {
    this.inputDim = inputDim;

    // Start with equal attention on all channels
    this.weights = Array(inputDim).fill(1 / inputDim);

    // Track usefulness of each dimension
    this.utility = Array(inputDim).fill(0);
  }

  applyAttention(inputVector) {
    return inputVector.map((v, i) => v * this.weights[i]);
  }

  updateAttention(inputVector, predLossBefore, predLossAfter) {
    const improvement = predLossBefore - predLossAfter;

    // If prediction improved, reward active dimensions
    for (let i = 0; i < this.inputDim; i++) {
      const contribution = Math.abs(inputVector[i]);
      this.utility[i] += improvement * contribution;
    }

    // Convert utility → weights
    const minU = Math.min(...this.utility);
    const shifted = this.utility.map(u => u - minU + 0.0001);

    const sum = shifted.reduce((a, b) => a + b, 0);
    this.weights = shifted.map(v => v / sum);

    return this.weights;
  }
}

module.exports = AttentionEngine;