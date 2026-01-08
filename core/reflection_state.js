class ReflectionState {
  constructor() {
    // ---------------------------------------------------------
    // VERSIONING (Hybrid Semantic + Date)
    // ---------------------------------------------------------
    this.version = "1.0.0-2026.01.08";

    try {
      this.registry = require("../version_registry.json");
    } catch (e) {
      console.warn(
        "ReflectionState: version_registry.json missing or unreadable. Proceeding without registry validation."
      );
      this.registry = null;
    }

    this._validateVersion();

    // ---------------------------------------------------------
    // INTERNAL SETTINGS
    // ---------------------------------------------------------
    this.historyWindow = 32;
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["ReflectionState"];
    if (!expected) {
      console.warn(
        "ReflectionState: No 'ReflectionState' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      console.error(
        `ReflectionState version mismatch: expected ${expected}, got ${this.version}`
      );
      throw new Error("Version mismatch in ReflectionState");
    }
  }

  // ---------------------------------------------------------
  // MAIN REFLECTION BUILD
  // ---------------------------------------------------------
  build({
    latentHistory = [],
    anomalyHistory = [],
    predLossHistory = [],
    memorySummary = null,
    personality = null,
    attention = []
  } = {}) {
    const latentDrift = this.computeLatentDrift(latentHistory);
    const anomalyTrend = this.computeTrend(anomalyHistory);
    const lossTrend = this.computeTrend(predLossHistory);
    const attentionFocus = this.computeAttentionFocus(attention);
    const memoryLoad = this.computeMemoryLoad(memorySummary);
    const moodState = this.computeMoodState(personality);

    const snapshot = {
      version: this.version,
      latentDrift,
      anomalyTrend,
      lossTrend,
      attentionFocus,
      memoryLoad,
      moodState,
      timestamp: Date.now()
    };

    this._validateSnapshot(snapshot);
    return snapshot;
  }

  // ---------------------------------------------------------
  // SNAPSHOT VALIDATION
  // ---------------------------------------------------------
  _validateSnapshot(s) {
    if (!s || typeof s !== "object") {
      throw new Error("ReflectionState: invalid snapshot object");
    }

    if (!isFinite(s.timestamp)) {
      throw new Error("ReflectionState: invalid timestamp");
    }

    // Validate numeric fields inside nested structures
    const numericChecks = [
      s.latentDrift?.magnitude,
      s.latentDrift?.volatility,
      s.anomalyTrend?.slope,
      s.anomalyTrend?.recentAvg,
      s.lossTrend?.slope,
      s.lossTrend?.recentAvg,
      s.attentionFocus?.dominantWeight,
      s.attentionFocus?.entropy,
      s.memoryLoad?.fillRatio,
      s.memoryLoad?.count,
      s.memoryLoad?.limit,
      s.moodState?.moodBaseline,
      s.moodState?.emotionality,
      s.moodState?.curiosity
    ];

    for (let v of numericChecks) {
      if (v !== undefined && !isFinite(v)) {
        throw new Error("ReflectionState: snapshot contains invalid numeric values");
      }
    }
  }

  // ---------------------------------------------------------
  // LATENT DRIFT
  // ---------------------------------------------------------
  computeLatentDrift(latentHistory) {
    if (!Array.isArray(latentHistory) || latentHistory.length < 2) {
      return { magnitude: 0, volatility: 0 };
    }

    const recent = latentHistory.slice(-this.historyWindow);
    let totalDist = 0;
    let maxStep = 0;
    let steps = 0;

    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1];
      const cur = recent[i];
      if (!Array.isArray(prev) || !Array.isArray(cur)) continue;

      const dist = this.euclideanDistance(prev, cur);
      if (!isFinite(dist)) continue;

      totalDist += dist;
      if (dist > maxStep) maxStep = dist;
      steps++;
    }

    if (steps === 0) return { magnitude: 0, volatility: 0 };

    return {
      magnitude: totalDist / steps,
      volatility: maxStep
    };
  }

  // ---------------------------------------------------------
  // TREND ANALYSIS
  // ---------------------------------------------------------
  computeTrend(values) {
    if (!Array.isArray(values) || values.length < 2) {
      return { direction: 0, slope: 0, recentAvg: 0 };
    }

    const recent = values
      .slice(-this.historyWindow)
      .map(v => (isFinite(v) ? v : 0));

    const n = recent.length;

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;

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

    return {
      direction,
      slope: isFinite(slope) ? slope : 0,
      recentAvg: isFinite(recentAvg) ? recentAvg : 0
    };
  }

  // ---------------------------------------------------------
  // ATTENTION FOCUS
  // ---------------------------------------------------------
  computeAttentionFocus(attention) {
    if (!Array.isArray(attention) || attention.length === 0) {
      return { dominantIndex: null, dominantWeight: 0, entropy: 0 };
    }

    const clean = attention.map(v => (isFinite(v) ? v : 0));

    let maxIdx = 0;
    let maxVal = clean[0];
    let sum = 0;

    for (let i = 0; i < clean.length; i++) {
      const v = clean[i];
      sum += v;
      if (v > maxVal) {
        maxVal = v;
        maxIdx = i;
      }
    }

    let entropy = 0;
    if (sum > 0) {
      for (let i = 0; i < clean.length; i++) {
        const p = clean[i] / sum;
        if (p > 0) entropy -= p * Math.log2(p);
      }
    }

    return {
      dominantIndex: maxIdx,
      dominantWeight: maxVal,
      entropy: isFinite(entropy) ? entropy : 0
    };
  }

  // ---------------------------------------------------------
  // MEMORY LOAD
  // ---------------------------------------------------------
  computeMemoryLoad(memorySummary) {
    if (!memorySummary) {
      return { fillRatio: 0, count: 0, limit: 0, feelsHeavy: false };
    }

    const count = isFinite(memorySummary.count) ? memorySummary.count : 0;
    const limit =
      isFinite(memorySummary.limit) && memorySummary.limit > 0
        ? memorySummary.limit
        : 1;

    const fillRatio = Math.max(0, Math.min(1, count / limit));

    return {
      fillRatio,
      count,
      limit,
      feelsHeavy: fillRatio > 0.8
    };
  }

  // ---------------------------------------------------------
  // MOOD STATE
  // ---------------------------------------------------------
  computeMoodState(personality) {
    if (!personality) {
      return {
        moodBaseline: 0,
        emotionality: 0,
        curiosity: 0,
        styleHint: "neutral"
      };
    }

    const { moodBaseline = 0, traits = [], styleBias = {} } = personality;

    const safeTraits = Array.isArray(traits)
      ? traits.map(v => (isFinite(v) ? v : 0))
      : [0, 0, 0, 0];

    const curiosity = safeTraits[0] || 0;
    const emotionality = safeTraits[2] || 0;

    let styleHint = "neutral";
    let max = -Infinity;

    for (let k in styleBias || {}) {
      const v = styleBias[k];
      if (isFinite(v) && v > max) {
        max = v;
        styleHint = k;
      }
    }

    return {
      moodBaseline: isFinite(moodBaseline) ? moodBaseline : 0,
      emotionality,
      curiosity,
      styleHint
    };
  }

  // ---------------------------------------------------------
  // EUCLIDEAN DISTANCE
  // ---------------------------------------------------------
  euclideanDistance(a, b) {
    const len = Math.min(a.length, b.length);
    if (len === 0) return 0;

    let sum = 0;
    for (let i = 0; i < len; i++) {
      const da = isFinite(a[i]) ? a[i] : 0;
      const db = isFinite(b[i]) ? b[i] : 0;
      const d = da - db;
      sum += d * d;
    }
    return Math.sqrt(sum);
  }
}

module.exports = ReflectionState;