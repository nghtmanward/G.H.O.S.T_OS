// core/dreaming_engine.js

const path = require('path');
const { RetrievalEngine } = require('./retrieval_engine');
const { SemanticEngine } = require('./semantic_engine');
const { ShardManager } = require('./shard_manager');

class DreamingEngine {
  constructor(memoryDir = path.join(__dirname, '..', 'memory')) {
    this.memoryDir = memoryDir;
    this.retrieval = new RetrievalEngine(this.memoryDir);
    this.semantic = new SemanticEngine();
    this.shards = new ShardManager(this.memoryDir);
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

  // Build a single dream episode from a cluster of episodes
  buildDreamEpisode(cluster) {
    if (!cluster || cluster.length === 0) return null;

    // Text remix: join snippets from the cluster
    const snippets = cluster.map(c => c.text || '').filter(Boolean);
    const text = snippets.join(' | ');

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

    // 1) Get all episodes
    const episodes = this.retrieval.getAllEpisodes();
    if (episodes.length === 0) return [];

    // 2) Bias toward higher anomaly experiences
    const sorted = [...episodes].sort((a, b) => (b.anomaly || 0) - (a.anomaly || 0));
    const seeds = this.sample(sorted.slice(0, Math.min(50, sorted.length)), seedCount);

    const dreams = [];

    for (const seed of seeds) {
      // 3) Get cluster of similar episodes
      const clusterScored = this.semantic.findSimilarEpisodes(
        seed.text || '',
        episodes,
        clusterSize
      );

      // FIXED: SemanticEngine returns { item, score }
      const cluster = clusterScored.map(c => c.item);

      // 4) Build dream episode
      const dream = this.buildDreamEpisode(cluster);
      if (!dream) continue;

      // 5) Store dream in episodic memory
      this.shards.addEpisode(dream);
      dreams.push(dream);

      if (dreams.length >= maxDreams) break;
    }

    return dreams;
  }
}

module.exports = { DreamingEngine };