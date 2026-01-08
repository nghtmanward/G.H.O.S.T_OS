class BehaviorEngine {
  constructor() {
    // ---------------------------------------------------------
    // VERSIONING (Hybrid Semantic + Date)
    // ---------------------------------------------------------
    this.version = "1.0.0-2026.01.08";

    try {
      this.registry = require("../version_registry.json");
    } catch (e) {
      console.warn(
        "BehaviorEngine: version_registry.json missing or unreadable. Proceeding without registry validation."
      );
      this.registry = null;
    }

    this._validateVersion();

    // ---------------------------------------------------------
    // INTERNAL STATE
    // ---------------------------------------------------------
    this.mood = "neutral";
    this.intensity = 0;
    this.color = "#00ffff";
    this.text = "The Ghost Stirs...";
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["BehaviorEngine"];
    if (!expected) {
      console.warn(
        "BehaviorEngine: No 'BehaviorEngine' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      console.error(
        `BehaviorEngine version mismatch: expected ${expected}, got ${this.version}`
      );
      throw new Error("Version mismatch in BehaviorEngine");
    }
  }

  // ---------------------------------------------------------
  // MAIN UPDATE
  // ---------------------------------------------------------
  update({ anomaly, predLoss }) {
    const safeAnomaly = isFinite(anomaly) ? anomaly : 0;
    const safePredLoss = isFinite(predLoss) ? predLoss : 0;

    // Mood based on anomaly
    if (safeAnomaly > 0.05) {
      this.mood = "alert";
    } else if (safeAnomaly < -0.05) {
      this.mood = "calm";
    } else {
      this.mood = "neutral";
    }

    // Intensity based on prediction loss
    this.intensity = Math.min(1, Math.max(0, safePredLoss * 4));

    // Color theme
    if (this.mood === "alert") {
      this.color = "#ff00ff";
    } else if (this.mood === "calm") {
      this.color = "#00ffaa";
    } else {
      this.color = "#00ffff";
    }

    // Text output
    if (this.mood === "alert") {
      this.text = "The ghost senses disruption.";
    } else if (this.mood === "calm") {
      this.text = "The ghost drifts in quiet memory.";
    } else {
      this.text = "The ghost stirs...";
    }

    const out = {
      version: this.version,
      mood: this.mood,
      intensity: this.intensity,
      color: this.color,
      text: this.text
    };

    this._validateOutput(out);
    return out;
  }

  // ---------------------------------------------------------
  // OUTPUT VALIDATION
  // ---------------------------------------------------------
  _validateOutput(out) {
    if (!out || typeof out !== "object") {
      throw new Error("BehaviorEngine: invalid output object");
    }

    if (typeof out.mood !== "string") {
      throw new Error("BehaviorEngine: mood must be a string");
    }

    if (!isFinite(out.intensity)) {
      throw new Error("BehaviorEngine: intensity invalid");
    }

    if (typeof out.color !== "string") {
      throw new Error("BehaviorEngine: color must be a string");
    }

    if (typeof out.text !== "string") {
      throw new Error("BehaviorEngine: text must be a string");
    }
  }
}

module.exports = BehaviorEngine;