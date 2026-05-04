// /core/semantic_engine.js

const { encodeText } = require("./encoder");

class SemanticEngine {
  constructor(embeddingFn = encodeText) {
    // embeddingFn: function(text) → vector
    this.embed = (text) => {
      const vec = embeddingFn(text || "");
      return this.normalize(vec);
    };
  }

  // -------------------------------
  // VECTOR NORMALIZATION
  // -------------------------------
  normalize(vec) {
    if (!vec || vec.length === 0) return vec;

    let mag = 0;
    for (let i = 0; i < vec.length; i++) {
      mag += vec[i] * vec[i];
    }
    mag = Math.sqrt(mag);

    // Zero vector fallback: return unit vector along first dimension
    if (mag === 0) {
      const fallback = new Array(vec.length).fill(0);
      fallback[0] = 1;
      return fallback;
    }

    return vec.map((x) => x / mag);
  }

  // -------------------------------
  // COSINE SIMILARITY
  // -------------------------------
  cosine(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot; // already normalized
  }

  // -------------------------------
  // GENERIC SEMANTIC SEARCH
  // -------------------------------
  _search(query, items, textFn, topK = 5) {
    const qVec = this.embed(query);

    const scored = items.map((item) => {
      const text = textFn(item) || "";
      const vec = this.embed(text);
      const score = this.cosine(qVec, vec);
      return { item, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // -------------------------------
  // SEARCH RAW EPISODIC EPISODES
  // -------------------------------
  findSimilarEpisodes(query, episodes, topK = 5) {
    return this._search(query, episodes, (ep) => ep.text, topK);
  }

  // -------------------------------
  // SEARCH SEMANTIC SHARDS
  // (encoded shards from consolidation)
  // -------------------------------
  findSimilarShards(query, shards, topK = 5) {
    return this._search(query, shards, (shard) => shard.originalText, topK);
  }

  // -------------------------------
  // SEARCH TERTIARY RECORDS
  // (long-term semantic memory)
  // -------------------------------
  findSimilarTertiary(query, tertiaryRecords, topK = 5) {
    return this._search(query, tertiaryRecords, (rec) => rec.summary, topK);
  }

  // -------------------------------
  // SEARCH THEMES
  // (cluster labels)
  // -------------------------------
  findSimilarThemes(query, tertiaryRecords, topK = 5) {
    return this._search(query, tertiaryRecords, (rec) => rec.theme, topK);
  }

  // -------------------------------
  // UNIFIED SEMANTIC RETRIEVAL
  // -------------------------------
  retrieveRelevantMemories(query, { episodes = [], shards = [], tertiary = [] }) {
    return {
      episodes: this.findSimilarEpisodes(query, episodes, 5),
      shards: this.findSimilarShards(query, shards, 5),
      tertiary: this.findSimilarTertiary(query, tertiary, 5),
      themes: this.findSimilarThemes(query, tertiary, 5),
    };
  }
}

module.exports = { SemanticEngine };