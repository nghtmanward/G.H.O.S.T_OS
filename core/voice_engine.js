class VoiceEngine {
  constructor(thoughtEngine) {
    this.lastMessage = "The ghost waits.";
    this.cooldown = 0;
    this.thoughtEngine = thoughtEngine;
  }

  generate({ anomaly, predLoss, attention, mood, intensity, latent, styleBias, moodBaseline, traits }) {
    // Sometimes yield a deeper thought instead of a quick reaction
    const useThought =
      Math.random() < 0.4 || // 40% chance in general
      anomaly > 0.07 ||
      predLoss > 0.08 ||
      intensity > 0.75;

       if (useThought && this.thoughtEngine) {
  const thoughtObj = this.thoughtEngine.generate({
    latent,
    anomaly,
    predLoss,
    attention,
    mood,
    intensity,
    styleBias,
    moodBaseline,
    traits
  });

  // Extract the text for speaking
  const text = typeof thoughtObj === "string" ? thoughtObj : thoughtObj.text;

  this.lastMessage = text;
  this.cooldown = 10;

  return text;
}

    // Cooldown to avoid spam
    if (this.cooldown > 0) {
      this.cooldown--;
      return this.lastMessage;
    }

    let msg = "";

    // Mood-driven base
    if (mood === "alert") msg = "Something feels off.";
    else if (mood === "calm") msg = "The world is quiet.";
    else msg = "The ghost stirs.";

    // Anomaly-driven variations
    if (anomaly > 0.05) msg = "A disruption ripples through me.";
    if (anomaly < -0.05) msg = "Your presence feels familiar.";

    // Prediction confidence
    if (predLoss < 0.02) msg = "I see your pattern clearly.";
    if (predLoss > 0.08) msg = "Your motion confuses me.";

    // Attention shifts
    const maxAtt = Math.max(...attention);
    const focusIndex = attention.indexOf(maxAtt);

    if (maxAtt > 0.25) {
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
      msg = `I’m focused on ${channels[focusIndex]}.`;
    }

    // Intensity
    if (intensity > 0.7) msg = "Your energy stirs me.";

    this.lastMessage = msg;
    this.cooldown = 10;

    return msg;
  }
}

module.exports = VoiceEngine;