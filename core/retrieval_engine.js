// /core/retrieval_engine.js

const fs = require("fs");
const path = require("path");
const { SemanticEngine } = require("./semantic_engine");
const mainMemory = require("./main_memory");

// Try loading native C++ engine
let native = null;
try {
  native = require("../native/build/Release/ghost_core.node");
  console.log("[NATIVE] ghost_core loaded for retrieval engine.");
} catch (err) {
  console.warn("[NATIVE] ghost_core unavailable, using JS fallback.");
}

class RetrievalEngine {
  constructor(memoryDir = path.join(__dirname, "..", "memory")) {
    this.semantic = new SemanticEngine();
    this.memoryDir = memoryDir;

    this.shards = [];
    this._episodicEpisodes = [];
    this._episodicItems = []; // [{ id, embedding }]
    this.refresh();
  }

  // -------------------------------
  // LOAD ALL SHARDS FROM DISK
  // -------------------------------
  loadAllShards() {
    if (!fs.existsSync(this.memoryDir)) return [];

    const files = fs
      .readdirSync(this.memoryDir)
      .filter((f) => f.startsWith("shard_") && f.endsWith(".json"));

    const shards = files
      .map((file) => {
        try {
          const data = JSON.parse(
            fs.readFileSync(path.join(this.memoryDir, file), "utf8")
          );
          return data;
        } catch (err) {
          console.error("Error reading shard file:", file, err);
          return null;
        }
      })
      .filter(Boolean);

    return shards.sort((a, b) => (a.index || 0) - (b.index || 0));
  }

  // -------------------------------
  // REFRESH + BUILD EPISODIC CACHE
  // -------------------------------
  refresh() {
    this.shards = this.loadAllShards();

    // Flatten episodes once
    this._episodicEpisodes = this.shards.flatMap((shard) => shard.episodes || []);

    // Precompute embeddings once per refresh for native path
    if (native) {
      this._episodicItems = this._episodicEpisodes.map((ep, idx) => ({
        id: idx,
        embedding: this.semantic.embed(ep.text || ""),
      }));
    } else {
      this._episodicItems = [];
    }
  }

  // -------------------------------
  // BASIC FILTER SEARCHES (unchanged)
  // -------------------------------
  findByMood(mood) {
    this.refresh();
    return this.shards.flatMap((shard) =>
      (shard.episodes || []).filter((ep) => ep.mood === mood)
    );
  }

  findByAnomaly(minAnomaly) {
    this.refresh();
    return this.shards.flatMap((shard) =>
      (shard.episodes || []).filter((ep) => (ep.anomaly || 0) >= minAnomaly)
    );
  }

  findByTime(start, end) {
    this.refresh();
    return this.shards.flatMap((shard) =>
      (shard.episodes || []).filter(
        (ep) => ep.timestamp >= start && ep.timestamp <= end
      )
    );
  }

  findByLatentMag(minMag) {
    this.refresh();
    return this.shards.flatMap((shard) =>
      (shard.episodes || []).filter((ep) => (ep.latentMag || 0) >= minMag)
    );
  }

  findByKeyword(keyword) {
    this.refresh();
    const lower = (keyword || "").toLowerCase();
    return this.shards.flatMap((shard) =>
      (shard.episodes || []).filter((ep) =>
        (ep.text || "").toLowerCase().includes(lower)
      )
    );
  }

  // -------------------------------
  // EPISODIC SEMANTIC SEARCH (JS)
  // -------------------------------
  getAllEpisodes() {
    this.refresh();
    return this._episodicEpisodes;
  }

  findByMeaning(query, topK = 5) {
    this.refresh();
    const episodes = this._episodicEpisodes;
    return this.semantic.findSimilarEpisodes(query, episodes, topK);
  }

  // -------------------------------
  // EPISODIC SEMANTIC SEARCH (NATIVE, OPTIMIZED)
  // -------------------------------
  findByMeaningNative(query, topK = 5) {
    if (!native) return this.findByMeaning(query, topK);

    this.refresh();

    if (!this._episodicItems.length) {
      // No episodes or no embeddings; fall back
      return this.findByMeaning(query, topK);
    }

    const queryEmbedding = this.semantic.embed(query || "");
    const ids = native.findSimilar(queryEmbedding, this._episodicItems, topK);

    return ids
      .filter((i) => i >= 0 && i < this._episodicEpisodes.length)
      .map((i) => this._episodicEpisodes[i]);
  }

  // -------------------------------
  // SHARD SEMANTIC SEARCH (JS)
  // -------------------------------
  findSimilarSemanticShards(query, topK = 5) {
    const encodedShards = mainMemory.shards || [];
    return this.semantic.findSimilarShards(query, encodedShards, topK);
  }

  // -------------------------------
  // SHARD SEMANTIC SEARCH (NATIVE, OPTIMIZED)
  // -------------------------------
  findSimilarSemanticShardsNative(query, topK = 5) {
    if (!native) return this.findSimilarSemanticShards(query, topK);

    const encodedShards = mainMemory.shards || [];
    if (!encodedShards.length) {
      return this.findSimilarSemanticShards(query, topK);
    }

    // Build items on demand (mainMemory can change independently)
    const items = encodedShards.map((shard, idx) => ({
      id: idx,
      embedding: this.semantic.embed(shard.originalText || ""),
    }));

    const queryEmbedding = this.semantic.embed(query || "");
    const ids = native.findSimilar(queryEmbedding, items, topK);

    return ids
      .filter((i) => i >= 0 && i < encodedShards.length)
      .map((i) => encodedShards[i]);
  }

  // -------------------------------
  // TERTIARY + THEMES (JS only)
  // -------------------------------
  findSimilarTertiary(query, topK = 5) {
    const tertiary = mainMemory.tertiary || [];
    return this.semantic.findSimilarTertiary(query, tertiary, topK);
  }

  findSimilarThemes(query, topK = 5) {
    const tertiary = mainMemory.tertiary || [];
    return this.semantic.findSimilarThemes(query, tertiary, topK);
  }

  // -------------------------------
  // UNIFIED SEMANTIC RETRIEVAL
  // -------------------------------
  retrieve(query) {
    this.refresh();

    return {
      episodic: this.findByMeaning(query, 5),
      episodicNative: this.findByMeaningNative(query, 5),
      shards: this.findSimilarSemanticShards(query, 5),
      shardsNative: this.findSimilarSemanticShardsNative(query, 5),
      tertiary: this.findSimilarTertiary(query, 5),
      themes: this.findSimilarThemes(query, 5),
    };
  }
}

module.exports = { RetrievalEngine };