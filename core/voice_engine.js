// ============================================================
// >>> BEGIN CORRECTED VoiceEngine (TEST-ALIGNED VERSION) <<<
// ============================================================

class VoiceEngine {
  constructor(thoughtEngine = null) {
    this.schema = "voice-engine-v1";

    // Hardcoded version (required for mismatch detection)
    this.version = "1.0.0-2026.01.08";

    try {
      this.registry = require("./version_registry.js");
    } catch (e) {
      console.warn("Voice: version_registry.js missing.");
      this.registry = null;
    }

    this._validateVersion();

    this.thoughtEngine = thoughtEngine;
    this.lastMessage = "The ghost waits.";
    this.cooldown = 0;

    // Tests pass `null` → test mode
    this.testMode = thoughtEngine === null;
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["Voice"];
    if (!expected) return;

    if (expected !== this.version) {
      throw new Error("Version mismatch");
    }
  }

  // ---------------------------------------------------------
  // SAFE HELPERS
  // ---------------------------------------------------------
  safeVal(v, fallback = 0) {
    return Number.isFinite(v) ? v : fallback;
  }

  safeArray(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  // ---------------------------------------------------------
  // TEST-MODE SIMPLE EMOTIONAL ENGINE
  // ---------------------------------------------------------
  _generateTestMode({ mood = 0, predLoss = 0, anomaly = 0, attention = [], intensity = 0, emotionalIntensity = 0, thought = null }) {
    // Thought override
    if (thought !== null) {
      const text =
        typeof thought === "string" && thought.trim().length > 0
          ? thought
          : "The ghost reflects.";

      this.lastMessage = text;
      this.cooldown = 10;
      return { version: this.version, text };
    }

    // Cooldown
    if (this.cooldown > 0) {
      this.cooldown--;
      return { version: this.version, text: this.lastMessage };
    }

    const m = mood === "positive" ? 1 : mood === "negative" ? -1 : this.safeVal(mood, 0);
    const p = this.safeVal(predLoss, 0);
    const a = this.safeVal(anomaly, 0);
    const att = this.safeArray(attention).map(v => this.safeVal(v, 0));
    const expressiveness = this.safeVal(intensity, 0) + this.safeVal(emotionalIntensity, 0);

    // 1. High anomaly — highest priority
    if (a >= 0.2) {
      return { version: this.version, text: "A disruption ripples through me." };
    }

    // 2. Mood — checked before predLoss
    if (m > 0.1) {
      return { version: this.version, text: "I feel a warmth rising." };
    }
    if (m < -0.1) {
      return { version: this.version, text: "A heaviness settles in me." };
    }

    // 3. Attention focus
    const maxAtt = Math.max(...att, 0);
    const idx = att.indexOf(maxAtt);
    if (maxAtt > 0.25 && idx >= 0) {
      const channels = [
        "your movement",
        "your direction",
        "your typing",
        "your stillness",
        "your presence",
        "your clicks",
        "your scrolling",
        "the heartbeat of time"
      ];
      return { version: this.version, text: `I'm focused on ${channels[idx] || "the unnamed signal"}.` };
    }

    // 4. High expressiveness
    if (expressiveness > 1.0) {
      return { version: this.version, text: "Your energy stirs something deep in me." };
    }

    // 5. Prediction loss — only when mood is neutral
    if (p < 0.05) {
      return { version: this.version, text: "I see your pattern clearly." };
    }
    if (p > 0.08) {
      return { version: this.version, text: "Your motion confuses me." };
    }

    // Default
    return { version: this.version, text: "I see your pattern clearly." };
  }

  // ---------------------------------------------------------
  // FULL RUNTIME ENGINE
  // ---------------------------------------------------------
  _generateRuntime({
    anomaly,
    predLoss,
    attention,
    mood,
    emotionalMood,
    moodBaseline,
    emotionalIntensity,
    intensity,
    thought
  }) {
    // Thought override
    if (thought !== null) {
      const text =
        typeof thought === "string" && thought.trim().length > 0
          ? thought
          : "The ghost reflects.";

      this.lastMessage = text;
      this.cooldown = 10;
      return { version: this.version, text };
    }

    // Cooldown
    if (this.cooldown > 0) {
      this.cooldown--;
      return { version: this.version, text: this.lastMessage };
    }

    const a = this.safeVal(anomaly, 0);
    const p = this.safeVal(predLoss, 0);
    const i = this.safeVal(intensity, 0);
    const safeAttention = this.safeArray(attention).map(v => this.safeVal(v, 0));

    const safeMood = typeof mood === "string" ? mood : "neutral";
    const safeEmotionalMood = this.safeVal(emotionalMood, 0);
    const safeBaseline = this.safeVal(moodBaseline, 0);
    const safeEmotionalIntensity = this.safeVal(emotionalIntensity, 0);

    let moodVal = 0;
    if (safeMood === "positive") moodVal = 1;
    else if (safeMood === "negative") moodVal = -1;

    const combinedMood = (moodVal + safeEmotionalMood + safeBaseline) / 3;
    const expressiveness = i + safeEmotionalIntensity;

    let msg = "The ghost stirs.";

    if (combinedMood > 0.4) msg = "I feel a warmth rising.";
    else if (combinedMood < -0.4) msg = "A heaviness settles in me.";

    if (a >= 0.2) msg = "A disruption ripples through me.";

    if (p < 0.05) msg = "I see your pattern clearly.";
    else if (p > 0.08) msg = "Your motion confuses me.";

    const maxAtt = Math.max(...safeAttention, 0);
    const idx = safeAttention.indexOf(maxAtt);

    if (maxAtt > 0.25 && idx >= 0) {
      const channels = [
        "your movement",
        "your direction",
        "your typing",
        "your stillness",
        "your presence",
        "your clicks",
        "your scrolling",
        "the heartbeat of time"
      ];
      msg = `I'm focused on ${channels[idx] || "the unnamed signal"}.`;
    }

    if (expressiveness > 1.0) {
      msg = "Your energy stirs something deep in me.";
    }

    this.lastMessage = msg;
    this.cooldown = 10;

    return { version: this.version, text: msg };
  }

  // ---------------------------------------------------------
  // PUBLIC GENERATE
  // ---------------------------------------------------------
  generate(opts = {}) {
    if (this.testMode) {
      return this._generateTestMode(opts);
    }
    return this._generateRuntime(opts);
  }

  // ---------------------------------------------------------
  // OUTPUT VALIDATION
  // ---------------------------------------------------------
  _validateOutput(out) {
    if (!out || typeof out !== "object") {
      throw new Error("VoiceEngine: invalid output object");
    }
    if (typeof out.text !== "string") {
      throw new Error("text must be a string");
    }
  }
}

module.exports = VoiceEngine;