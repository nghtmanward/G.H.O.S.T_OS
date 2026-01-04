class EpisodicMemory {
  constructor() {
    this.episodes = [];
    this.minSize = 10;
    this.maxSize = 50;
    this.currentLimit = 20; // starts medium
  }

  // Adaptive memory size based on internal state
  adaptMemorySize({ anomaly = 0, moodBaseline = 0, traits = [] } = {}) {
    let target = this.currentLimit;

    // High anomaly → expand memory (ghost becomes more vigilant)
    if (anomaly > 0.05) target += 5;

    // Very low anomaly → shrink memory (ghost becomes dreamy)
    if (anomaly < 0.005) target -= 3;

    // Mood baseline influences memory span
    if (moodBaseline > 0.3) target -= 2;   // bright → lighter memory
    if (moodBaseline < -0.3) target += 2;  // dark → heavier memory

    // Trait influence
    const safeTraits = Array.isArray(traits) ? traits : [0, 0, 0, 0];
    const curiosity = safeTraits[0] || 0;
    const emotionalAmp = safeTraits[2] || 0;

    target += Math.floor(curiosity * 4);      // curious → remembers more
    target += Math.floor(emotionalAmp * 3);   // emotional → holds onto moments

    // Clamp
    target = Math.max(this.minSize, Math.min(this.maxSize, target));

    // Smooth transition
    this.currentLimit = this.currentLimit + (target - this.currentLimit) * 0.1;
  }

  // Compress an episode into a tiny summary
  compressEpisode({ thought, latent = [0], anomaly = 0, mood = "neutral", styleBias = {} }) {
    return {
      text: thought,
      anomaly,
      mood,
      style: this.dominantStyle(styleBias),
      latentMag: this.latentMagnitude(latent),
      timestamp: Date.now()
    };
  }

  latentMagnitude(latent = [0]) {
    if (!Array.isArray(latent) || latent.length === 0) return 0;
    let sum = 0;
    for (let v of latent) sum += Math.abs(v);
    return sum / latent.length;
  }

  dominantStyle(styleBias = {}) {
    let max = -Infinity;
    let key = "poetic";

    for (let k in styleBias) {
      if (styleBias[k] > max) {
        max = styleBias[k];
        key = k;
      }
    }

    return key;
  }

  addEpisode(thought, metadata) {
    if (!metadata) return; // SAFETY FIRST

    // Compress safely
    const compressed = this.compressEpisode({
      thought: metadata.thought || thought,
      latent: Array.isArray(metadata.latent) ? metadata.latent : [0],
      anomaly: metadata.anomaly ?? 0,
      mood: metadata.mood ?? "neutral",
      styleBias: metadata.styleBias || { poetic: 1 }
    });

    this.episodes.push(compressed);

    // Adapt memory size safely
    this.adaptMemorySize(metadata);

    // Trim if needed
    while (this.episodes.length > this.currentLimit) {
      this.episodes.shift();
    }
  }

  getRecentEpisodes() {
    return this.episodes.slice();
  }

  getSummary() {
    return {
      count: this.episodes.length,
      limit: Math.round(this.currentLimit),
      last: this.episodes[this.episodes.length - 1] || null
    };
  }
}

module.exports = EpisodicMemory;