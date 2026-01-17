class EmotionEngine {
  constructor() {
    this.mood = 0;              // short-term mood (-1 to 1)
    this.baseline = 0;          // long-term mood baseline (-1 to 1)
    this.volatility = 0.1;      // how reactive the ghost is
    this.driftRate = 0.001;     // slow personality drift
    this.history = [];          // recent emotional events
    this.maxHistory = 200;      // cap history size
  }

  update({ anomaly, predLoss, mood, dream = false }) {
    // Emotional intensity from anomaly + prediction error
    const intensity = Math.min(1, anomaly + predLoss);

    // Dream events have softer emotional impact
    const weight = dream ? 0.3 : 1.0;

    // Short-term mood shift
    const delta = (mood === "positive" ? 1 : mood === "negative" ? -1 : 0) 
                  * intensity * weight;

    this.mood += delta * this.volatility;

    // Clamp mood
    this.mood = Math.max(-1, Math.min(1, this.mood));

    // Add to emotional history
    this.history.push({ mood: this.mood, intensity, dream });
    if (this.history.length > this.maxHistory) this.history.shift();

    // Long-term baseline drift
    this.baseline += this.mood * this.driftRate;
    this.baseline = Math.max(-1, Math.min(1, this.baseline));

    return {
      mood: this.mood,
      baseline: this.baseline,
      intensity,
      volatility: this.volatility
    };
  }
}

module.exports = { EmotionEngine };