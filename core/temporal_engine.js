class TemporalEngine {
  constructor() {
    this.windowSize = 200; // number of episodes to track
    this.timeline = [];
  }

  ingestEpisode(ep) {
    this.timeline.push({
      timestamp: ep.timestamp,
      type: ep.type,
      anomaly: ep.anomaly || 0,
      mood: ep.mood || "neutral",
      emotionalWeight: ep.emotionalWeight || 0,
      baseline: ep.baseline || 0
    });

    if (this.timeline.length > this.windowSize) {
      this.timeline.shift();
    }
  }

  buildSummary() {
    if (this.timeline.length === 0) {
      return {
        count: 0,
        moodTrend: 0,
        anomalyTrend: 0,
        dreamFrequency: 0,
        baselineShift: 0
      };
    }

    const moods = this.timeline.map(e => e.emotionalWeight || 0);
    const anomalies = this.timeline.map(e => e.anomaly || 0);
    const baselines = this.timeline.map(e => e.baseline || 0);
    const dreams = this.timeline.filter(e => e.type === "dream").length;

    const moodTrend = moods[moods.length - 1] - moods[0];
    const anomalyTrend = anomalies[anomalies.length - 1] - anomalies[0];
    const baselineShift = baselines[baselines.length - 1] - baselines[0];

    return {
      count: this.timeline.length,
      moodTrend,
      anomalyTrend,
      dreamFrequency: dreams / this.timeline.length,
      baselineShift
    };
  }
}

module.exports = { TemporalEngine };