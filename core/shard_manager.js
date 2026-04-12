// core/shard_manager.js

const fs = require('fs');
const path = require('path');
const { EpisodicShard, MAX_EPISODES_PER_SHARD } = require('./episodic_shard');
const { encodeText, extractKeywords, computeImportance } = require('./encoder');

class ShardManager {
  constructor(memoryDir = path.join(__dirname, '..', 'memory')) {
    this.memoryDir = memoryDir;

    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }

    this.indexFile = path.join(this.memoryDir, 'index.json');
    this.currentIndex = this.loadIndex();

    this.currentShard = this.loadShard(this.currentIndex);

    // For persistence compatibility with main.js
    this.shards = [];
  }

  // -------------------------------
  // INDEX HANDLING
  // -------------------------------
  loadIndex() {
    if (!fs.existsSync(this.indexFile)) {
      fs.writeFileSync(this.indexFile, JSON.stringify({ lastShard: 1 }, null, 2));
      return 1;
    }

    const data = JSON.parse(fs.readFileSync(this.indexFile, 'utf8'));
    return data.lastShard || 1;
  }

  saveIndex() {
    fs.writeFileSync(
      this.indexFile,
      JSON.stringify({ lastShard: this.currentIndex }, null, 2)
    );
  }

  // -------------------------------
  // SHARD LOADING / SAVING
  // -------------------------------
  shardPath(index) {
    return path.join(this.memoryDir, `shard_${index}.json`);
  }

  loadShard(index) {
    const file = this.shardPath(index);

    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      const shard = new EpisodicShard(data.index);
      shard.episodes = data.episodes || [];
      shard.startTimestamp = data.startTimestamp;
      shard.endTimestamp = data.endTimestamp;
      shard.summary = data.summary || null;
      return shard;
    }

    return new EpisodicShard(index);
  }

  // -------------------------------
  // SHARD SUMMARY GENERATION
  // -------------------------------
  generateShardSummary(shard) {
    if (!shard.episodes || shard.episodes.length === 0) {
      return {
        embedding: encodeText("empty shard"),
        keywords: [],
        importance: 0,
        text: "Empty shard"
      };
    }

    const combinedText = shard.episodes.map(ep => ep.text || "").join(" ");
    const keywords = extractKeywords(combinedText);
    const importance =
      shard.episodes.reduce((sum, ep) => sum + computeImportance(ep), 0) /
      shard.episodes.length;

    const embedding = encodeText(combinedText);

    return {
      embedding,
      keywords,
      importance,
      text: combinedText.slice(0, 5000)
    };
  }

  saveShard(shard) {
    const file = this.shardPath(shard.index);

    shard.summary = this.generateShardSummary(shard);

    const json = JSON.stringify(shard.toJSON(), null, 2);

    const MAX_SHARD_SIZE = 5_000_000;
    if (json.length > MAX_SHARD_SIZE) {
      console.warn(
        `Shard ${shard.index} too large (${json.length} bytes). Skipping save.`
      );
      return;
    }

    fs.writeFileSync(file, json);
  }

  // -------------------------------
  // MAIN API
  // -------------------------------
  addEpisode(ep) {
    if (!ep || typeof ep !== "object") return;

    this.currentShard.addEpisode(ep);
    this.saveShard(this.currentShard);

    if (this.currentShard.isFull()) {
      this.rotateShard();
    }
  }

  rotateShard() {
    this.saveShard(this.currentShard);

    this.currentIndex += 1;
    this.saveIndex();

    this.currentShard = new EpisodicShard(this.currentIndex);
    this.saveShard(this.currentShard);
  }

  getCurrentShardJSON() {
    return this.currentShard.toJSON();
  }

  // -------------------------------
  // COMPAT: maybeShard (old API)
  // -------------------------------
  maybeShard(episodicMemory) {
    if (!episodicMemory || !episodicMemory.episodes) return;

    if (this.currentShard.isFull()) {
      this.rotateShard();
    }

    const last = episodicMemory.episodes[episodicMemory.episodes.length - 1];
    if (last) {
      this.addEpisode(last);
    }
  }

  // -------------------------------
  // PERSISTENCE SUPPORT
  // -------------------------------
  dump() {
    const files = fs.readdirSync(this.memoryDir)
      .filter(f => f.startsWith("shard_") && f.endsWith(".json"));

    return files.map(file => {
      try {
        return JSON.parse(fs.readFileSync(path.join(this.memoryDir, file), "utf8"));
      } catch (err) {
        console.error("Error reading shard file during dump:", file, err);
        return null;
      }
    }).filter(Boolean);
  }

  load(data) {
    if (!Array.isArray(data)) return;

    for (const shardData of data) {
      if (!shardData || typeof shardData !== "object") continue;

      const file = this.shardPath(shardData.index);
      fs.writeFileSync(file, JSON.stringify(shardData, null, 2));
    }

    this.currentIndex = this.loadIndex();
    this.currentShard = this.loadShard(this.currentIndex);
  }
}

module.exports = { ShardManager };