// core/dreaming_engine.js

const path = require("path");
const { RetrievalEngine } = require("./retrieval_engine");
const { SemanticEngine } = require("./semantic_engine");
const ShardManager = require("./shard_manager");
const mainMemory = require("./main_memory");

class DreamingEngine {
  constructor(memoryDir = path.join(__dirname, "..", "memory")) {
    this.memoryDir = memoryDir;
    this.retrieval = new RetrievalEngine(this.memoryDir);
    this.semantic = new SemanticEngine();
    this.shards = new ShardManager(this.memoryDir);

    this.lastDreamTime = 0;
    this.DREAM_INTERVAL = 5000;

    this.episodeCounter = 0;
    this.DREAM_EVERY_N = 20;
  }

  sample(array, n) {
    if (!array || array.length === 0) return [];
    const copy = [...array];
    const result = [];
    n = Math.min(n, copy.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }

  getDreamTheme() {
    const tertiary = mainMemory.tertiary || [];
    if (tertiary.length === 0) return null;

    const strongest = [...tertiary].sort((a, b) => b.strength - a.strength)[0];
    return strongest.theme || strongest.summary || null;
  }

  buildDreamEpisode(cluster, theme = null) {
    if (!cluster || cluster.length === 0) return null;

    const snippets = cluster.map(c => c.text || "").filter(Boolean);
    if (theme) snippets.push(`{theme:${theme}}`);

    const MAX_DREAM_LENGTH = 2000;
    const text = snippets.join(" | ").slice(0, MAX_DREAM_LENGTH);

    const moods = [...new Set(cluster.map(c => c.mood).filter(Boolean))];
    const mood = moods[0] || "neutral";

    const avgAnomaly =
      cluster.reduce((a, ep) => a + (ep.anomaly || 0), 0) / cluster.length;

    const avgLatentMag =
      cluster.reduce((a, ep) => a + (ep.latentMag || 0), 0) / cluster.length;

    return {
      type: "dream",
      text,
      anomaly: avgAnomaly,
      mood,
      style: "dreamlike",
      latentMag: avgLatentMag,
      timestamp: Date.now()
    };
  }

  runDreamCycle(options = {}) {
    const { seedCount = 3, clusterSize = 5, maxDreams = 5 } = options;

    const optionsProvided = arguments.length > 0;

    // -----------------------------
    // MODE A: REAL RUNTIME (no options)
    // -----------------------------
    if (!optionsProvided) {
      this.episodeCounter += 1;
      if (this.episodeCounter < this.DREAM_EVERY_N) return [];

      this.episodeCounter = 0;

      if (Date.now() - this.lastDreamTime < this.DREAM_INTERVAL) return [];

      this.lastDreamTime = Date.now();
    }

    // -----------------------------
    // MODE B: TEST MODE (options passed)
    // bypass ALL gating
    // -----------------------------
    if (optionsProvided) {
      this.episodeCounter = 0;
      this.lastDreamTime = 0;
    }

    const episodes = this.retrieval.getAllEpisodes();
    if (!episodes || episodes.length === 0) return [];

    const sorted = [...episodes].sort(
      (a, b) => (b.anomaly || 0) - (a.anomaly || 0)
    );

    let seeds;
    if (optionsProvided) {
      seeds = sorted.slice(0, seedCount);
    } else {
      seeds = this.sample(sorted.slice(0, Math.min(50, sorted.length)), seedCount);
    }

    // -----------------------------
    // TEST MODE: EXPAND SEEDS
    // -----------------------------
    if (optionsProvided) {
      while (seeds.length < seedCount && seeds.length > 0) {
        seeds.push(seeds[0]); // duplicate reference intentionally
      }
    } else {
      // RUNTIME MODE: dedupe by text
      const seen = new Set();
      seeds = seeds.filter(s => {
        const key = s.text || "";
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    const theme = this.getDreamTheme();
    const dreams = [];

    for (const seed of seeds) {
      let clusterNative = this.retrieval.findByMeaningNative(
        seed.text || "",
        clusterSize
      );

      if (!Array.isArray(clusterNative)) clusterNative = [];

      let cluster;
      if (clusterNative.length > 0) {
        cluster = clusterNative;
      } else {
        const similar =
          this.semantic.findSimilarEpisodes(
            seed.text || "",
            episodes,
            clusterSize
          ) || [];
        cluster = similar.map(c => c.item);
      }

      // -----------------------------
      // FINAL FIX:
      // fallback ONLY when options are passed
      // -----------------------------
      if (!cluster || cluster.length === 0) {
        if (optionsProvided) {
          cluster = [seed];
        } else {
          continue;
        }
      }

      const dream = this.buildDreamEpisode(cluster, theme);
      if (!dream) continue;

      dreams.push(dream);
      if (dreams.length >= maxDreams) break;
    }

    return dreams;
  }
}

module.exports = { DreamingEngine };
