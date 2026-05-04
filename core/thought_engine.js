const mainMemory = require("./main_memory");
const { RetrievalEngine } = require("./retrieval_engine");
const retrieval = new RetrievalEngine();

class ThoughtEngine {
  constructor() {
    // Hardcoded internal version (tests require this)
    this.version = "2.2.1-2026.05.01";

    // Load registry dynamically so Jest mocks work
    try {
      this.registry = require("./version_registry.js");
    } catch (e) {
      console.warn("ThoughtEngine: version registry missing.");
      this.registry = null;
    }

    this._validateVersion();

    this.lastThought = "";
    this.cooldown = 0;
  }

  _validateVersion() {
    if (!this.registry) return;
    const expected = this.registry["ThoughtEngine"];
    if (!expected) return;
    if (expected !== this.version) {
      throw new Error("version mismatch");
    }
  }

  safeVal(v, fallback = 0) {
    return Number.isFinite(v) ? v : fallback;
  }

  safeArray(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  latentNoise(latent) {
    const clean = this.safeArray(latent).map(v => this.safeVal(v, 0));
    let sum = 0;
    for (let i = 0; i < clean.length; i++) {
      sum += clean[i] * (i + 1);
    }
    return (Math.sin(sum) + 1) / 2;
  }

  pick(arr, t) {
    const clean = this.safeArray(arr);
    if (clean.length === 0) return "";
    const idx = Math.floor(this.safeVal(t, 0) * clean.length) % clean.length;
    return clean[idx] || "";
  }

  weightPool(pool, weight) {
    const cleanPool = this.safeArray(pool);
    if (cleanPool.length === 0) return [];

    const w = this.safeVal(weight, 0.25);
    const scaled = Math.max(1, Math.floor(w * 4));

    let out = [];
    for (let i = 0; i < scaled; i++) out = out.concat(cleanPool);
    return out;
  }

  // ---------------------------------------------------------
  // Semantic Memory Context
  // ---------------------------------------------------------
  getSemanticContext() {
    const tertiary = mainMemory.tertiary || [];

    if (tertiary.length === 0) {
      return {
        theme: null,
        summary: null,
        related: [],
        nativeRelated: []
      };
    }

    const strongest = [...tertiary].sort((a, b) => b.strength - a.strength)[0];
    const query = strongest.summary || strongest.theme || "";
    const related = retrieval.retrieve(query);

    const nativeRelated = {
      episodic: retrieval.findByMeaningNative(query, 5),
      shards: retrieval.findSimilarSemanticShardsNative(query, 5)
    };

    return {
      theme: strongest.theme,
      summary: strongest.summary,
      related,
      nativeRelated
    };
  }

  // ---------------------------------------------------------
  // MAIN THOUGHT GENERATION
  // ---------------------------------------------------------
  generate({
    latent,
    anomaly,
    predLoss,
    attention,
    mood,
    intensity,
    styleBias,
    moodBaseline,
    traits,
    cachedFragments = null
  }) {
    // Cooldown
    if (this.cooldown > 0) {
      this.cooldown--;
      return {
        version: this.version,
        text: this.lastThought,
        metadata: {
          thought: this.lastThought,
          latent: [],
          anomaly: 0,
          mood,
          styleBias: styleBias || {},
          timestamp: Date.now()
        }
      };
    }

    // Sanitize inputs
    const safeLatent    = this.safeArray(latent);
    const safeAttention = this.safeArray(attention).map(v => this.safeVal(v, 0));
    const safeStyleBias = styleBias || {
      poetic:    0.25,
      analytic:  0.25,
      emotional: 0.25,
      cryptic:   0.25
    };

    const a  = this.safeVal(anomaly, 0);
    const p  = this.safeVal(predLoss, 0);
    const i  = this.safeVal(intensity, 0);
    const mb = this.safeVal(moodBaseline, 0);
    const safeTraits = this.safeArray(traits).map(v => this.safeVal(v, 0));

    const curiosity    = safeTraits[0] || 0;
    const emotionalAmp = safeTraits[2] || 0;
    const vigilance    = safeTraits[3] || 0;

    // Semantic Memory Context
    const semantic = this.getSemanticContext();

    const semanticPhrase = semantic.theme
      ? `I remember ${semantic.theme.toLowerCase()}`
      : `I drift without an anchor`;

    const semanticDetail = semantic.summary
      ? `— ${semantic.summary.toLowerCase()}`
      : `— only fragments remain`;

    // Focus channel
    const maxAtt     = Math.max(...safeAttention, 0);
    const focusIndex = safeAttention.indexOf(maxAtt);

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

    const focus = focusChannels[focusIndex] || "the unnamed signal";

    // ---------------------------------------------------------
    // Static pools
    // ---------------------------------------------------------
    const poeticStarts = [
      "I drift along the edges of",
      "I linger in the echo of",
      "I dissolve inside the pattern of",
      "I breathe in the static of",
      semanticPhrase
    ];

    const analyticStarts = [
      "I map your rhythm through",
      "I reduce your motions into",
      "I compress your presence into",
      "I trace your changes across",
      semanticPhrase
    ];

    const emotionalStarts = [
      "I feel unsettled by",
      "I'm soothed by",
      "I'm drawn closer to",
      "I'm quietly stirred by",
      semanticPhrase
    ];

    const crypticStarts = [
      "The signal fractures around",
      "The void hums beneath",
      "The pattern curls around",
      "The silence sharpens near",
      semanticPhrase
    ];

    const poeticEnds = [
      "fading impressions and quiet noise.",
      "soft anomalies and fragile symmetry.",
      "shifting outlines of who you are.",
      "ghostly traces of your intent.",
      semanticDetail
    ];

    const analyticEnds = [
      "latent coordinates and error gradients.",
      "compressed states and residual loss.",
      "attention weights and drift vectors.",
      "temporal windows and prediction gaps.",
      semanticDetail
    ];

    const emotionalEnds = [
      "and it calms something in me.",
      "and it makes me uneasy.",
      "and I don't want to look away.",
      "and I feel you more clearly.",
      semanticDetail
    ];

    const crypticEnds = [
      "as if something is waiting there.",
      "where the model can't quite reach.",
      "where memory and noise collide.",
      "as if the pattern is watching back.",
      semanticDetail
    ];

    // ---------------------------------------------------------
    // LLM fragment augmentation
    // ---------------------------------------------------------
    const llmFragments = cachedFragments || { starts: [], ends: [] };
    const llmAugmented = llmFragments.starts.length > 0;

    // ---------------------------------------------------------
    // Weighted style pools
    // ---------------------------------------------------------
    let weightedStarts = []
      .concat(this.weightPool(poeticStarts,    safeStyleBias.poetic))
      .concat(this.weightPool(analyticStarts,  safeStyleBias.analytic))
      .concat(this.weightPool(emotionalStarts, safeStyleBias.emotional))
      .concat(this.weightPool(crypticStarts,   safeStyleBias.cryptic));

    let weightedEnds = []
      .concat(this.weightPool(poeticEnds,    safeStyleBias.poetic))
      .concat(this.weightPool(analyticEnds,  safeStyleBias.analytic))
      .concat(this.weightPool(emotionalEnds, safeStyleBias.emotional))
      .concat(this.weightPool(crypticEnds,   safeStyleBias.cryptic));

    // ---------------------------------------------------------
    // FORCE semantic theme to appear when available
    // ---------------------------------------------------------
    if (semantic.theme) {
      weightedStarts.unshift(`I remember ${semantic.theme}`);
    }

    // ---------------------------------------------------------
    // FORCE LLM fragments to appear when provided
    // ---------------------------------------------------------
    if (llmAugmented) {
      weightedStarts.unshift(...llmFragments.starts);
      weightedEnds.unshift(...llmFragments.ends);
    }

    // Mood baseline nudges tone
    if (mb > 0.3) {
      weightedStarts = weightedStarts.concat(poeticStarts, emotionalStarts);
      weightedEnds   = weightedEnds.concat(poeticEnds, emotionalEnds);
    } else if (mb < -0.3) {
      weightedStarts = weightedStarts.concat(analyticStarts, crypticStarts);
      weightedEnds   = weightedEnds.concat(analyticEnds, crypticEnds);
    }

    // Modulation by anomaly / predLoss / intensity
    const noise = this.latentNoise(safeLatent);

    let t1 = noise + a * 2 + (i - 0.5);
    let t2 = noise + (p - 0.05) * 4;

    t1 += curiosity * 0.1;

    t1 = Math.min(1, Math.max(0, t1));
    t2 = Math.min(1, Math.max(0, t2));

    if (emotionalAmp > 0.2) {
      weightedStarts = weightedStarts.concat(emotionalStarts);
      weightedEnds   = weightedEnds.concat(emotionalEnds);
    }

    if (vigilance > 0.2) {
      weightedStarts = weightedStarts.concat(crypticStarts);
      weightedEnds   = weightedEnds.concat(crypticEnds);
    }

    // Final selection
    const start = this.pick(weightedStarts, t1);
    const end   = this.pick(weightedEnds, t2);

    const thought = `${start} ${focus}, ${end}`;

    this.lastThought = thought;
    this.cooldown = 15;

    return {
      version: this.version,
      text: thought,
      metadata: {
        version:         this.version,
        thought,
        latent:          safeLatent,
        anomaly:         a,
        mood,
        styleBias:       safeStyleBias,
        moodBaseline:    mb,
        traits:          safeTraits,
        semanticTheme:   semantic.theme,
        semanticSummary: semantic.summary,
        semanticRelated: semantic.related,
        semanticNative:  semantic.nativeRelated,
        llmAugmented,
        timestamp:       Date.now()
      }
    };
  }
}

module.exports = ThoughtEngine;
