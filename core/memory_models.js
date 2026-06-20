// /core/memory_models.js

const { v4: uuidv4 } = require("uuid");

// -----------------------------
// Episodic Shard (Secondary Memory)
// -----------------------------
class EpisodicShard {
    constructor({
        id = uuidv4(),
        timestamp = Date.now(),
        text = "",
        mood = null,
        anomaly = 0.0,
        latent_magnitude = 0.0,
        tags = [],
        embedding = null,
        consolidated = false,
        consolidated_at = null,
        type = "episodic",
        validated = true
    } = {}) {
        this.id = id;
        this.timestamp = timestamp;
        this.text = text;
        this.mood = mood;
        this.anomaly = anomaly;
        this.latent_magnitude = latent_magnitude;
        this.tags = tags;
        this.embedding = embedding;
        this.consolidated = consolidated;
        this.consolidated_at = consolidated_at;
        this.type = type;
        this.validated = validated;
    }
}

// -----------------------------
// Tertiary Record (Long-Term Memory)
// -----------------------------
class TertiaryRecord {
    constructor({
        id = uuidv4(),
        created_at = Date.now(),
        updated_at = Date.now(),
        theme = "",
        summary = "",
        tags = [],
        mood_profile = {},
        shard_ids = [],
        strength = 0.0,
        embedding = null
    } = {}) {
        this.id = id;
        this.created_at = created_at;
        this.updated_at = updated_at;
        this.theme = theme;
        this.summary = summary;
        this.tags = tags;
        this.mood_profile = mood_profile;
        this.shard_ids = shard_ids;
        this.strength = strength;
        this.embedding = embedding;
    }
}

module.exports = {
    EpisodicShard,
    TertiaryRecord
};