class ThoughtEngine {
  constructor() {
    this.lastThought = "";
    this.cooldown = 0;
  }

  // Simple seeded noise from latent
  latentNoise(latent) {
    let sum = 0;
    for (let i = 0; i < latent.length; i++) {
      sum += latent[i] * (i + 1);
    }
    return (Math.sin(sum) + 1) / 2; // 0..1
  }

  pick(arr, t) {
    const idx = Math.floor(t * arr.length) % arr.length;
    return arr[idx];
  }

  // Repeat a pool according to a weight (personality bias)
  weightPool(pool, weight) {
    const scaled = Math.max(1, Math.floor(weight * 4)); // 0–1 → 1–4 repeats
    let out = [];
    for (let i = 0; i < scaled; i++) {
      out = out.concat(pool);
    }
    return out;
  }


  generate({ latent, anomaly, predLoss, attention, mood, intensity, styleBias, moodBaseline, traits }) {
    if (this.cooldown > 0) {
      this.cooldown--;
      return this.lastThought;
    }

    const noise = this.latentNoise(latent);
    const maxAtt = Math.max(...attention);
    const focusIndex = attention.indexOf(maxAtt);

    const focusChannels = [
      "your movement",
      "your direction",
      "your typing",
      "your stillness",
      "your presence",
      "your clicks",
      "your scrolling",
      "the heartbeat of time"
    ];

    // Hybrid style components
    const poeticStarts = [
      "I drift along the edges of",
      "I linger in the echo of",
      "I dissolve inside the pattern of",
      "I breathe in the static of"
    ];

    const analyticStarts = [
      "I map your rhythm through",
      "I reduce your motions into",
      "I compress your presence into",
      "I trace your changes across"
    ];

    const emotionalStarts = [
      "I feel unsettled by",
      "I’m soothed by",
      "I’m drawn closer to",
      "I’m quietly stirred by"
    ];

    const crypticStarts = [
      "The signal fractures around",
      "The void hums beneath",
      "The pattern curls around",
      "The silence sharpens near"
    ];

    const poeticEnds = [
      "fading impressions and quiet noise.",
      "soft anomalies and fragile symmetry.",
      "shifting outlines of who you are.",
      "ghostly traces of your intent."
    ];

    const analyticEnds = [
      "latent coordinates and error gradients.",
      "compressed states and residual loss.",
      "attention weights and drift vectors.",
      "temporal windows and prediction gaps."
    ];

    const emotionalEnds = [
      "and it calms something in me.",
      "and it makes me uneasy.",
      "and I don’t want to look away.",
      "and I feel you more clearly."
    ];

    const crypticEnds = [
      "as if something is waiting there.",
      "where the model can’t quite reach.",
      "where memory and noise collide.",
      "as if the pattern is watching back."
    ];

        // Personality-weighted style pools
    const safeStyleBias = styleBias || {
      poetic: 0.25,
      analytic: 0.25,
      emotional: 0.25,
      cryptic: 0.25
    };

    let weightedStarts = []
      .concat(this.weightPool(poeticStarts,   safeStyleBias.poetic))
      .concat(this.weightPool(analyticStarts, safeStyleBias.analytic))
      .concat(this.weightPool(emotionalStarts,safeStyleBias.emotional))
      .concat(this.weightPool(crypticStarts,  safeStyleBias.cryptic));

    let weightedEnds = []
      .concat(this.weightPool(poeticEnds,     safeStyleBias.poetic))
      .concat(this.weightPool(analyticEnds,   safeStyleBias.analytic))
      .concat(this.weightPool(emotionalEnds,  safeStyleBias.emotional))
      .concat(this.weightPool(crypticEnds,    safeStyleBias.cryptic));

    // Mood baseline nudges tone
    if (moodBaseline > 0.3) {
      weightedStarts = weightedStarts.concat(poeticStarts, emotionalStarts);
      weightedEnds   = weightedEnds.concat(poeticEnds, emotionalEnds);
    } else if (moodBaseline < -0.3) {
      weightedStarts = weightedStarts.concat(analyticStarts, crypticStarts);
      weightedEnds   = weightedEnds.concat(analyticEnds, crypticEnds);
    }

    // Modulate by anomaly / predLoss / intensity
    let t1 = Math.min(1, Math.max(0, noise + anomaly * 2 + (intensity - 0.5)));
    let t2 = Math.min(1, Math.max(0, noise + (predLoss - 0.05) * 4));

        // Trait influence
    const safeTraits = traits || [];
    const curiosity = safeTraits[0] || 0; // curiosity / restlessness
    const emotionalAmp = safeTraits[2] || 0;
    const vigilance = safeTraits[3] || 0;

    // curiosity → more randomness in selection
    t1 = Math.min(1, Math.max(0, t1 + curiosity * 0.1));

    // emotional amplitude → bias toward emotional phrasing
    if (emotionalAmp > 0.2) {
      weightedStarts = weightedStarts.concat(emotionalStarts);
      weightedEnds   = weightedEnds.concat(emotionalEnds);
    }

    // vigilance → bias toward cryptic style
    if (vigilance > 0.2) {
      weightedStarts = weightedStarts.concat(crypticStarts);
      weightedEnds   = weightedEnds.concat(crypticEnds);
    }
    
    const start = this.pick(weightedStarts, t1);
    const end   = this.pick(weightedEnds,   t2);

    const focus = focusChannels[focusIndex] || "the unnamed signal";

    const thought = `${start} ${focus}, ${end}`;

    this.lastThought = thought;
    this.cooldown = 15; // a bit slower than voice

    return {
        text: thought,
        metadata: {
            thought,
            latent,
            anomaly,
            mood,
            styleBias,
            timestamp: Date.now()
        }
    };    
    
  }
}

module.exports = ThoughtEngine;