// /core/retrieval_engine.js

const fs = require("fs");
const path = require("path");
const { SemanticEngine } = require("./semantic_engine");
const mainMemory = require("./main_memory");

class RetrievalEngine {
  constructor(memoryDir = path.join(__dirname, "..", "memory")) {
    this.semantic = new SemanticEngine();
    this.memoryDir = memoryDir;
    this.shards = this.loadAllShards();
  }

  // -------------------------------
  // LOAD ALL SHARDS FROM DISK
  // -------------------------------
  loadAllShards() {
    if (!fs.existsSync(this.memoryDir)) return [];

    const files = fs
      .readdirSync(this.memoryDir)
      .filter((f) => f.startsWith("shard_") && f.endsWith(".json"));

    const shards = files.map((file) => {
      const data = JSON.parse(
        fs.readFileSync(path.join(this.memoryDir, file), "utf8")
      );
      return data;
    });

    return shards.sort((a, b) => a.index - b.index);
  }

  refresh() {
    this.shards = this.loadAllShards();
  }

  // -------------------------------
  // BASIC FILTER SEARCHES
  // -------------------------------
  findByMood(mood) {
    this.refresh();
    return this.shards.flatMap((shard) =>
      shard.episodes.filter((ep) => ep.mood === mood)
    );
  }

  findByAnomaly(minAnomaly) {
    this.refresh();
    return this.shards.flatMap((shard) =>
      shard.episodes.filter((ep) => ep.anomaly >= minAnomaly)
    );
  }

  findByTime(start, end) {
    this.refresh();
    return this.shards.flatMap((shard) =>
      shard.episodes.filter(
        (ep) => ep.timestamp >= start && ep.timestamp <= end
      )
    );
  }

  findByLatentMag(minMag) {
    this.refresh();
    return this.shards.flatMap((shard) =>
      shard.episodes.filter((ep) => ep.latentMag >= minMag)
    );
  }

  findByKeyword(keyword) {
    this.refresh();
    return this.shards.flatMap((shard) =>
      shard.episodes.filter((ep) =>
        ep.text.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }

  // -------------------------------
  // SEMANTIC SEARCH (EPISODIC)
  // -------------------------------
  findByMeaning(query, topK = 5) {
    this.refresh();
    const episodes = this.getAllEpisodes();
    return this.semantic.findSimilarEpisodes(query, episodes, topK);
  }

  getAllEpisodes() {
    this.refresh();
    return this.shards.flatMap((shard) => shard.episodes);
  }

  // -------------------------------
  // SEMANTIC SEARCH (LONG-TERM)
  // -------------------------------
  findSimilarTertiary(query, topK = 5) {
    const tertiary = mainMemory.tertiary || [];
    return this.semantic.findSimilarTertiary(query, tertiary, topK);
  }

  findSimilarThemes(query, topK = 5) {
    const tertiary = mainMemory.tertiary || [];
    return this.semantic.findSimilarThemes(query, tertiary, topK);
  }

  findSimilarSemanticShards(query, topK = 5) {
    const encodedShards = mainMemory.shards || [];
    return this.semantic.findSimilarShards(query, encodedShards, topK);
  }

  // -------------------------------
  // UNIFIED SEMANTIC RETRIEVAL
  // -------------------------------
  retrieve(query) {
    this.refresh();

    return {
      episodic: this.findByMeaning(query, 5),
      shards: this.findSimilarSemanticShards(query, 5),
      tertiary: this.findSimilarTertiary(query, 5),
      themes: this.findSimilarThemes(query, 5),
    };
  }
}

module.exports = { RetrievalEngine };