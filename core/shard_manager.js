// core/shard_manager.js

const fs = require('fs');
const path = require('path');
const { EpisodicShard, MAX_EPISODES_PER_SHARD } = require('./episodic_shard');

class ShardManager {
  constructor(memoryDir = path.join(__dirname, '..', 'memory')) {
    this.memoryDir = memoryDir;

    // Ensure memory directory exists
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }

    // Load index or create a new one
    this.indexFile = path.join(this.memoryDir, 'index.json');
    this.currentIndex = this.loadIndex();

    // Load existing shard or create a new one
    this.currentShard = this.loadShard(this.currentIndex);
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
      return shard;
    }

    return new EpisodicShard(index);
  }

  saveShard(shard) {
    const file = this.shardPath(shard.index);
    fs.writeFileSync(file, JSON.stringify(shard.toJSON(), null, 2));
  }

  // -------------------------------
  // MAIN API
  // -------------------------------

  addEpisode(ep) {
    if (!ep || typeof ep !== "object") return;

    this.currentShard.addEpisode(ep);

    // Save after each episode
    this.saveShard(this.currentShard);

    if (this.currentShard.isFull()) {
      this.rotateShard();
    }
  }

  rotateShard() {
    // Save old shard
    this.saveShard(this.currentShard);

    // Move to next shard
    this.currentIndex += 1;
    this.saveIndex();

    this.currentShard = new EpisodicShard(this.currentIndex);
    this.saveShard(this.currentShard);
  }

  getCurrentShardJSON() {
    return this.currentShard.toJSON();
  }
}

module.exports = { ShardManager };