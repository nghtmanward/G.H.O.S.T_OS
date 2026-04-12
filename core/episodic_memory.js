class EpisodicMemory {
  constructor() {
    // ---------------------------------------------------------
    // VERSIONING (Hybrid Semantic + Date)
    // ---------------------------------------------------------
    this.version = "1.1.0-2026.01.08"; // bumped for schema-aware upgrade
    this.schema = "episodic-v1";

    try {
      this.registry = require("../version_registry.json");
    } catch (e) {
      console.warn(
        "EpisodicMemory: version_registry.json missing or unreadable. Proceeding without registry validation."
      );
      this.registry = null;
    }

    this._validateVersion();

    // ---------------------------------------------------------
    // INTERNAL MEMORY STATE
    // ---------------------------------------------------------
    this.episodes = [];

    // Soft and hard limits
    this.minSize = 10;
    this.maxSize = 50;       // initial hard ceiling
    this.currentLimit = 20;  // soft limit (adaptive)
    this.growthFactor = 1.2; // when we consistently hit the ceiling, expand it
  }

  // ---------------------------------------------------------
  // VERSION VALIDATION
  // ---------------------------------------------------------
  _validateVersion() {
    if (!this.registry) return;

    const expected = this.registry["EpisodicMemory"];
    if (!expected) {
      console.warn(
        "EpisodicMemory: No 'EpisodicMemory' entry found in version_registry."
      );
      return;
    }

    if (expected !== this.version) {
      console.error(
        `EpisodicMemory version mismatch: expected ${expected}, got ${this.version}`
      );
      throw new Error("Version mismatch in EpisodicMemory");
    }
  }

  // ---------------------------------------------------------
  // ADAPTIVE MEMORY SIZE
  // ---------------------------------------------------------
  adaptMemorySize({ anomaly = 0, moodBaseline = 0, traits = [] } = {}) {
    const safeAnomaly = isFinite(anomaly) ? anomaly : 0;
    const safeMood = isFinite(moodBaseline) ? moodBaseline : 0;

    const safeTraits = Array.isArray(traits)
      ? traits.map((v) => (isFinite(v) ? v : 0))
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

    // Clamp target to current hard ceiling
    target = Math.max(this.minSize, Math.min(this.maxSize, target));

    // Smooth transition
    this.currentLimit = this.currentLimit + (target - this.currentLimit) * 0.1;

    // Check if we are consistently at or near the hard ceiling → grow it
    this._maybeExpandCeiling();
  }

  // ---------------------------------------------------------
  // HARD CEILING GROWTH
  // ---------------------------------------------------------
  _maybeExpandCeiling() {
    // If episodes are very close to the hard ceiling, allow growth
    if (this.episodes.length >= this.maxSize * 0.95) {
      const oldMax = this.maxSize;
      const grown = Math.floor(this.maxSize * this.growthFactor);

      // Prevent absurd explosion, but allow gradual growth
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
  // COMPRESS AN EPISODE
  // ---------------------------------------------------------
  compressEpisode({
    thought,
    latent = [0],
    anomaly = 0,
    mood = "neutral",
    styleBias = {},
  }) {
    const safeLatent = Array.isArray(latent)
      ? latent.map((v) => (isFinite(v) ? v : 0))
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
      timestamp: Date.now(),
    };
  }

  // ---------------------------------------------------------
  // LATENT MAGNITUDE
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // STYLE SELECTION
  // ---------------------------------------------------------
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
  // ADD EPISODE (COMPAT + NEW SCHEMA)
  // ---------------------------------------------------------
  addEpisode(arg1, arg2) {
    // New-style call: addEpisode(thought, metadata)
    if (typeof arg1 === "string" && typeof arg2 === "object") {
      const thought = arg1;
      const metadata = arg2;
      if (!metadata) return;

      const compressed = this.compressEpisode({
        thought: metadata.thought || thought,
        latent: metadata.latent,
        anomaly: metadata.anomaly,
        mood: metadata.mood,
        styleBias: metadata.styleBias,
      });

      this._validateEpisode(compressed);
      this.episodes.push(compressed);

      // Adapt memory size safely
      this.adaptMemorySize(metadata);

      // Trim if needed (using soft limit)
      while (this.episodes.length > this.currentLimit) {
        this.episodes.shift();
      }
      return;
    }

    // Old-style call: addEpisode(episodeObject)
    if (typeof arg1 === "object" && arg1 !== null && !arg2) {
      const ep = arg1;
      const normalized = this.normalizeEpisode(ep);
      this._validateEpisode(normalized);
      this.episodes.push(normalized);

      // After ingesting, allow ceiling to grow if needed
      this._maybeExpandCeiling();
      return;
    }

    // Fallback: unsupported signature
    console.warn("EpisodicMemory.addEpisode: unsupported call signature", {
      arg1,
      arg2,
    });
  }

  // ---------------------------------------------------------
  // INGEST LEGACY EPISODES (FROM OLD SAVES)
  // ---------------------------------------------------------
  ingestLegacyEpisodes(legacyArray) {
    if (!Array.isArray(legacyArray)) return;

    for (const raw of legacyArray) {
      const normalized = this.normalizeEpisode(raw);
      this._validateEpisode(normalized);
      this.episodes.push(normalized);
    }

    // After ingesting legacy data, we may be close to the ceiling → allow growth
    this._maybeExpandCeiling();
  }

  // ---------------------------------------------------------
  // NORMALIZE EPISODE (BACKWARD COMPAT)
  // ---------------------------------------------------------
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
        timestamp: Date.now(),
      };
    }

    const safeAnomaly = isFinite(ep.anomaly) ? ep.anomaly : 0;
    const safeLatentMag = isFinite(ep.latentMag) ? ep.latentMag : 0;
    const safeMood = typeof ep.mood === "string" ? ep.mood : "neutral";
    const safeText = typeof ep.text === "string" ? ep.text : "";

    // If old episodes had styleBias or style missing, infer something reasonable
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
      timestamp: isFinite(ep.timestamp) ? ep.timestamp : Date.now(),
    };
  }

  // ---------------------------------------------------------
  // EPISODE VALIDATION
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // RETRIEVAL
  // ---------------------------------------------------------
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
      last: this.episodes[this.episodes.length - 1] || null,
    };
  }

  // ---------------------------------------------------------
  // PERSISTENCE (DUMP + LOAD)
  // ---------------------------------------------------------
  dump() {
    // main.js expects an array of episodes
    return this.episodes;
  }

  load(data) {
    if (!Array.isArray(data)) return;

    // Accept both legacy and new schema episodes
    this.episodes = data.map((ep) => this.normalizeEpisode(ep));

    // After loading, allow ceiling to adapt
    this._maybeExpandCeiling();
  }
}

module.exports = EpisodicMemory;