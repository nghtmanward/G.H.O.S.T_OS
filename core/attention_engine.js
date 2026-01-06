class AttentionEngine {
  constructor(inputDim = 12) {
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

  for (let i = 0; i < this.inputDim; i++) {
    const contribution = Math.abs(inputVector[i]);
    const delta = improvement * contribution;

    this.utility[i] += Number.isFinite(delta) ? delta : 0;
  }

  const minU = Math.min(...this.utility);
  const shifted = this.utility.map(u =>
    Number.isFinite(u - minU) ? (u - minU + 0.0001) : 0.0001
  );

  const sum = shifted.reduce((a, b) => a + b, 0) || 1;

  this.weights = shifted.map(v => v / sum);

  return this.weights;
  }
}

module.exports = AttentionEngine;