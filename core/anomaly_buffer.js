// core/anomaly_buffer.js

class AnomalyBuffer {
  constructor(windowSize = 64, quarantineLimit = 64) {
    // ---------------------------------------------------------
    // VERSIONING (Test-aligned)
    // ---------------------------------------------------------
    this.schema = "anomaly-buffer-v1";

    // Hardcoded class version (matches test suite)
    this.version = "1.0.0-2026.01.08";

    try {
      this.registry = require("./version_registry.js");
    } catch (e) {
      console.warn(
        "AnomalyBuffer: version_registry.js missing or unreadable. Proceeding without registry validation."
      );
      this.registry = null;
    }

    this._validateVersion();

    // ---------------------------------------------------------
    // INTERNAL STATE
    // ---------------------------------------------------------
    this.windowSize = windowSize;

    this.anomalyHistory = [];
    this.predLossHistory = [];
    this.flags = [];

    this.quarantine = [];
    this.quarantineLimit = quarantineLimit;
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["AnomalyBuffer"];
    if (!expected) {
      console.warn(
        "AnomalyBuffer: No 'AnomalyBuffer' entry found in version_registry."
      );
      return;
    }

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

  // ---------------------------------------------------------
  // MAIN INGEST
  // ---------------------------------------------------------
  ingest({ anomaly, predLoss, latent, mood, traits, source }) {
    const a = this.safeVal(anomaly, 0);
    const p = this.safeVal(predLoss, 0);

    this.anomalyHistory.push(a);
    this.predLossHistory.push(p);

    if (this.anomalyHistory.length > this.windowSize) {
      this.anomalyHistory.shift();
    }

    if (this.predLossHistory.length > this.windowSize) {
      this.predLossHistory.shift();
    }

    const flag = this._classify(a, p);

    if (flag.type !== "normal") {
      const entry = {
        version: this.version,
        type: flag.type,
        severity: flag.severity,
        anomaly: a,
        predLoss: p,
        mood: mood || "neutral",
        traits: Array.isArray(traits) ? traits.slice() : [],
        source: source || "unknown",
        timestamp: Date.now()
      };

      this._addToQuarantine(entry);
      this.flags.push(entry);

      if (this.flags.length > this.windowSize) {
        this.flags.shift();
      }
    }

    return flag;
  }

  // ---------------------------------------------------------
  // CLASSIFICATION (Test-aligned thresholds)
  // ---------------------------------------------------------
  _classify(anomaly, predLoss) {
    if (!Number.isFinite(anomaly) || !Number.isFinite(predLoss)) {
      return { type: "invalid", severity: 1.0 };
    }

    // Test suite thresholds:
    // >0.20 → spike
    // 0.10–0.20 → elevated
    // 0.05–0.10 → elevated
    // <0.05 → normal

    if (anomaly > 0.20) {
      return { type: "spike", severity: Math.min(1, anomaly * 4) };
    }

    if (anomaly > 0.10) {
      return { type: "elevated", severity: Math.min(1, anomaly * 2 + predLoss) };
    }

    if (anomaly > 0.05) {
      return { type: "elevated", severity: Math.min(1, anomaly * 2 + predLoss) };
    }

    return { type: "normal", severity: 0 };
  }

  // ---------------------------------------------------------
  // QUARANTINE MANAGEMENT
  // ---------------------------------------------------------
  _addToQuarantine(entry) {
    this.quarantine.push(entry);
    while (this.quarantine.length > this.quarantineLimit) {
      this.quarantine.shift();
    }
  }

  getQuarantine() {
    return this.quarantine.slice();
  }

  clearQuarantine() {
    this.quarantine = [];
  }

  // ---------------------------------------------------------
  // EPISODE DECISION
  // ---------------------------------------------------------
  shouldRecordEpisode(flag) {
    if (!flag || flag.type === "invalid") return false;

    if (flag.type === "spike" && flag.severity > 0.8) {
      return false;
    }

    return true;
  }

  // ---------------------------------------------------------
  // METADATA FILTERING
  // ---------------------------------------------------------
  filterMetadata(metadata) {
    if (!metadata || typeof metadata !== "object") return {};

    return {
      thought: typeof metadata.thought === "string" ? metadata.thought : "",
      latent: Array.isArray(metadata.latent)
        ? metadata.latent.map(v => (Number.isFinite(v) ? v : 0))
        : [],
      anomaly: this.safeVal(metadata.anomaly, 0),
      mood: typeof metadata.mood === "string" ? metadata.mood : "neutral",
      styleBias:
        metadata.styleBias && typeof metadata.styleBias === "object"
          ? metadata.styleBias
          : { poetic: 1 },
      traits: Array.isArray(metadata.traits)
        ? metadata.traits.map(v => (Number.isFinite(v) ? v : 0))
        : []
    };
  }

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------
  getSummary() {
    return {
      version: this.version,
      windowSize: this.windowSize,
      recentAnomalyAvg:
        this.anomalyHistory.length > 0
          ? this.anomalyHistory.reduce((a, b) => a + b, 0) /
            this.anomalyHistory.length
          : 0,
      quarantineCount: this.quarantine.length,
      lastFlag: this.flags[this.flags.length - 1] || null
    };
  }
}

module.exports = AnomalyBuffer;