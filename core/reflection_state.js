// core/reflection_state.js

class ReflectionState {
  constructor() {
    this.historyWindow = 32; // how many timesteps of latent/anomaly we consider
  }

  build({
    latentHistory = [],       // array of latent vectors (recent → last)
    anomalyHistory = [],      // array of anomaly values (recent → last)
    predLossHistory = [],     // array of prediction loss values
    memorySummary = null,     // from episodicMemory.getSummary()
    personality = null,       // { moodBaseline, traits, styleBias }
    attention = []            // current attention weights
  } = {}) {
    const latentDrift = this.computeLatentDrift(latentHistory);
    const anomalyTrend = this.computeTrend(anomalyHistory);
    const lossTrend = this.computeTrend(predLossHistory);
    const attentionFocus = this.computeAttentionFocus(attention);
    const memoryLoad = this.computeMemoryLoad(memorySummary);
    const moodState = this.computeMoodState(personality);

    return {
      latentDrift,      // how “restless” the inner state feels
      anomalyTrend,     // are things getting weirder or calmer
      lossTrend,        // is the world getting more/less predictable
      attentionFocus,   // what the ghost is currently “looking at”
      memoryLoad,       // how full/heavy its memory feels
      moodState,        // distilled mood + traits
      timestamp: Date.now()
    };
  }

  computeLatentDrift(latentHistory) {
    if (!Array.isArray(latentHistory) || latentHistory.length < 2) {
      return { magnitude: 0, volatility: 0 };
    }

    // Use up to historyWindow most recent entries
    const recent = latentHistory.slice(-this.historyWindow);
    let totalDist = 0;
    let maxStep = 0;
    let steps = 0;

    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1];
      const cur = recent[i];
      if (!Array.isArray(prev) || !Array.isArray(cur)) continue;

      const dist = this.euclideanDistance(prev, cur);
      totalDist += dist;
      if (dist > maxStep) maxStep = dist;
      steps++;
    }

    if (steps === 0) return { magnitude: 0, volatility: 0 };

    return {
      magnitude: totalDist / steps, // average movement in latent space
      volatility: maxStep           // biggest single jump
    };
  }

  computeTrend(values) {
    if (!Array.isArray(values) || values.length < 2) {
      return { direction: 0, slope: 0, recentAvg: 0 };
    }

    const recent = values.slice(-this.historyWindow);
    const n = recent.length;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = recent[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const denom = n * sumXX - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const recentAvg = recent.reduce((a, b) => a + b, 0) / n;

    let direction = 0;
    const eps = 1e-4;
    if (slope > eps) direction = 1;
    else if (slope < -eps) direction = -1;

    return { direction, slope, recentAvg };
  }

  computeAttentionFocus(attention) {
    if (!Array.isArray(attention) || attention.length === 0) {
      return {
        dominantIndex: null,
        dominantWeight: 0,
        entropy: 0
      };
    }

    let maxIdx = 0;
    let maxVal = attention[0];
    let sum = 0;
    for (let i = 0; i < attention.length; i++) {
      const v = attention[i] ?? 0;
      sum += v;
      if (v > maxVal) {
        maxVal = v;
        maxIdx = i;
      }
    }

    // Normalize for entropy
    let entropy = 0;
    if (sum > 0) {
      for (let i = 0; i < attention.length; i++) {
        const p = (attention[i] ?? 0) / sum;
        if (p > 0) entropy -= p * Math.log2(p);
      }
    }

    return {
      dominantIndex: maxIdx,
      dominantWeight: maxVal,
      entropy // low entropy = very focused, high entropy = spread out
    };
  }

  computeMemoryLoad(memorySummary) {
    if (!memorySummary) {
      return {
        fillRatio: 0,
        count: 0,
        limit: 0,
        feelsHeavy: false
      };
    }

    const { count = 0, limit = 1 } = memorySummary;
    const safeLimit = limit <= 0 ? 1 : limit;
    const fillRatio = Math.max(0, Math.min(1, count / safeLimit));

    return {
      fillRatio,
      count,
      limit,
      feelsHeavy: fillRatio > 0.8
    };
  }

  computeMoodState(personality) {
    if (!personality) {
      return {
        moodBaseline: 0,
        emotionality: 0,
        curiosity: 0,
        styleHint: "neutral"
      };
    }

    const {
      moodBaseline = 0,
      traits = [],
      styleBias = {}
    } = personality;

    const safeTraits = Array.isArray(traits) ? traits : [0, 0, 0, 0];
    const curiosity = safeTraits[0] || 0;
    const emotionality = safeTraits[2] || 0;

    // Pick dominant style, similar to episodic memory
    let styleHint = "neutral";
    let max = -Infinity;
    for (let k in styleBias || {}) {
      const v = styleBias[k];
      if (typeof v === "number" && v > max) {
        max = v;
        styleHint = k;
      }
    }

    return {
      moodBaseline,
      emotionality,
      curiosity,
      styleHint
    };
  }

  euclideanDistance(a, b) {
    const len = Math.min(a.length, b.length);
    if (len === 0) return 0;
    let sum = 0;
    for (let i = 0; i < len; i++) {
      const da = a[i] ?? 0;
      const db = b[i] ?? 0;
      const d = da - db;
      sum += d * d;
    }
    return Math.sqrt(sum);
  }
}

module.exports = ReflectionState;