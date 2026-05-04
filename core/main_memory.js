// /core/main_memory.js

const { EpisodicShard } = require("./memory_models");
const { consolidate } = require("./consolidate");
const decay = require("./decay");
const {
    loadShards,
    saveShards,
    loadTertiary,
    saveTertiary
} = require("./storage");

class MainMemory {
    constructor() {
        this.shards = [];
        this.tertiary = [];

        this.lastConsolidation = 0;
        this.lastDecay = 0;

        this.CONSOLIDATION_INTERVAL = 1000 * 60 * 5; // 5 minutes
        this.DECAY_INTERVAL = 1000 * 60 * 60 * 6;    // 6 hours
    }

    load() {
        this.shards = loadShards();
        this.tertiary = loadTertiary();
        console.log("[Memory] Loaded shards + tertiary records");
    }

    save() {
        saveShards(this.shards);
        saveTertiary(this.tertiary);
        console.log("[Memory] Saved shards + tertiary records");
    }

    addShard({ text = "", mood = null, tags = [] }) {
        const shard = new EpisodicShard({
            text,
            mood,
            tags
        });

        this.shards.push(shard);
        return shard;
    }

    consolidateIfNeeded() {
        const now = Date.now();
        if (now - this.lastConsolidation < this.CONSOLIDATION_INTERVAL) return;

        console.log("[Memory] Running consolidation...");
        consolidate(this.shards, this.tertiary);

        this.lastConsolidation = now;
        this.save();
    }

    decayIfNeeded() {
        const now = Date.now();
        if (now - this.lastDecay < this.DECAY_INTERVAL) return;

        console.log("[Memory] Running decay...");
        this.tertiary = decay(this.tertiary);

        this.lastDecay = now;
        this.save();
    }

    getMemory() {
        return {
            shards: this.shards,
            tertiary: this.tertiary
        };
    }
}

module.exports = new MainMemory();