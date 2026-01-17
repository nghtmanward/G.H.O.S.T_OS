// core/consolidation_engine.js

const fs = require('fs');
const path = require('path');
const { RetrievalEngine } = require('./retrieval_engine');
const { SemanticEngine } = require('./semantic_engine');

class ConsolidationEngine {
  constructor(memoryDir = path.join(__dirname, '..', 'memory')) {
    this.memoryDir = memoryDir;
    this.longTermFile = path.join(this.memoryDir, 'long_term.json');

    this.retrieval = new RetrievalEngine(memoryDir);
    this.semantic = new SemanticEngine();

    this.longTerm = this.loadLongTerm();
  }

  // Load long-term memory file
  loadLongTerm() {
    if (!fs.existsSync(this.longTermFile)) {
      return { themes: [] };
    }
    return JSON.parse(fs.readFileSync(this.longTermFile, 'utf8'));
  }

  saveLongTerm() {
    fs.writeFileSync(this.longTermFile, JSON.stringify(this.longTerm, null, 2));
  }

  // -------------------------------
  // CONSOLIDATION
  // -------------------------------

  consolidate(topK = 5) {
    const episodes = this.retrieval.getAllEpisodes();
    if (episodes.length === 0) return;

    const themes = [];

    // Simple clustering: pick an episode, find similar ones, form a theme
    const used = new Set();

    for (let i = 0; i < episodes.length; i++) {
      if (used.has(i)) continue;

      const base = episodes[i];
      const cluster = this.semantic.findSimilarEpisodes(base.text, episodes, topK);

      // Mark clustered episodes as used
      cluster.forEach(c => {
        const idx = episodes.indexOf(c.episode);
        if (idx >= 0) used.add(idx);
      });

      // Build a theme summary
      const theme = {
        summary: base.text,
        count: cluster.length,
        avgAnomaly: cluster.reduce((a, c) => a + c.episode.anomaly, 0) / cluster.length,
        moods: [...new Set(cluster.map(c => c.episode.mood))],
        timestamps: cluster.map(c => c.episode.timestamp),
        examples: cluster.slice(0, 3).map(c => c.episode.text)
      };

      themes.push(theme);
    }

    this.longTerm.themes = themes;
    this.saveLongTerm();
  }

  getThemes() {
    return this.longTerm.themes;
  }
}

module.exports = { ConsolidationEngine };