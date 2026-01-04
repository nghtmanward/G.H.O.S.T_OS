class BehaviorEngine {
  constructor() {
    this.mood = "neutral";
    this.intensity = 0;
    this.color = "#00ffff";
    this.text = "The Ghost Stirs...";
  }

  update({ anomaly, predLoss, latent, slow, fast }) {
    // Mood based on anomaly
    if (anomaly > 0.05) this.mood = "alert";
    else if (anomaly < -0.05) this.mood = "calm";
    else this.mood = "neutral";

    // Intensity based on prediction loss
    this.intensity = Math.min(1, predLoss * 4);

    // Color theme
    if (this.mood === "alert") this.color = "#ff00ff";
    else if (this.mood === "calm") this.color = "#00ffaa";
    else this.color = "#00ffff";

    // Text output
    if (this.mood === "alert") {
      this.text = "The ghost senses disruption.";
    } else if (this.mood === "calm") {
      this.text = "The ghost drifts in quiet memory.";
    } else {
      this.text = "The ghost stirs...";
    }

    return {
      mood: this.mood,
      intensity: this.intensity,
      color: this.color,
      text: this.text
    };
  }
}

module.exports = BehaviorEngine;