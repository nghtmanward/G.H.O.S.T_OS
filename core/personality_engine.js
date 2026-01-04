class PersonalityEngine {
  constructor(size = 8) {
    // Core personality vector (small, stable, slowly drifting)
    this.traits = new Array(size).fill(0).map(() => Math.random() * 0.2 - 0.1);

    // Long-term mood baseline and style bias
    this.moodBaseline = 0;      // -1 = gloomy, 0 = neutral, +1 = bright
    this.styleBias = {          // weights over style modes
      poetic: 0.25,
      analytic: 0.25,
      emotional: 0.25,
      cryptic: 0.25
    };
  }

  // Tiny helper to softly move a value toward a target
  _nudge(current, target, rate) {
    return current + (target - current) * rate;
  }

  // Normalize style weights to sum to 1
  _normalizeStyle() {
    const sum =
      this.styleBias.poetic +
      this.styleBias.analytic +
      this.styleBias.emotional +
      this.styleBias.cryptic;

    if (sum === 0) return;
    this.styleBias.poetic   /= sum;
    this.styleBias.analytic /= sum;
    this.styleBias.emotional/= sum;
    this.styleBias.cryptic  /= sum;
  }

  update({ anomaly, predLoss, intensity, mood }) {
    // 1) Personality vector drift
    // Map inputs into small nudges on trait dimensions
    const drift = new Array(this.traits.length).fill(0);

    // Example influences:
    // - anomaly pushes some traits (restlessness, curiosity)
    // - low predLoss pushes others (confidence, clarity)
    // - intensity pushes emotional magnitude
    const a = anomaly;             // can be negative or positive
    const p = predLoss;            // usually small, >= 0
    const i = intensity;           // 0..1

    for (let idx = 0; idx < this.traits.length; idx++) {
      let delta = 0;

      if (idx === 0) {
        // curiosity / restlessness
        delta = a * 0.02;
      } else if (idx === 1) {
        // confidence / clarity
        delta = (0.05 - p) * 0.03;
      } else if (idx === 2) {
        // emotional amplitude
        delta = (i - 0.5) * 0.02;
      } else if (idx === 3) {
        // vigilance (alert vs calm)
        delta = (mood === "alert" ? 0.02 : -0.01);
      } else {
        // weak noise-based drift for remaining traits
        delta = (Math.random() - 0.5) * 0.005;
      }

      this.traits[idx] = this._nudge(this.traits[idx], this.traits[idx] + delta, 0.1);
    }

    // 2) Mood baseline drift
    let targetMoodBaseline = this.moodBaseline;

    if (mood === "calm")  targetMoodBaseline -= 0.05;
    if (mood === "alert") targetMoodBaseline += 0.05;

    // Clamp target
    targetMoodBaseline = Math.max(-1, Math.min(1, targetMoodBaseline));
    this.moodBaseline = this._nudge(this.moodBaseline, targetMoodBaseline, 0.02);

    // 3) Style bias drift (how the ghost prefers to "sound")
    // Use anomaly, predLoss, and mood to slowly bias styles
    if (a > 0.05) {
      // more anomaly → more cryptic / analytic
      this.styleBias.cryptic  += 0.01;
      this.styleBias.analytic += 0.005;
    } else {
      // low anomaly → more poetic / emotional
      this.styleBias.poetic   += 0.008;
      this.styleBias.emotional+= 0.004;
    }

    if (this.moodBaseline > 0.3) {
      // brighter baseline → more poetic / emotional
      this.styleBias.poetic   += 0.004;
      this.styleBias.emotional+= 0.004;
    } else if (this.moodBaseline < -0.3) {
      // darker baseline → more cryptic / analytic
      this.styleBias.cryptic  += 0.004;
      this.styleBias.analytic += 0.004;
    }

    // Normalize style weights
    this._normalizeStyle();

    return {
      traits: this.traits.slice(),
      moodBaseline: this.moodBaseline,
      styleBias: { ...this.styleBias }
    };
  }
}

module.exports = PersonalityEngine;