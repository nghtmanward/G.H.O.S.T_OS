// core/facial_emotional_tell_engine.js

class FacialEmotionalTellEngine {
  constructor() {
    this.prev = null;
    this.smooth = {
      valence: 0,
      arousal: 0,
      tension: 0
    };
  }

  update(features) {
    if (!features) {
      return {
        valence: 0,
        arousal: 0,
        tension: 0,
        emotion: "neutral"
      };
    }

    // Basic emotional axes
    const valence = this.computeValence(features);
    const arousal = this.computeArousal(features);
    const tension = this.computeTension(features);

    // Smooth the signals
    this.smooth.valence = 0.8 * this.smooth.valence + 0.2 * valence;
    this.smooth.arousal = 0.8 * this.smooth.arousal + 0.2 * arousal;
    this.smooth.tension = 0.8 * this.smooth.tension + 0.2 * tension;

    const emotion = this.classifyEmotion(
      this.smooth.valence,
      this.smooth.arousal,
      this.smooth.tension
    );

    this.prev = features;

    return {
      valence: this.smooth.valence,
      arousal: this.smooth.arousal,
      tension: this.smooth.tension,
      emotion
    };
  }

  computeValence(f) {
    // Smile → positive, frown → negative
    return (f.smile - f.frown) || 0;
  }

  computeArousal(f) {
    // Eye openness + movement speed
    return (f.eyeOpen + f.motionEnergy) || 0;
  }

  computeTension(f) {
    // Jaw clench + brow tension
    return (f.jawTension + f.browTension) || 0;
  }

  classifyEmotion(valence, arousal, tension) {
    if (tension > 0.6) return "tense";
    if (arousal > 0.6 && valence > 0.2) return "excited";
    if (arousal > 0.6 && valence < -0.2) return "anxious";
    if (valence > 0.3) return "happy";
    if (valence < -0.3) return "sad";
    return "neutral";
  }
}

module.exports = FacialEmotionalTellEngine;