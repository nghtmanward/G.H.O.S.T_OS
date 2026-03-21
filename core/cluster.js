// /core/cluster.js

// -----------------------------
// Utility: Jaccard Similarity
// -----------------------------
function jaccard(setA, setB) {
    const a = new Set(setA);
    const b = new Set(setB);

    const intersection = new Set([...a].filter(x => b.has(x)));
    const union = new Set([...a, ...b]);

    return union.size === 0 ? 0 : intersection.size / union.size;
}

// -----------------------------
// Utility: Cosine Similarity (optional embeddings)
// -----------------------------
function cosineSim(vecA, vecB) {
    if (!vecA || !vecB) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

// -----------------------------
// Combined Similarity Score
// -----------------------------
function similarity(a, b) {
    const keywordSim = jaccard(a.keywords, b.keywords);
    const tagSim = jaccard(a.tags, b.tags);
    const embedSim = cosineSim(a.embedding, b.embedding);

    // Weighted blend (generic, domain-neutral)
    return (
        keywordSim * 0.5 +
        tagSim * 0.3 +
        embedSim * 0.2
    );
}

// -----------------------------
// Clustering Engine
// -----------------------------
function clusterShards(encodedShards, threshold = 0.35) {
    const clusters = [];
    const visited = new Set();

    for (let i = 0; i < encodedShards.length; i++) {
        if (visited.has(i)) continue;

        const cluster = [encodedShards[i]];
        visited.add(i);

        for (let j = i + 1; j < encodedShards.length; j++) {
            if (visited.has(j)) continue;

            const sim = similarity(encodedShards[i], encodedShards[j]);

            if (sim >= threshold) {
                cluster.push(encodedShards[j]);
                visited.add(j);
            }
        }

        clusters.push(cluster);
    }

    return clusters;
}

module.exports = {
    jaccard,
    cosineSim,
    similarity,
    clusterShards
};