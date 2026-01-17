// core/semantic_engine.js

class SemanticEngine {
  constructor(embeddingFn) {
    // embeddingFn: a function that takes text and returns a vector
    this.embed = embeddingFn || this.defaultEmbed;
  }

  // -------------------------------
  // DEFAULT EMBEDDING (placeholder)
  // -------------------------------
  defaultEmbed(text) {
    // Simple hash-based embedding for now
    const vec = new Array(32).fill(0);
    for (let i = 0; i < text.length; i++) {
      const idx = i % 32;
      vec[idx] += text.charCodeAt(i) / 255;
    }
    return vec;
  }

  // -------------------------------
  // COSINE SIMILARITY
  // -------------------------------
  cosine(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-9);
  }

  // -------------------------------
  // FIND MOST SIMILAR EPISODES
  // -------------------------------
  findSimilarEpisodes(query, episodes, topK = 5) {
    const qVec = this.embed(query);

    const scored = episodes.map(ep => {
      const epVec = this.embed(ep.text);
      const score = this.cosine(qVec, epVec);
      return { episode: ep, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

module.exports = { SemanticEngine };