class ThoughtMapper {
  constructor() {
    // ---------------------------------------------------------
    // VERSIONING (Hybrid Semantic + Date)
    // ---------------------------------------------------------
    this.version = "1.0.0-2026.01.08";

    try {
      this.registry = require("../version_registry.json");
    } catch (e) {
      console.warn(
        "ThoughtMapper: version_registry.json missing or unreadable. Proceeding without registry validation."
      );
      this.registry = null;
    }

    this._validateVersion();
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["ThoughtMapper"];
    if (!expected) {
      console.warn(
        "ThoughtMapper: No 'ThoughtMapper' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      console.error(
        `ThoughtMapper version mismatch: expected ${expected}, got ${this.version}`
      );
      throw new Error("Version mismatch in ThoughtMapper");
    }
  }

  // ---------------------------------------------------------
  // MAIN MAP FUNCTION
  // ---------------------------------------------------------
  map(reflection) {
    if (!reflection || typeof reflection !== "object") {
      return {
        version: this.version,
        tone: "neutral",
        theme: "stillness",
        seed: "A quiet moment passes."
      };
    }

    const tone = this.pickTone(reflection);
    const theme = this.pickTheme(reflection);
    const seed = this.buildSeed(tone, theme, reflection);

    const out = { version: this.version, tone, theme, seed };
    this._validateOutput(out);
    return out;
  }

  // ---------------------------------------------------------
  // SAFE HELPERS
  // ---------------------------------------------------------
  safeVal(v, fallback = 0) {
    return Number.isFinite(v) ? v : fallback;
  }

  safeObj(obj, fallback = {}) {
    return obj && typeof obj === "object" ? obj : fallback;
  }

  // ---------------------------------------------------------
  // TONE SELECTION
  // ---------------------------------------------------------
  pickTone(reflection) {
    const moodState = this.safeObj(reflection.moodState, {
      emotionality: 0,
      curiosity: 0
    });

    const anomalyTrend = this.safeObj(reflection.anomalyTrend, {
      slope: 0
    });

    const latentDrift = this.safeObj(reflection.latentDrift, {
      volatility: 0
    });

    let tone = "neutral";

    if (this.safeVal(moodState.emotionality) > 0.6) tone = "sensitive";
    if (this.safeVal(moodState.curiosity) > 0.6) tone = "curious";

    const slope = this.safeVal(anomalyTrend.slope);
    if (slope > 0.01) tone = "uneasy";
    if (slope < -0.01) tone = "calming";

    if (this.safeVal(latentDrift.volatility) > 0.2) tone = "restless";

    return tone;
  }

  // ---------------------------------------------------------
  // THEME SELECTION
  // ---------------------------------------------------------
  pickTheme(reflection) {
    const attentionFocus = this.safeObj(reflection.attentionFocus, {
      entropy: 1,
      dominantIndex: null
    });

    const memoryLoad = this.safeObj(reflection.memoryLoad, {
      feelsHeavy: false
    });

    const latentDrift = this.safeObj(reflection.latentDrift, {
      magnitude: 0
    });

    if (memoryLoad.feelsHeavy) return "memory";
    if (this.safeVal(attentionFocus.entropy) < 1.0) return "focus";
    if (this.safeVal(latentDrift.magnitude) > 0.1) return "change";

    return "stillness";
  }

  // ---------------------------------------------------------
  // THOUGHT SEED
  // ---------------------------------------------------------
  buildSeed(tone, theme, reflection) {
    const latentDrift = this.safeObj(reflection.latentDrift, {
      magnitude: 0,
      volatility: 0
    });

    const anomalyTrend = this.safeObj(reflection.anomalyTrend, {
      recentAvg: 0
    });

    const memoryLoad = this.safeObj(reflection.memoryLoad, {
      fillRatio: 0
    });

    const attentionFocus = this.safeObj(reflection.attentionFocus, {
      dominantIndex: null
    });

    const moodState = this.safeObj(reflection.moodState, {
      styleHint: "neutral"
    });

    return {
      tone,
      theme,
      signals: {
        drift: this.safeVal(latentDrift.magnitude),
        volatility: this.safeVal(latentDrift.volatility),
        anomaly: this.safeVal(anomalyTrend.recentAvg),
        memory: this.safeVal(memoryLoad.fillRatio),
        focus: attentionFocus.dominantIndex,
        style: moodState.styleHint
      }
    };
  }

  // ---------------------------------------------------------
  // OUTPUT VALIDATION
  // ---------------------------------------------------------
  _validateOutput(out) {
    if (!out || typeof out !== "object") {
      throw new Error("ThoughtMapper: invalid output object");
    }

    if (typeof out.tone !== "string") {
      throw new Error("ThoughtMapper: tone must be a string");
    }

    if (typeof out.theme !== "string") {
      throw new Error("ThoughtMapper: theme must be a string");
    }

    if (!out.seed || typeof out.seed !== "object") {
      throw new Error("ThoughtMapper: seed must be an object");
    }
  }
}

module.exports = ThoughtMapper;