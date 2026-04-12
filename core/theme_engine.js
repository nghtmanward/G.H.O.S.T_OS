// /core/theme_engine.js

const { RetrievalEngine } = require("./retrieval_engine");
const { SemanticEngine } = require("./semantic_engine");
const mainMemory = require("./main_memory");

class ThemeEngine {
  constructor(memoryDir) {
    this.retrieval = new RetrievalEngine(memoryDir);
    this.semantic = new SemanticEngine();
  }

  // simple L2 distance
  distance(a, b) {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const d = a[i] - b[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  }

  // pick k random initial centers
  initCenters(vectors, k) {
    const copy = [...vectors];
    const centers = [];
    k = Math.min(k, copy.length);
    for (let i = 0; i < k; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      centers.push(copy.splice(idx, 1)[0]);
    }
    return centers;
  }

  // k-means-lite clustering
  clusterEmbeddings(vectors, k = 5, iterations = 10) {
    if (vectors.length === 0) return [];

    let centers = this.initCenters(vectors, k);

    for (let iter = 0; iter < iterations; iter++) {
      const assignments = vectors.map(() => -1);

      // assign
      for (let i = 0; i < vectors.length; i++) {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let c = 0; c < centers.length; c++) {
          const d = this.distance(vectors[i], centers[c]);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = c;
          }
        }
        assignments[i] = bestIdx;
      }

      // recompute centers
      const newCenters = centers.map(() => new Array(centers[0].length).fill(0));
      const counts = centers.map(() => 0);

      for (let i = 0; i < vectors.length; i++) {
        const c = assignments[i];
        counts[c]++;
        const v = vectors[i];
        for (let j = 0; j < v.length; j++) {
          newCenters[c][j] += v[j];
        }
      }

      for (let c = 0; c < centers.length; c++) {
        if (counts[c] === 0) continue;
        for (let j = 0; j < newCenters[c].length; j++) {
          newCenters[c][j] /= counts[c];
        }
      }

      centers = newCenters;
    }

    // build clusters
    const clusters = centers.map(() => []);
    for (let i = 0; i < vectors.length; i++) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const d = this.distance(vectors[i], centers[c]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = c;
        }
      }
      clusters[bestIdx].push(i);
    }

    return { centers, clusters };
  }

  // derive a label from shard summaries
  deriveLabel(shards) {
    const text = shards
      .map(s => s.summary?.text || "")
      .join(" ");

    const keywords = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 3);

    const freq = {};
    for (const w of keywords) {
      freq[w] = (freq[w] || 0) + 1;
    }

    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([w]) => w);

    if (sorted.length === 0) return "unnamed theme";

    return sorted.join(" / ");
  }

  // main: recompute themes from shard summaries
  recomputeThemes(k = 5) {
    const retrievalResult = this.retrieval.shards || this.retrieval.shards;
    // safer: pull from retrieval engine directly
    const shards = this.retrieval.shards || [];

    if (!Array.isArray(shards) || shards.length === 0) {
      return [];
    }

    const vectors = shards
      .map(s => s.summary?.embedding || [])
      .filter(v => Array.isArray(v) && v.length > 0);

    if (vectors.length === 0) return [];

    const { centers, clusters } = this.clusterEmbeddings(vectors, k);

    const themes = [];

    for (let c = 0; c < clusters.length; c++) {
      const idxs = clusters[c];
      if (idxs.length === 0) continue;

      const clusterShards = idxs.map(i => shards[i]);
      const label = this.deriveLabel(clusterShards);

      const combinedText = clusterShards
        .map(s => s.summary?.text || "")
        .join(" ");

      themes.push({
        theme: label,
        summary: combinedText.slice(0, 2000),
        embedding: centers[c],
        strength: idxs.length
      });
    }

    // write into mainMemory.tertiary
    mainMemory.tertiary = themes;

    return themes;
  }
}

module.exports = { ThemeEngine };