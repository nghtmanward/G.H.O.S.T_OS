// /core/encoder.js

const stopwords = new Set([
    "the","a","an","and","or","but","if","in","on","at","to","for","with",
    "is","are","was","were","be","been","of","that","this","it","as","by"
]);

// -----------------------------
// Keyword Extraction
// -----------------------------
function extractKeywords(text = "") {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopwords.has(word));
}

// -----------------------------
// Simple Text Embedding (fallback)
// -----------------------------
function encodeText(text = "") {
    const words = extractKeywords(text);
    const vec = new Array(64).fill(0);

    for (let w of words) {
        let hash = 0;
        for (let i = 0; i < w.length; i++) {
            hash = (hash * 31 + w.charCodeAt(i)) & 0xffffffff;
        }
        const idx = Math.abs(hash) % vec.length;
        vec[idx] += 1;
    }

    return vec;
}

// -----------------------------
// Importance Scoring
// -----------------------------
function computeImportance(shard) {
    const anomalyWeight = 0.5;
    const latentWeight = 0.4;
    const lengthWeight = 0.1;

    const textLength = shard.text ? shard.text.length : 0;

    return (
        shard.anomaly * anomalyWeight +
        shard.latent_magnitude * latentWeight +
        Math.min(textLength / 500, 1.0) * lengthWeight
    );
}

// -----------------------------
// Main Encoder
// -----------------------------
function encodeShard(shard) {
    const keywords = extractKeywords(shard.text);
    const importance = computeImportance(shard);

    return {
        id: shard.id,
        keywords,
        tags: shard.tags || [],
        mood: shard.mood || null,
        importance,
        embedding: shard.embedding || null
    };
}

module.exports = {
    extractKeywords,
    computeImportance,
    encodeShard,
    encodeText
};