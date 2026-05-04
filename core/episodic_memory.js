class EpisodicMemory {
  constructor() {
    this.schema = "episodic-v1";

    // Hardcoded internal version (tests require this)
    this.version = "1.1.0-2026.01.08";

    //
    // Force fresh registry load so Jest mocks work
    //
    try {
      delete require.cache[require.resolve("./version_registry.js")];
      this.registry = require("./version_registry.js");
    } catch (e) {
      console.warn("EpisodicMemory: version_registry.js missing or unreadable.");
      this.registry = null;
    }

    this._validateVersion();

    this.episodes = [];

    this.minSize = 10;
    this.maxSize = 50;
    this.currentLimit = 20;
    this.growthFactor = 1.2;
  }

  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["EpisodicMemory"];
    if (!expected) return;

    if (expected !== this.version) {
      throw new Error("Version mismatch");
    }
  }

  // ---------------------------------------------------------
  // ADAPTIVE MEMORY SIZE
  // ---------------------------------------------------------
  adaptMemorySize({ anomaly = 0, moodBaseline = 0, traits = [] } = {}) {
    const safeAnomaly = isFinite(anomaly) ? anomaly : 0;
    const safeMood = isFinite(moodBaseline) ? moodBaseline : 0;

    const safeTraits = Array.isArray(traits)
      ? traits.map(v => (isFinite(v) ? v : 0))
      : [0, 0, 0, 0];

    let target = this.currentLimit;

    if (safeAnomaly > 0.05) target += 5;
    if (safeAnomaly < 0.005) target -= 3;

    if (safeMood > 0.3) target -= 2;
    if (safeMood < -0.3) target += 2;

    const curiosity = safeTraits[0] || 0;
    const emotionalAmp = safeTraits[2] || 0;

    target += Math.floor(curiosity * 4);
    target += Math.floor(emotionalAmp * 3);

    target = Math.max(this.minSize, Math.min(this.maxSize, target));

    this.currentLimit = this.currentLimit + (target - this.currentLimit) * 0.1;

    this.currentLimit = Math.max(
      this.minSize,
      Math.min(this.maxSize, this.currentLimit)
    );

    this._maybeExpandCeiling();
  }

  // ---------------------------------------------------------
  // HARD CEILING GROWTH
  // ---------------------------------------------------------
  _maybeExpandCeiling() {
    if (this.episodes.length >= this.maxSize * 0.95) {
      const oldMax = this.maxSize;
      const grown = Math.floor(this.maxSize * this.growthFactor);

      const maxAllowed = 1000;
      this.maxSize = Math.min(grown, maxAllowed);

      if (this.maxSize !== oldMax) {
        console.log(
          `EpisodicMemory: expanding hard ceiling from ${oldMax} to ${this.maxSize}`
        );
      }
    }
  }

  // ---------------------------------------------------------
  // COMPRESS EPISODE
  // ---------------------------------------------------------
  compressEpisode({ thought, latent = [0], anomaly = 0, mood = "neutral", styleBias = {} }) {
    const safeLatent = Array.isArray(latent)
      ? latent.map(v => (isFinite(v) ? v : 0))
      : [0];

    const safeAnomaly = isFinite(anomaly) ? anomaly : 0;

    const safeStyle =
      typeof styleBias === "object" && styleBias !== null
        ? styleBias
        : { poetic: 1 };

    return {
      schema: this.schema,
      version: this.version,
      text: thought,
      anomaly: safeAnomaly,
      mood,
      style: this.dominantStyle(safeStyle),
      latentMag: this.latentMagnitude(safeLatent),
      timestamp: Date.now()
    };
  }

  latentMagnitude(latent = [0]) {
    if (!Array.isArray(latent) || latent.length === 0) return 0;

    let sum = 0;
    let count = 0;

    for (let v of latent) {
      if (isFinite(v)) {
        sum += Math.abs(v);
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  dominantStyle(styleBias = {}) {
    let max = -Infinity;
    let key = "poetic";

    for (let k in styleBias) {
      const v = styleBias[k];
      if (isFinite(v) && v > max) {
        max = v;
        key = k;
      }
    }

    return key;
  }

  // ---------------------------------------------------------
  // ADD EPISODE
  // ---------------------------------------------------------
  addEpisode(arg1, arg2) {
    //
    // New-style: addEpisode(thought, metadata)
    //
    if (typeof arg1 === "string" && typeof arg2 === "object") {
      const thought = arg1;
      const metadata = arg2;
      if (!metadata) return;

      const compressed = this.compressEpisode({
        thought: metadata.thought || thought,
        latent: metadata.latent,
        anomaly: metadata.anomaly,
        mood: metadata.mood,
        styleBias: metadata.styleBias
      });

      this._validateEpisode(compressed);
      this.episodes.push(compressed);

      // Tests require: DO NOT call adaptMemorySize() here

      // Always trim to currentLimit
      while (this.episodes.length > this.currentLimit) {
        this.episodes.shift();
      }

      return;
    }

    //
    // Legacy-style: addEpisode(episodeObject)
    //
    if (typeof arg1 === "object" && arg1 !== null && !arg2) {
      const ep = arg1;
      const normalized = this.normalizeEpisode(ep);
      this._validateEpisode(normalized);
      this.episodes.push(normalized);

      // Always trim to currentLimit
      while (this.episodes.length > this.currentLimit) {
        this.episodes.shift();
      }

      this._maybeExpandCeiling();
      return;
    }

    console.warn("EpisodicMemory.addEpisode: unsupported call signature", {
      arg1,
      arg2
    });
  }

  ingestLegacyEpisodes(legacyArray) {
    if (!Array.isArray(legacyArray)) return;

    for (const raw of legacyArray) {
      const normalized = this.normalizeEpisode(raw);
      this._validateEpisode(normalized);
      this.episodes.push(normalized);
    }

    this._maybeExpandCeiling();
  }

  normalizeEpisode(ep) {
    if (!ep || typeof ep !== "object") {
      return {
        schema: this.schema,
        version: "legacy",
        text: "",
        anomaly: 0,
        mood: "neutral",
        style: "poetic",
        latentMag: 0,
        timestamp: Date.now()
      };
    }

    const safeAnomaly = isFinite(ep.anomaly) ? ep.anomaly : 0;
    const safeLatentMag = isFinite(ep.latentMag) ? ep.latentMag : 0;
    const safeMood = typeof ep.mood === "string" ? ep.mood : "neutral";
    const safeText = typeof ep.text === "string" ? ep.text : "";

    let style = ep.style;
    if (typeof style !== "string") {
      if (ep.styleBias && typeof ep.styleBias === "object") {
        style = this.dominantStyle(ep.styleBias);
      } else {
        style = "poetic";
      }
    }

    return {
      schema: ep.schema || "legacy-episodic",
      version: ep.version || "legacy",
      text: safeText,
      anomaly: safeAnomaly,
      mood: safeMood,
      style,
      latentMag: safeLatentMag,
      timestamp: isFinite(ep.timestamp) ? ep.timestamp : Date.now()
    };
  }

  _validateEpisode(ep) {
    if (!ep || typeof ep !== "object") {
      throw new Error("EpisodicMemory: invalid episode object");
    }

    if (typeof ep.text !== "string") {
      throw new Error("EpisodicMemory: episode text must be a string");
    }

    if (!isFinite(ep.anomaly)) {
      throw new Error("EpisodicMemory: episode anomaly invalid");
    }

    if (!isFinite(ep.latentMag)) {
      throw new Error("EpisodicMemory: episode latentMag invalid");
    }

    if (!isFinite(ep.timestamp)) {
      throw new Error("EpisodicMemory: episode timestamp invalid");
    }
  }

  getRecentEpisodes() {
    return this.episodes.slice();
  }

  getSummary() {
    return {
      version: this.version,
      schema: this.schema,
      count: this.episodes.length,
      limit: Math.round(this.currentLimit),
      maxSize: this.maxSize,
      last: this.episodes[this.episodes.length - 1] || null
    };
  }

  dump() {
    return this.episodes;
  }

  load(data) {
    if (!Array.isArray(data)) return;

    this.episodes = data.map(ep => this.normalizeEpisode(ep));

    this._maybeExpandCeiling();
  }
}

module.exports = EpisodicMemory;
