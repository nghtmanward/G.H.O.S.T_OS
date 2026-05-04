// /core/maintenance_engine.js

const path = require("path");
const ShardManager = require("./shard_manager");
const { ThemeEngine } = require("./theme_engine");
const { RetrievalEngine } = require("./retrieval_engine");

class MaintenanceEngine {
  constructor(memoryDir = path.join(__dirname, "..", "memory")) {
    this.memoryDir = memoryDir;
    this.shards = new ShardManager(memoryDir);
    this.themes = new ThemeEngine(memoryDir);
    this.retrieval = new RetrievalEngine(memoryDir);

    this.lastRun = 0;
    this.MIN_INTERVAL = 10_000; // 10 seconds between maintenance cycles
  }

  // ---------------------------------------------------------
  // MAIN ENTRY POINT
  // ---------------------------------------------------------
  run() {
    const now = Date.now();
    if (now - this.lastRun < this.MIN_INTERVAL) {
      return { status: "skipped", reason: "cooldown" };
    }
    this.lastRun = now;

    // 1. Re-save current shard (ensures semantic summary is fresh)
    this.shards.saveShard(this.shards.currentShard);

    // 2. Recompute themes from shard summaries
    const themes = this.themes.recomputeThemes(5);

    // 3. Optional: future cleanup, decay, compression, etc.
    //    (We can add forgetting curves, shard compaction, etc.)

    return {
      status: "ok",
      themesUpdated: themes.length,
      timestamp: now
    };
  }
}

module.exports = { MaintenanceEngine };