#pragma once
#include <vector>
#include <string>

// Represents an episode or shard embedding passed from JS
struct EmbeddingItem {
    int id;                         // episode or shard ID
    std::vector<float> embedding;   // semantic vector
};

class SemanticCore {
public:
    // Compute top-K most similar embeddings to the query vector
    std::vector<int> findSimilar(
        const std::vector<float>& queryEmbedding,
        const std::vector<EmbeddingItem>& items,
        int topK
    ) const;

private:
    // Cosine similarity helper
    float cosine(
        const std::vector<float>& a,
        const std::vector<float>& b
    ) const;
};