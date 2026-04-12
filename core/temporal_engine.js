// core/temporal_engine.js

class TemporalEngine {
  constructor() {
    this.lastTick = Date.now();
    this.tickCount = 0;

    // Optional: future expansion
    this.circadianPhase = 0;
    this.cycleLengthMs = 1000 * 60 * 60 * 24; // 24 hours
  }

  // ---------------------------------------------------------
  // MAIN TICK LOOP (required by main.js)
  // ---------------------------------------------------------
  tick(now) {
    this.lastTick = now;
    this.tickCount++;

    // Simple circadian cycle progression
    this.circadianPhase = (now % this.cycleLengthMs) / this.cycleLengthMs;
  }

  // ---------------------------------------------------------
  // OPTIONAL: STATE SNAPSHOT
  // ---------------------------------------------------------
  getState() {
    return {
      lastTick: this.lastTick,
      tickCount: this.tickCount,
      circadianPhase: this.circadianPhase
    };
  }
}

module.exports = { TemporalEngine };