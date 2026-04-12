// core/dreaming_engine.js

const path = require('path');
const { RetrievalEngine } = require('./retrieval_engine');
const { SemanticEngine } = require('./semantic_engine');
const { ShardManager } = require('./shard_manager');
const mainMemory = require('./main_memory');

class DreamingEngine {
  constructor(memoryDir = path.join(__dirname, '..', 'memory')) {
    this.memoryDir = memoryDir;
    this.retrieval = new RetrievalEngine(this.memoryDir);
    this.semantic = new SemanticEngine();
    this.shards = new ShardManager(this.memoryDir);

    // Throttle dreams by time
    this.lastDreamTime = 0;
    this.DREAM_INTERVAL = 5000; // 5 seconds between dream cycles

    // Throttle dreams by episode count
    this.episodeCounter = 0;
    this.DREAM_EVERY_N = 20; // dream every 20 episodes
  }

  // Helper: pick N random items from an array
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

  // NEW: thematic drift from long-term memory
  getDreamTheme() {
    const tertiary = mainMemory.tertiary || [];
    if (tertiary.length === 0) return null;

    // strongest semantic record
    const strongest = [...tertiary].sort((a, b) => b.strength - a.strength)[0];

    return strongest.theme || strongest.summary || null;
  }

  // Build a single dream episode from a cluster of episodes
  buildDreamEpisode(cluster, theme = null) {
    if (!cluster || cluster.length === 0) return null;

    // Text remix: join snippets from the cluster
    const snippets = cluster.map(c => c.text || '').filter(Boolean);

    // Add thematic drift if available
    if (theme) {
      snippets.push(`{theme:${theme}}`);
    }

    // Cap dream length to prevent runaway recursion
    const MAX_DREAM_LENGTH = 2000;
    const text = snippets.join(' | ').slice(0, MAX_DREAM_LENGTH);

    // Mood blend
    const moods = [...new Set(cluster.map(c => c.mood).filter(Boolean))];
    const mood = moods[0] || 'neutral';

    // Anomaly + latentMag averages
    const avgAnomaly =
      cluster.reduce((a, ep) => a + (ep.anomaly || 0), 0) / cluster.length;
    const avgLatentMag =
      cluster.reduce((a, ep) => a + (ep.latentMag || 0), 0) / cluster.length;

    return {
      type: 'dream',
      text,
      anomaly: avgAnomaly,
      mood,
      style: 'dreamlike',
      latentMag: avgLatentMag,
      timestamp: Date.now()
    };
  }

  // Main API: run one dream cycle
  runDreamCycle(options = {}) {
    const {
      seedCount = 3,         // how many seed memories to start from
      clusterSize = 5,       // how many similar memories per seed
      maxDreams = 5          // cap number of dream episodes
    } = options;

    // Count episodes since last dream
    this.episodeCounter += 1;

    // Only dream every N episodes
    if (this.episodeCounter < this.DREAM_EVERY_N) {
      return [];
    }

    // Reset counter
    this.episodeCounter = 0;

    // Throttle dream cycles by time
    if (Date.now() - this.lastDreamTime < this.DREAM_INTERVAL) {
      return [];
    }
    this.lastDreamTime = Date.now();

    // 1) Get all episodes
    const episodes = this.retrieval.getAllEpisodes();
    if (episodes.length === 0) return [];

    // 2) Bias toward higher anomaly experiences
    const sorted = [...episodes].sort((a, b) => (b.anomaly || 0) - (a.anomaly || 0));
    const seeds = this.sample(sorted.slice(0, Math.min(50, sorted.length)), seedCount);

    // NEW: thematic drift from long-term memory
    const theme = this.getDreamTheme();

    const dreams = [];

    for (const seed of seeds) {
      // 3) Get cluster of similar episodes (native C++)
      const clusterNative = this.retrieval.findByMeaningNative(
        seed.text || '',
        clusterSize
      );

      // fallback to JS semantic if needed
      const cluster = clusterNative.length > 0
        ? clusterNative
        : this.semantic.findSimilarEpisodes(seed.text || '', episodes, clusterSize)
            .map(c => c.item);

      // 4) Build dream episode with thematic drift
      const dream = this.buildDreamEpisode(cluster, theme);
      if (!dream) continue;

      // DREAM ISOLATION:
      // Dreams influence the system but are NOT saved as episodic memories.
      dreams.push(dream);

      if (dreams.length >= maxDreams) break;
    }

    return dreams;
  }
}

module.exports = { DreamingEngine };