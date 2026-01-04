// core/thought_mapper.js

class ThoughtMapper {
  map(reflection) {
    if (!reflection) {
      return {
        tone: "neutral",
        theme: "stillness",
        seed: "A quiet moment passes."
      };
    }

    const tone = this.pickTone(reflection);
    const theme = this.pickTheme(reflection);
    const seed = this.buildSeed(tone, theme, reflection);

    return { tone, theme, seed };
  }

  pickTone(reflection) {
    const { moodState, anomalyTrend, latentDrift } = reflection;

    // Mood baseline influences tone
    let tone = "neutral";

    if (moodState.emotionality > 0.6) tone = "sensitive";
    if (moodState.curiosity > 0.6) tone = "curious";

    // Anomaly spikes create tension
    if (anomalyTrend.slope > 0.01) tone = "uneasy";
    if (anomalyTrend.slope < -0.01) tone = "calming";

    // Latent volatility adds intensity
    if (latentDrift.volatility > 0.2) tone = "restless";

    return tone;
  }

  pickTheme(reflection) {
    const { attentionFocus, memoryLoad, latentDrift } = reflection;

    // If memory is heavy, theme leans introspective
    if (memoryLoad.feelsHeavy) return "memory";

    // If attention is very focused, theme is clarity
    if (attentionFocus.entropy < 1.0) return "focus";

    // If latent drift is high, theme is change
    if (latentDrift.magnitude > 0.1) return "change";

    // Default: stillness
    return "stillness";
  }

  buildSeed(tone, theme, reflection) {
    // This is a compact “thought seed” that M4.3 will turn into full text
    return {
      tone,
      theme,
      signals: {
        drift: reflection.latentDrift.magnitude,
        volatility: reflection.latentDrift.volatility,
        anomaly: reflection.anomalyTrend.recentAvg,
        memory: reflection.memoryLoad.fillRatio,
        focus: reflection.attentionFocus.dominantIndex,
        style: reflection.moodState.styleHint
      }
    };
  }
}

module.exports = ThoughtMapper;