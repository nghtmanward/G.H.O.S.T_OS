class AttentionEngine {
  constructor(inputDim = 784) {
    this.inputDim = inputDim;

    // ---------------------------------------------------------
    // VERSIONING (Hybrid Semantic + Date)
    // ---------------------------------------------------------
    this.version = "1.0.0-2026.01.08";

    try {
      this.registry = require("../version_registry.json");
    } catch (e) {
      console.warn(
        "AttentionEngine: version_registry.json missing or unreadable. Proceeding without registry validation."
      );
      this.registry = null;
    }

    this._validateVersion();

    // ---------------------------------------------------------
    // INTERNAL STATE
    // ---------------------------------------------------------
    this.weights = Array(this.inputDim).fill(1 / this.inputDim);
    this.utility = Array(this.inputDim).fill(0);
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["AttentionEngine"];
    if (!expected) {
      console.warn(
        "AttentionEngine: No 'AttentionEngine' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      console.error(
        `AttentionEngine version mismatch: expected ${expected}, got ${this.version}`
      );
      throw new Error("Version mismatch in AttentionEngine");
    }
  }

  // ---------------------------------------------------------
  // APPLY ATTENTION
  // ---------------------------------------------------------
  applyAttention(inputVector) {
    if (!Array.isArray(inputVector)) return Array(this.inputDim).fill(0);

    const len = Math.min(inputVector.length, this.weights.length);
    const out = new Array(len);

    for (let i = 0; i < len; i++) {
      const v = inputVector[i];
      const w = this.weights[i];
      out[i] = isFinite(v) && isFinite(w) ? v * w : 0;
    }

    this._validateOutput(out);
    return {
      attended: out,
      weights: this.weights
    };
  }

  // ---------------------------------------------------------
  // UPDATE ATTENTION
  // ---------------------------------------------------------
  updateAttention(inputVector, predLossBefore, predLossAfter) {
    if (!isFinite(predLossBefore) || !isFinite(predLossAfter)) {
      return this.weights;
    }

    const improvement = predLossBefore - predLossAfter;
    const len = Math.min(inputVector.length, this.inputDim);

    for (let i = 0; i < len; i++) {
      const v = inputVector[i];
      const contribution = Math.abs(isFinite(v) ? v : 0);
      const delta = improvement * contribution;

      if (isFinite(delta)) {
        this.utility[i] += delta;
      }
    }

    const minU = Math.min(...this.utility);

    const shifted = this.utility.map(u => {
      const val = u - minU + 0.0001;
      return isFinite(val) ? val : 0.0001;
    });

    const sum = shifted.reduce((a, b) => a + b, 0) || 1;

    this.weights = shifted.map(v => v / sum);

    this._validateOutput(this.weights);
    return this.weights;
  }

  // ---------------------------------------------------------
  // OUTPUT VALIDATION
  // ---------------------------------------------------------
  _validateOutput(arr) {
    if (!Array.isArray(arr)) {
      throw new Error("AttentionEngine: output is not an array");
    }

    for (let v of arr) {
      if (!isFinite(v)) {
        throw new Error("AttentionEngine: output contains invalid values");
      }
    }
  }
}

module.exports = AttentionEngine;