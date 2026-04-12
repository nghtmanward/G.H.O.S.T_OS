class ActionEngine {
  constructor() {
    this.lastAction = {
      type: "internal",
      label: "observe",
      intensity: 0,
      reason: "steady-state"
    };
  }

  safeVal(v, fallback = 0) {
    return Number.isFinite(v) ? v : fallback;
  }

  choose({ thought, mood, intensity, anomaly }) {
    const safeIntensity = this.safeVal(intensity, 0);
    const safeAnomaly = this.safeVal(anomaly, 0);
    const text = typeof thought === "string" ? thought : "";

    let action = {
      type: "internal",
      label: "observe",
      intensity: safeIntensity,
      reason: "steady-state"
    };

    if (safeAnomaly > 0.12) {
      action = {
        type: "internal",
        label: "stabilize",
        intensity: Math.min(1, safeAnomaly),
        reason: "anomaly-spike"
      };
    } else if (safeIntensity > 0.55) {
      action = {
        type: "internal",
        label: "focus",
        intensity: safeIntensity,
        reason: "heightened-activity"
      };
    } else if (mood === "calm" && text.length > 0) {
      action = {
        type: "internal",
        label: "rehearse",
        intensity: Math.max(0.1, safeIntensity),
        reason: "memory-consolidation"
      };
    }

    this.lastAction = action;
    return action;
  }
}

module.exports = ActionEngine;
