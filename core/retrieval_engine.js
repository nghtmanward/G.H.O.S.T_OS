// core/retrieval_engine.js

const fs = require('fs');
const path = require('path');
const { SemanticEngine } = require('./semantic_engine');

class RetrievalEngine {
  constructor(memoryDir = path.join(__dirname, '..', 'memory')) {
    this.semantic = new SemanticEngine();
    this.memoryDir = memoryDir;
    this.shards = this.loadAllShards();
  }

  // Load all shard JSON files from disk
  loadAllShards() {
    if (!fs.existsSync(this.memoryDir)) return [];

    const files = fs.readdirSync(this.memoryDir)
      .filter(f => f.startsWith('shard_') && f.endsWith('.json'));

    const shards = files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(this.memoryDir, file), 'utf8'));
      return data;
    });

    // Sort by shard index
    return shards.sort((a, b) => a.index - b.index);
  }

  // Reload shards (useful after new episodes are added)
  refresh() {
    this.shards = this.loadAllShards();
  }

  // -------------------------------
  // SEARCH FUNCTIONS
  // -------------------------------

  // Search by mood
  findByMood(mood) {
    this.refresh();
    return this.shards.flatMap(shard =>
      shard.episodes.filter(ep => ep.mood === mood)
    );
  }

  // Search by anomaly threshold
  findByAnomaly(minAnomaly) {
    this.refresh();
    return this.shards.flatMap(shard =>
      shard.episodes.filter(ep => ep.anomaly >= minAnomaly)
    );
  }

  // Search by time range
  findByTime(start, end) {
    this.refresh();
    return this.shards.flatMap(shard =>
      shard.episodes.filter(ep =>
        ep.timestamp >= start && ep.timestamp <= end
      )
    );
  }

  // Search by latent magnitude
  findByLatentMag(minMag) {
    this.refresh();
    return this.shards.flatMap(shard =>
      shard.episodes.filter(ep => ep.latentMag >= minMag)
    );
  }

  // Search by text content (simple keyword search)
  findByKeyword(keyword) {
    this.refresh();
    return this.shards.flatMap(shard =>
      shard.episodes.filter(ep =>
        ep.text.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }

  findByMeaning(query, topK = 5) {
    this.refresh();
  const episodes = this.getAllEpisodes();
    return this.semantic.findSimilarEpisodes(query, episodes, topK);
  }
  
  // Get all episodes across all shards
  getAllEpisodes() {
    this.refresh();
    return this.shards.flatMap(shard => shard.episodes);
  }
}

module.exports = { RetrievalEngine };