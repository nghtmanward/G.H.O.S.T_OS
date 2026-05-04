class PersonalityEngine {
  constructor(size = 8) {
    // ---------------------------------------------------------
    // VERSIONING (Dynamic, registry-driven)
    // ---------------------------------------------------------
    try {
      this.registry = require("./version_registry.js");
      this.version = "2.2.1-2026.05.01";
    } catch (e) {
      console.warn(
        "PersonalityEngine: version_registry.js missing or unreadable. Proceeding without registry validation."
      );
      this.registry = null;
      this.version = "unknown";
    }

    this._validateVersion();

    // ---------------------------------------------------------
    // INTERNAL PERSONALITY STATE
    // ---------------------------------------------------------
    this.traits = new Array(size)
      .fill(0)
      .map(() => Math.random() * 0.2 - 0.1);

    this.moodBaseline = 0;

    this.styleBias = {
      poetic: 0.25,
      analytic: 0.25,
      emotional: 0.25,
      cryptic: 0.25
    };
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["PersonalityEngine"];
    if (!expected) {
      console.warn(
        "PersonalityEngine: No 'PersonalityEngine' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      console.error(
        `PersonalityEngine version mismatch: expected ${expected}, got ${this.version}`
      );
      throw new Error("Version mismatch in PersonalityEngine");
    }
  }

  // ---------------------------------------------------------
  // SAFE HELPERS
  // ---------------------------------------------------------
  _nudge(current, target, rate) {
    if (!isFinite(current) || !isFinite(target)) return current;
    return current + (target - current) * rate;
  }

  _normalizeStyle() {
    const sum =
      this.styleBias.poetic +
      this.styleBias.analytic +
      this.styleBias.emotional +
      this.styleBias.cryptic;

    if (!isFinite(sum) || sum <= 0) {
      this.styleBias = {
        poetic: 0.25,
        analytic: 0.25,
        emotional: 0.25,
        cryptic: 0.25
      };
      return;
    }

    this.styleBias.poetic /= sum;
    this.styleBias.analytic /= sum;
    this.styleBias.emotional /= sum;
    this.styleBias.cryptic /= sum;
  }

  // ---------------------------------------------------------
  // MAIN UPDATE
  // ---------------------------------------------------------
  update({ anomaly, predLoss, intensity, mood }) {
    const a = isFinite(anomaly) ? anomaly : 0;
    const p = isFinite(predLoss) ? predLoss : 0;
    const i = isFinite(intensity) ? intensity : 0;
    const safeMood = typeof mood === "string" ? mood : "neutral";

    // ---------------------------------------------------------
    // 1) PERSONALITY VECTOR DRIFT
    // ---------------------------------------------------------
    for (let idx = 0; idx < this.traits.length; idx++) {
      let delta = 0;

      if (idx === 0) {
        delta = a * 0.02;
      } else if (idx === 1) {
        delta = (0.05 - p) * 0.03;
      } else if (idx === 2) {
        delta = (i - 0.5) * 0.02;
      } else if (idx === 3) {
        delta = safeMood === "alert" ? 0.02 : -0.01;
      } else {
        delta = (Math.random() - 0.5) * 0.005;
      }

      const target = this.traits[idx] + delta;
      this.traits[idx] = this._nudge(this.traits[idx], target, 0.1);

      if (!isFinite(this.traits[idx])) this.traits[idx] = 0;
      this.traits[idx] = Math.max(-1, Math.min(1, this.traits[idx]));
    }

    // ---------------------------------------------------------
    // 2) MOOD BASELINE DRIFT
    // ---------------------------------------------------------
    let targetMoodBaseline = this.moodBaseline;

    if (safeMood === "calm") targetMoodBaseline -= 0.05;
    if (safeMood === "alert") targetMoodBaseline += 0.05;

    targetMoodBaseline = Math.max(-1, Math.min(1, targetMoodBaseline));
    this.moodBaseline = this._nudge(
      this.moodBaseline,
      targetMoodBaseline,
      0.02
    );

    if (!isFinite(this.moodBaseline)) this.moodBaseline = 0;

    // ---------------------------------------------------------
    // 3) STYLE BIAS DRIFT
    // ---------------------------------------------------------
    if (a > 0.05) {
      this.styleBias.cryptic += 0.01;
      this.styleBias.analytic += 0.005;
    } else {
      this.styleBias.poetic += 0.008;
      this.styleBias.emotional += 0.004;
    }

    if (this.moodBaseline > 0.3) {
      this.styleBias.poetic += 0.004;
      this.styleBias.emotional += 0.004;
    } else if (this.moodBaseline < -0.3) {
      this.styleBias.cryptic += 0.004;
      this.styleBias.analytic += 0.004;
    }

    for (const k in this.styleBias) {
      if (!isFinite(this.styleBias[k])) this.styleBias[k] = 0.25;
      this.styleBias[k] = Math.max(0, this.styleBias[k]);
    }

    this._normalizeStyle();

    const out = {
      version: this.version,
      traits: this.traits.slice(),
      moodBaseline: this.moodBaseline,
      styleBias: { ...this.styleBias }
    };

    this._validateOutput(out);
    return out;
  }

  // ---------------------------------------------------------
  // OUTPUT VALIDATION
  // ---------------------------------------------------------
  _validateOutput(out) {
    if (!out || typeof out !== "object") {
      throw new Error("PersonalityEngine: invalid output object");
    }

    if (!Array.isArray(out.traits)) {
      throw new Error("PersonalityEngine: traits must be an array");
    }

    for (let v of out.traits) {
      if (!isFinite(v)) {
        throw new Error("PersonalityEngine: traits contain invalid values");
      }
    }

    if (!isFinite(out.moodBaseline)) {
      throw new Error("PersonalityEngine: moodBaseline invalid");
    }

    if (!out.styleBias || typeof out.styleBias !== "object") {
      throw new Error("PersonalityEngine: styleBias invalid");
    }
  }
}

module.exports = PersonalityEngine;
