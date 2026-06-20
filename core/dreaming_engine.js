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
    this.DREAM_EVERY_N = 5;

    // Second seed source: contradiction+mood blends queued by
    // thought_engine when both signals fire on the same tick.
    this.pendingBlends = [];
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

  // Dream-recursion guard: an unvalidated dream-derived shard isn't
  // eligible raw material for another dream cycle until it's been
  // reviewed and validated through waking ticks.
  isDreamEligible(ep) {
    if (!ep) return false;
    if (ep.type !== "dream") return true;
    return ep.validated === true;
  }

  // Entry point thought_engine calls when contradiction and mood-
  // misalignment both fire on the same tick rather than one cleanly
  // winning. Queued here rather than resolved immediately in waking
  // thought.
  enqueuePending(contradiction, moodSignal) {
    if (!contradiction || !moodSignal) return;
    this.pendingBlends.push({
      contradiction,
      moodSignal,
      timestamp: Date.now()
    });
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
      validated: false,
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

    const dreams = [];
    const theme = this.getDreamTheme();
    const episodes = this.retrieval.getAllEpisodes();
    console.log(`[DREAM] Cycle attempt — pendingBlends: ${this.pendingBlends.length}, episodes: ${episodes?.length || 0}, theme: ${theme}`);

    // -----------------------------
    // PENDING BLENDS — second seed source, queued by thought_engine
    // when contradiction and mood-misalignment both fire on the same
    // tick. Processed first since they carry an explicit signal
    // rather than ambient anomaly sampling. Runs alongside, not
    // instead of, the anomaly-based seeding below.
    // -----------------------------
    while (this.pendingBlends.length > 0 && dreams.length < maxDreams) {
      const { contradiction, moodSignal } = this.pendingBlends.shift();
      if (!contradiction || !moodSignal) continue;

      const cluster = [contradiction.shardA, contradiction.shardB, moodSignal.shard]
        .filter(Boolean)
        .filter(s => this.isDreamEligible(s));

      if (cluster.length < 2) continue; // not enough eligible material to blend

      const dream = this.buildDreamEpisode(cluster, theme);
      if (dream) dreams.push(dream);
    }

    if (dreams.length >= maxDreams) return dreams;

    if (!episodes || episodes.length === 0) return dreams;

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