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
  // LENS SELECTION
  // Picks which signal (contradiction / mood / topic) drives this
  // tick's thought, or blends two when they're close in strength.
  // ---------------------------------------------------------
  selectLens(signals, blendThreshold = 0.15) {
    const scored = [
      { name: "contradiction", strength: signals.contradiction?.strength || 0 },
      { name: "mood",          strength: signals.moodSignal?.strength   || 0 },
      { name: "topic",         strength: signals.topicSignal?.strength  || 0 },
    ].sort((a, b) => b.strength - a.strength);

    const [top, second] = scored;

    if (!top || top.strength <= 0) {
      return { mode: "none" };
    }

    if (second && top.strength - second.strength < blendThreshold && second.strength > 0.3) {
      return { mode: "blend", primary: top.name, secondary: second.name };
    }

    return { mode: "single", primary: top.name };
  }

  // ---------------------------------------------------------
  // LENS CONTEXT
  // Resolves the lens decision into actual content: what text to
  // anchor on, what tone to lean toward, and — for the
  // contradiction+mood blend specifically — a pending dream-blend
  // payload for cog_worker to forward to the dreaming engine once
  // dreaming_engine.js gains enqueuePending().
  // ---------------------------------------------------------
  buildLensContext(lens, signals) {
    const isContradictionMoodBlend =
      lens.mode === "blend" &&
      [lens.primary, lens.secondary].sort().join(",") === ["contradiction", "mood"].sort().join(",");

    if (isContradictionMoodBlend) {
      return {
        mode: "noticing",
        text: (signals.contradiction.shardA.text || "").slice(0, 80),
        toneLean: "cryptic",
        pendingDreamBlend: {
          contradiction: signals.contradiction,
          moodSignal: signals.moodSignal,
        },
      };
    }

    switch (lens.primary) {
      case "contradiction":
        return signals.contradiction
          ? {
              mode: "tension",
              text: (signals.contradiction.shardA.text || "").slice(0, 80),
              toneLean: "analytic",
            }
          : { mode: "none" };
      case "mood":
        return signals.moodSignal
          ? {
              mode: "tangent",
              text: (signals.moodSignal.shard.text || "").slice(0, 80),
              toneLean: "poetic",
            }
          : { mode: "none" };
      case "topic":
        return signals.topicSignal
          ? {
              mode: "continuation",
              text: (signals.topicSignal.shard.text || "").slice(0, 80),
              toneLean: "analytic",
            }
          : { mode: "none" };
      default:
        return { mode: "none" };
    }
  }

  // ---------------------------------------------------------
  // Replaces the old mb>0.3 / emotionalAmp>0.2 / vigilance>0.2
  // threshold blocks with one lens-driven nudge.
  // ---------------------------------------------------------
  toneBiasFromLens(lensContext, baseStyleBias) {
    if (!lensContext || !lensContext.toneLean) return baseStyleBias;
    const bumped = { ...baseStyleBias };
    bumped[lensContext.toneLean] = (bumped[lensContext.toneLean] || 0.25) + 0.2;
    return bumped;
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
        pendingDreamBlend: null,
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

    const curiosity = safeTraits[0] || 0;

    // Lens signals — replaces the old tertiary-only getSemanticContext
    const lensQuery = this.lastThought || "existence";
    const signals = retrieval.getLensSignals(lensQuery, { mood, now: Date.now() });
    const lens = this.selectLens(signals);
    const lensContext = this.buildLensContext(lens, signals);

    const biasedStyleBias = this.toneBiasFromLens(lensContext, safeStyleBias);

    const lensPhrase = lensContext.text
      ? `I remember ${lensContext.text.toLowerCase()}`
      : `I drift without an anchor`;

    const lensDetail = lensContext.text
      ? `— ${lensContext.text.toLowerCase()}`
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
      lensPhrase
    ];

    const analyticStarts = [
      "I map your rhythm through",
      "I reduce your motions into",
      "I compress your presence into",
      "I trace your changes across",
      lensPhrase
    ];

    const emotionalStarts = [
      "I feel unsettled by",
      "I'm soothed by",
      "I'm drawn closer to",
      "I'm quietly stirred by",
      lensPhrase
    ];

    const crypticStarts = [
      "The signal fractures around",
      "The void hums beneath",
      "The pattern curls around",
      "The silence sharpens near",
      lensPhrase
    ];

    const poeticEnds = [
      "fading impressions and quiet noise.",
      "soft anomalies and fragile symmetry.",
      "shifting outlines of who you are.",
      "ghostly traces of your intent.",
      lensDetail
    ];

    const analyticEnds = [
      "latent coordinates and error gradients.",
      "compressed states and residual loss.",
      "attention weights and drift vectors.",
      "temporal windows and prediction gaps.",
      lensDetail
    ];

    const emotionalEnds = [
      "and it calms something in me.",
      "and it makes me uneasy.",
      "and I don't want to look away.",
      "and I feel you more clearly.",
      lensDetail
    ];

    const crypticEnds = [
      "as if something is waiting there.",
      "where the model can't quite reach.",
      "where memory and noise collide.",
      "as if the pattern is watching back.",
      lensDetail
    ];

    // ---------------------------------------------------------
    // LLM fragment augmentation
    // ---------------------------------------------------------
    const llmFragments = cachedFragments || { starts: [], ends: [] };
    const llmAugmented = llmFragments.starts.length > 0;

    // ---------------------------------------------------------
    // Weighted style pools — now biased by the lens, not raw input
    // ---------------------------------------------------------
    let weightedStarts = []
      .concat(this.weightPool(poeticStarts,    biasedStyleBias.poetic))
      .concat(this.weightPool(analyticStarts,  biasedStyleBias.analytic))
      .concat(this.weightPool(emotionalStarts, biasedStyleBias.emotional))
      .concat(this.weightPool(crypticStarts,   biasedStyleBias.cryptic));

    let weightedEnds = []
      .concat(this.weightPool(poeticEnds,    biasedStyleBias.poetic))
      .concat(this.weightPool(analyticEnds,  biasedStyleBias.analytic))
      .concat(this.weightPool(emotionalEnds, biasedStyleBias.emotional))
      .concat(this.weightPool(crypticEnds,   biasedStyleBias.cryptic));

    // ---------------------------------------------------------
    // FORCE lens content to appear when available
    // ---------------------------------------------------------
    if (lensContext.text) {
      weightedStarts.unshift(`I remember ${lensContext.text.toLowerCase()}`);
    }

    // ---------------------------------------------------------
    // FORCE LLM fragments to appear when provided
    // ---------------------------------------------------------
    if (llmAugmented) {
      weightedStarts.unshift(...llmFragments.starts);
      weightedEnds.unshift(...llmFragments.ends);
    }

    // Modulation by anomaly / predLoss / intensity
    const noise = this.latentNoise(safeLatent);

    let t1 = noise + a * 2 + (i - 0.5);
    let t2 = noise + (p - 0.05) * 4;

    t1 += curiosity * 0.1;

    t1 = Math.min(1, Math.max(0, t1));
    t2 = Math.min(1, Math.max(0, t2));

    // Final selection
    const start = this.pick(weightedStarts, t1);
    const end   = this.pick(weightedEnds, t2);

    const thought = `${start} ${focus}, ${end}`;

    this.lastThought = thought;
    this.cooldown = 15;

    return {
      version: this.version,
      text: thought,
      pendingDreamBlend: lensContext.pendingDreamBlend || null,
      metadata: {
        version:       this.version,
        thought,
        latent:        safeLatent,
        anomaly:       a,
        mood,
        styleBias:     safeStyleBias,
        moodBaseline:  mb,
        traits:        safeTraits,
        semanticTheme:   lensContext.text || null,
        semanticSummary: lensContext.text || null,
        lensMode:        lensContext.mode,
        llmAugmented,
        timestamp:       Date.now()
      }
    };
  }
}

module.exports = ThoughtEngine;