// /core/summarizer.js

// -----------------------------
// Utility: Count occurrences
// -----------------------------
function countOccurrences(arr) {
    const map = {};
    for (const item of arr) {
        map[item] = (map[item] || 0) + 1;
    }
    return map;
}

// -----------------------------
// Generate a theme label
// -----------------------------
function labelCluster(cluster) {
    const allKeywords = cluster.flatMap(s => s.keywords);
    const freq = countOccurrences(allKeywords);

    // Pick the top 1–3 keywords as the theme
    const sorted = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([word]) => word);

    return sorted.join(" ").trim() || "general theme";
}

// -----------------------------
// Generate a natural-language summary
// -----------------------------
function summarizeCluster(cluster) {
    const texts = cluster.map(s => s.originalText || s.text || "").filter(Boolean);

    if (texts.length === 0) {
        return "A set of related experiences with no textual content.";
    }

    // Simple generic summary: pick key sentences
    const combined = texts.join(" ");
    const sentences = combined.split(/(?<=[.!?])\s+/);

    // Pick 1–2 representative sentences
    const summary = sentences.slice(0, 2).join(" ");

    return summary || "A group of related experiences.";
}

// -----------------------------
// Build a mood profile
// -----------------------------
function buildMoodProfile(cluster) {
    const moodCounts = {};

    for (const shard of cluster) {
        if (!shard.mood) continue;
        moodCounts[shard.mood] = (moodCounts[shard.mood] || 0) + 1;
    }

    const total = Object.values(moodCounts).reduce((a, b) => a + b, 0);

    if (total === 0) return {};

    // Normalize to percentages
    const profile = {};
    for (const mood in moodCounts) {
        profile[mood] = moodCounts[mood] / total;
    }

    return profile;
}

// -----------------------------
// Merge tags from all shards
// -----------------------------
function mergeTags(cluster) {
    const tagSet = new Set();
    for (const shard of cluster) {
        (shard.tags || []).forEach(tag => tagSet.add(tag));
    }
    return [...tagSet];
}

// -----------------------------
// Main summarizer
// -----------------------------
function summarizeClusterData(cluster) {
    return {
        theme: labelCluster(cluster),
        summary: summarizeCluster(cluster),
        mood_profile: buildMoodProfile(cluster),
        tags: mergeTags(cluster)
    };
}

module.exports = {
    labelCluster,
    summarizeCluster,
    buildMoodProfile,
    mergeTags,
    summarizeClusterData
};