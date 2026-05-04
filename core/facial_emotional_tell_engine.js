class FacialEmotionalTellEngine {
  constructor() {
    // ---------------------------------------------------------
    // VERSIONING (Dynamic, registry-driven)
    // ---------------------------------------------------------
    try {
      this.registry = require("./version_registry.js");
      this.version = "1.0.0-2026.01.08";
    } catch (e) {
      console.warn(
        "FacialEmotionalTellEngine: version_registry.js missing or unreadable. Proceeding without registry validation."
      );
      this.registry = null;
      this.version = "unknown";
    }

    this._validateVersion();

    // ---------------------------------------------------------
    // INTERNAL STATE
    // ---------------------------------------------------------
    this.prev = null;
    this.smooth = {
      valence: 0,
      arousal: 0,
      tension: 0
    };
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["FacialEmotionalTellEngine"];
    if (!expected) {
      console.warn(
        "FacialEmotionalTellEngine: No 'FacialEmotionalTellEngine' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      console.error(
        `FacialEmotionalTellEngine version mismatch: expected ${expected}, got ${this.version}`
      );
      throw new Error("Version mismatch in FacialEmotionalTellEngine");
    }
  }

  // ---------------------------------------------------------
  // MAIN UPDATE
  // ---------------------------------------------------------
  update(features) {
    if (!features || typeof features !== "object") {
      return {
        version: this.version,
        valence: 0,
        arousal: 0,
        tension: 0,
        emotion: "neutral"
      };
    }

    const valence = this.safeVal(this.computeValence(features));
    const arousal = this.safeVal(this.computeArousal(features));
    const tension = this.safeVal(this.computeTension(features));

    this.smooth.valence = this.safeVal(
      0.8 * this.smooth.valence + 0.2 * valence
    );
    this.smooth.arousal = this.safeVal(
      0.8 * this.smooth.arousal + 0.2 * arousal
    );
    this.smooth.tension = this.safeVal(
      0.8 * this.smooth.tension + 0.2 * tension
    );

    const emotion = this.classifyEmotion(
      this.smooth.valence,
      this.smooth.arousal,
      this.smooth.tension
    );

    this.prev = features;

    const out = {
      version: this.version,
      valence: this.smooth.valence,
      arousal: this.smooth.arousal,
      tension: this.smooth.tension,
      emotion
    };

    this._validateOutput(out);
    return out;
  }

  // ---------------------------------------------------------
  // SAFE VALUE HANDLER
  // ---------------------------------------------------------
  safeVal(v) {
    return isFinite(v) ? v : 0;
  }

  // ---------------------------------------------------------
  // BASIC EMOTIONAL AXES
  // ---------------------------------------------------------
  computeValence(f) {
    const smile = this.safeVal(f.smile);
    const frown = this.safeVal(f.frown);
    return smile - frown;
  }

  computeArousal(f) {
    const eye = this.safeVal(f.eyeOpen);
    const motion = this.safeVal(f.motionEnergy);
    return eye + motion;
  }

  computeTension(f) {
    const jaw = this.safeVal(f.jawTension);
    const brow = this.safeVal(f.browTension);
    return jaw + brow;
  }

  // ---------------------------------------------------------
  // EMOTION CLASSIFICATION
  // ---------------------------------------------------------
  classifyEmotion(valence, arousal, tension) {
    if (!isFinite(valence) || !isFinite(arousal) || !isFinite(tension)) {
      return "neutral";
    }

    if (tension > 0.6) return "tense";
    if (arousal > 0.6 && valence > 0.2) return "excited";
    if (arousal > 0.6 && valence < -0.2) return "anxious";
    if (valence > 0.3) return "happy";
    if (valence < -0.3) return "sad";
    return "neutral";
  }

  // ---------------------------------------------------------
  // OUTPUT VALIDATION
  // ---------------------------------------------------------
  _validateOutput(out) {
    if (!out || typeof out !== "object") {
      throw new Error("FacialEmotionalTellEngine: invalid output object");
    }

    if (!isFinite(out.valence)) {
      throw new Error("FacialEmotionalTellEngine: valence invalid");
    }

    if (!isFinite(out.arousal)) {
      throw new Error("FacialEmotionalTellEngine: arousal invalid");
    }

    if (!isFinite(out.tension)) {
      throw new Error("FacialEmotionalTellEngine: tension invalid");
    }

    if (typeof out.emotion !== "string") {
      throw new Error("FacialEmotionalTellEngine: emotion must be a string");
    }
  }
}

module.exports = FacialEmotionalTellEngine;
