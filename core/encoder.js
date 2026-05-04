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
// Simple Text Embedding (64‑dim hashed bag-of-words)
// TODO: Replace with Ollama real embeddings when Python bridge is live
// -----------------------------
function encodeText(text = "") {
  const words = extractKeywords(text);
  const vec = new Array(64).fill(0);

  for (let w of words) {
    // FNV-1a hash — better distribution than polynomial
    let hash = 2166136261;
    for (let i = 0; i < w.length; i++) {
      hash ^= w.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    const idx = hash % vec.length;
    vec[idx] += 1;
  }

  return normalize(vec);
}

// -----------------------------
// Normalize vector to unit length
// -----------------------------
function normalize(vec) {
  let mag = 0;
  for (let i = 0; i < vec.length; i++) {
    mag += vec[i] * vec[i];
  }

  // If magnitude is zero, return a stable fallback unit vector
  if (mag === 0) {
    const fallback = new Array(vec.length).fill(0);
    fallback[0] = 1; // deterministic unit vector
    return fallback;
  }

  mag = Math.sqrt(mag);

  return vec.map(x => x / mag);
}

// -----------------------------
// Importance Scoring
// -----------------------------
function computeImportance(shard) {
  const anomalyWeight = 0.5;
  const latentWeight = 0.4;
  const lengthWeight = 0.1;

  // Null guards — default to 0 if fields are missing
  const anomaly = shard.anomaly ?? 0;
  const latent = shard.latent_magnitude ?? 0;
  const textLength = shard.text ? shard.text.length : 0;

  // TODO: Revisit 500 char ceiling once typical shard length is known
  return (
    anomaly * anomalyWeight +
    latent * latentWeight +
    Math.min(textLength / 500, 1.0) * lengthWeight
  );
}

// -----------------------------
// Main Encoder
// -----------------------------
function encodeShard(shard) {
  const keywords = extractKeywords(shard.text);
  const importance = computeImportance(shard);
  const embedding = encodeText(shard.text || "");

  return {
    id: shard.id,
    keywords,
    tags: shard.tags || [],
    mood: shard.mood || null,
    importance,
    embedding
  };
}

module.exports = {
  extractKeywords,
  computeImportance,
  encodeShard,
  encodeText,
  normalize
};