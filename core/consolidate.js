// /core/consolidate.js

const { EpisodicShard, TertiaryRecord } = require("./memory_models");
const { encodeShard } = require("./encoder");
const { clusterShards } = require("./cluster");
const { summarizeClusterData } = require("./summarizer");

// -----------------------------
// Helper: Check recency
// -----------------------------
function isRecent(shard, windowMs = 1000 * 60 * 60 * 24 * 3) { // 3 days default
    return Date.now() - shard.timestamp <= windowMs;
}

// -----------------------------
// Helper: Check importance
// -----------------------------
function isImportant(encodedShard, minImportance = 0.15) {
    return encodedShard.importance >= minImportance;
}

// -----------------------------
// Helper: Check dream eligibility
// -----------------------------
function isDreamEligible(shard) {
    if (shard.type !== "dream") return true;  // episodic shards always eligible
    return shard.validated === true;           // dream-derived: only once validated
}

// -----------------------------
// Strength calculation
// -----------------------------
function computeStrength(cluster) {
    const avgImportance =
        cluster.reduce((sum, s) => sum + s.importance, 0) / cluster.length;

    const recencyBoost = Math.min(
        1,
        1 - (Date.now() - Math.min(...cluster.map(s => s.timestamp))) / (1000 * 60 * 60 * 24 * 7)
    );

    return avgImportance * 0.7 + recencyBoost * 0.3;
}

// -----------------------------
// Merge into existing tertiary record
// -----------------------------
function mergeIntoRecord(record, summaryData, cluster, strength) {
    record.updated_at = Date.now();

    // Update summary (simple append for now)
    record.summary += " " + summaryData.summary;

    // Update theme only if new one is stronger
    if (summaryData.theme.length > record.theme.length) {
        record.theme = summaryData.theme;
    }

    // Merge tags
    const tagSet = new Set([...record.tags, ...summaryData.tags]);
    record.tags = [...tagSet];

    // Merge mood profile
    for (const mood in summaryData.mood_profile) {
        record.mood_profile[mood] =
            (record.mood_profile[mood] || 0) + summaryData.mood_profile[mood];
    }

    // Normalize mood profile
    const total = Object.values(record.mood_profile).reduce((a, b) => a + b, 0);
    for (const mood in record.mood_profile) {
        record.mood_profile[mood] /= total;
    }

    // Add shard IDs
    const newIds = cluster.map(s => s.id);
    record.shard_ids.push(...newIds);

    // Update strength
    record.strength = (record.strength + strength) / 2;
}

// -----------------------------
// Main Consolidation Function
// -----------------------------
function consolidate(shards, tertiaryRecords) {
    // Step 1: Encode shards
    const encoded = shards
        .filter(s => !s.consolidated && isRecent(s) && isDreamEligible(s))
        .map(s => {
            const enc = encodeShard(s);
            enc.timestamp = s.timestamp;
            enc.originalText = s.text;
            return enc;
        })
        .filter(enc => isImportant(enc));

    if (encoded.length === 0) return;

    // Step 2: Cluster
    const clusters = clusterShards(encoded);

    // Step 3: Process each cluster
    for (const cluster of clusters) {
        if (cluster.length < 2) continue;

        const summaryData = summarizeClusterData(cluster);
        const strength = computeStrength(cluster);

        // Try to find a similar existing tertiary record
        const existing = tertiaryRecords.find(r =>
            r.theme === summaryData.theme ||
            r.tags.some(tag => summaryData.tags.includes(tag))
        );

        if (existing) {
            mergeIntoRecord(existing, summaryData, cluster, strength);
        } else {
            // Create new tertiary record
            const newRecord = new TertiaryRecord({
                theme: summaryData.theme,
                summary: summaryData.summary,
                tags: summaryData.tags,
                mood_profile: summaryData.mood_profile,
                shard_ids: cluster.map(s => s.id),
                strength
            });

            tertiaryRecords.push(newRecord);
        }
    }

    // Step 4: Mark shards as consolidated
    for (const shard of shards) {
        if (!shard.consolidated && encoded.find(e => e.id === shard.id)) {
            shard.consolidated = true;
            shard.consolidated_at = Date.now();
        }
    }
}

module.exports = {
    consolidate
};