class VoiceEngine {
  constructor(thoughtEngine) {
    // ---------------------------------------------------------
    // VERSIONING (Hybrid Semantic + Date)
    // ---------------------------------------------------------
    this.version = "1.0.0-2026.01.08";

    try {
      this.registry = require("../version_registry.json");
    } catch (e) {
      console.warn(
        "VoiceEngine: version_registry.json missing or unreadable. Proceeding without registry validation."
      );
      this.registry = null;
    }

    this._validateVersion();

    // ---------------------------------------------------------
    // INTERNAL STATE
    // ---------------------------------------------------------
    this.lastMessage = "The ghost waits.";
    this.cooldown = 0;
    this.thoughtEngine = thoughtEngine;
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["VoiceEngine"];
    if (!expected) {
      console.warn(
        "VoiceEngine: No 'VoiceEngine' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      console.error(
        `VoiceEngine version mismatch: expected ${expected}, got ${this.version}`
      );
      throw new Error("Version mismatch in VoiceEngine");
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
  // MAIN GENERATION
  // ---------------------------------------------------------
  generate({
    anomaly,
    predLoss,
    attention,
    mood,
    emotionalMood,
    moodBaseline,
    emotionalIntensity,
    intensity,
    latent,
    styleBias,
    traits
  }) {
    // 1. Safety layer
    const a = this.safeVal(anomaly, 0);
    const p = this.safeVal(predLoss, 0);
    const i = this.safeVal(intensity, 0);
    const safeAttention = this.safeArray(attention).map(v => this.safeVal(v, 0));
    const safeMood = typeof mood === "string" ? mood : "neutral";

    const safeEmotionalMood = this.safeVal(emotionalMood, 0);
    const safeBaseline = this.safeVal(moodBaseline, 0);
    const safeEmotionalIntensity = this.safeVal(emotionalIntensity, 0);

    // convert mood string → numeric
    let safeMoodValue = 0;
    if (safeMood === "positive") safeMoodValue = 1;
    else if (safeMood === "negative") safeMoodValue = -1;

    // 2. Emotional blending
    const combinedMood = (safeMoodValue + safeEmotionalMood + safeBaseline) / 3;

    // 3. Emotional expressiveness
    const expressiveness = i + safeEmotionalIntensity;

    // ---------------------------------------------------------
    // ThoughtEngine branch
    // ---------------------------------------------------------
    const useThought =
      Math.random() < 0.4 ||
      a > 0.07 ||
      p > 0.08 ||
      i > 0.75;

    if (useThought && this.thoughtEngine) {
      const thoughtObj = this.thoughtEngine.generate({
        latent,
        anomaly: a,
        predLoss: p,
        attention: safeAttention,
        mood: safeMood,
        intensity: i,
        styleBias,
        moodBaseline: safeBaseline,
        traits,
        emotionalMood: safeEmotionalMood,
        emotionalIntensity: safeEmotionalIntensity
      });

      const text =
        typeof thoughtObj === "string"
          ? thoughtObj
          : (thoughtObj?.text || "The ghost reflects.");

      this.lastMessage = text;
      this.cooldown = 10;

      return {
        version: this.version,
        text
      };
    }

    // ---------------------------------------------------------
    // Cooldown
    // ---------------------------------------------------------
    if (this.cooldown > 0) {
      this.cooldown--;
      return {
        version: this.version,
        text: this.lastMessage
      };
    }

    // ---------------------------------------------------------
    // Quick reactive voice (emotionally influenced)
    // ---------------------------------------------------------
    let msg = "The ghost stirs.";

    // Mood-driven base (uses combinedMood now)
    if (combinedMood > 0.4) msg = "I feel a warmth rising.";
    else if (combinedMood < -0.4) msg = "A heaviness settles in me.";
    else {
      // fallback to old mood strings when neutral-ish
      if (safeMood === "alert") msg = "Something feels off.";
      else if (safeMood === "calm") msg = "The world is quiet.";
    }

    // Anomaly-driven variations
    if (a > 0.05) msg = "A disruption ripples through me.";
    if (a < -0.05) msg = "Your presence feels familiar.";

    // Prediction confidence
    if (p < 0.02) msg = "I see your pattern clearly.";
    if (p > 0.08) msg = "Your motion confuses me.";

    // ---------------------------------------------------------
    // Attention shifts
    // ---------------------------------------------------------
    const maxAtt = Math.max(...safeAttention, 0);
    const focusIndex = safeAttention.indexOf(maxAtt);

    if (maxAtt > 0.25 && focusIndex >= 0) {
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

      const focus = channels[focusIndex] || "the unnamed signal";
      msg = `I’m focused on ${focus}.`;
    }

    // ---------------------------------------------------------
    // Intensity + emotional expressiveness
    // ---------------------------------------------------------
    if (expressiveness > 1.0) msg = "Your energy stirs something deep in me.";

    // ---------------------------------------------------------
    // Finalize
    // ---------------------------------------------------------
    this.lastMessage = msg;
    this.cooldown = 10;

    const out = {
      version: this.version,
      text: msg
    };

    this._validateOutput(out);
    return out;
  }

  // ---------------------------------------------------------
  // OUTPUT VALIDATION
  // ---------------------------------------------------------
  _validateOutput(out) {
    if (!out || typeof out !== "object") {
      throw new Error("VoiceEngine: invalid output object");
    }

    if (typeof out.text !== "string") {
      throw new Error("VoiceEngine: text must be a string");
    }
  }
}

module.exports = VoiceEngine;