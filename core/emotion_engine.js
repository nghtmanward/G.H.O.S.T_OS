// /core/emotion_engine.js

const mainMemory = require("./main_memory");

class EmotionEngine {
  constructor() {
    this.mood = 0;              // short-term mood (-1 to 1)
    this.baseline = 0;          // long-term mood baseline (-1 to 1)
    this.volatility = 0.12;     // emotional reactivity
    this.driftRate = 0.0008;    // long-term emotional drift
    this.history = [];          // emotional events
    this.maxHistory = 300;      // extended history for temporal arcs
  }

  // ---------------------------------------------------------
  // NEW: Semantic Emotional Influence
  // ---------------------------------------------------------
  semanticInfluence() {
    const tertiary = mainMemory.tertiary || [];
    if (tertiary.length === 0) return 0;

    // strongest long-term memory
    const strongest = [...tertiary].sort((a, b) => b.strength - a.strength)[0];

    // positive themes boost mood, negative themes depress it
    const theme = strongest.theme?.toLowerCase() || "";

    if (theme.includes("hope") || theme.includes("calm") || theme.includes("trust"))
      return +0.05;

    if (theme.includes("fear") || theme.includes("loss") || theme.includes("uncertainty"))
      return -0.05;

    return 0;
  }

  // ---------------------------------------------------------
  // NEW: Temporal Emotional Influence
  // ---------------------------------------------------------
  temporalInfluence(temporalSummary) {
    if (!temporalSummary) return 0;

    let shift = 0;

    // mood trend influences baseline
    shift += (temporalSummary.moodTrend || 0) * 0.1;

    // frequent dreams soften emotional volatility
    if ((temporalSummary.dreamFrequency || 0) > 0.5)
      shift -= 0.02;

    // anomaly trend increases emotional tension
    shift += (temporalSummary.anomalyTrend || 0) * 0.05;

    return shift;
  }

  // ---------------------------------------------------------
  // MAIN UPDATE
  // ---------------------------------------------------------
  update({ anomaly, predLoss, mood, dream = false, temporalSummary = null, traits = [] }) {
    const safeTraits = Array.isArray(traits)
      ? traits.map(v => (isFinite(v) ? v : 0))
      : [0, 0, 0, 0];

    const curiosity = safeTraits[0] || 0;
    const emotionalAmp = safeTraits[2] || 0;
    const vigilance = safeTraits[3] || 0;

    // Emotional intensity from anomaly + prediction error
    let intensity = Math.min(1, anomaly + predLoss);

    // Dreams soften emotional impact
    const weight = dream ? 0.3 : 1.0;

    // Short-term mood shift from external mood label
    const moodShift =
      (mood === "positive" ? 1 : mood === "negative" ? -1 : 0) *
      intensity *
      weight;

    // Personality amplifiers
    const personalityBoost =
      emotionalAmp * 0.2 - vigilance * 0.1 + curiosity * 0.05;

    // Semantic influence
    const semanticShift = this.semanticInfluence();

    // Temporal influence
    const temporalShift = this.temporalInfluence(temporalSummary);

    // Combine all influences
    const totalShift =
      moodShift * this.volatility +
      semanticShift +
      temporalShift +
      personalityBoost;

    this.mood += totalShift;

    // Clamp mood
    this.mood = Math.max(-1, Math.min(1, this.mood));

    // Add to emotional history
    this.history.push({
      mood: this.mood,
      intensity,
      semanticShift,
      temporalShift,
      personalityBoost,
      dream
    });

    if (this.history.length > this.maxHistory) this.history.shift();

    // Long-term baseline drift
    this.baseline += this.mood * this.driftRate;
    this.baseline = Math.max(-1, Math.min(1, this.baseline));

    return {
      mood: this.mood,
      baseline: this.baseline,
      intensity,
      volatility: this.volatility,
      semanticShift,
      temporalShift,
      personalityBoost
    };
  }
}

module.exports = { EmotionEngine };