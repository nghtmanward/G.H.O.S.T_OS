class SyntheticSensoryEngine {
  constructor(size = 12) {
    this.size = size;
    this.phase = 0;
    this.lastVector = Array(this.size).fill(0);
  }

  safeVal(v, fallback = 0) {
    return Number.isFinite(v) ? v : fallback;
  }

  clamp(v, min = 0, max = 1) {
    return Math.max(min, Math.min(max, this.safeVal(v, min)));
  }

  generate({ inputVector = [], temporalSummary = {}, mood = 0, memoryLoad = 0, tick = 0 }) {
    const cleanInput = Array.isArray(inputVector)
      ? inputVector.map((v) => this.clamp(v))
      : [];

    const circadian = this.safeVal(temporalSummary.circadianPhase, 0);
    const moodBias = this.clamp((this.safeVal(mood, 0) + 1) / 2);
    const memoryBias = this.clamp(memoryLoad);

    this.phase = (this.phase + 0.07) % (Math.PI * 2);

    const out = new Array(this.size);
    for (let i = 0; i < this.size; i++) {
      const direct = this.clamp(cleanInput[i] ?? 0);
      const slowWave = (Math.sin(this.phase + i * 0.37) + 1) / 2;
      const fastWave = (Math.cos(this.phase * 1.7 + tick * 0.03 + i * 0.19) + 1) / 2;
      const memoryDrift = this.clamp(memoryBias * (0.15 + i * 0.01));
      const moodDrift = this.clamp(moodBias * 0.2);

      const blended =
        direct * 0.55 +
        slowWave * 0.2 +
        fastWave * 0.15 +
        memoryDrift * 0.05 +
        moodDrift * 0.05;

      out[i] = this.clamp(blended);
    }

    this.lastVector = out.slice();
    return out;
  }
}

module.exports = SyntheticSensoryEngine;
