#include "RetrievalEngine.h"

std::vector<int> RetrievalEngine::retrieveTopK(
    const std::vector<float>& queryEmbedding,
    const std::vector<EmbeddingItem>& items,
    int topK
) const {
    // Directly use SemanticCore's similarity search
    return semantic.findSimilar(queryEmbedding, items, topK);
}

std::vector<int> RetrievalEngine::retrieveFromShards(
    const std::vector<float>& queryEmbedding,
    const std::vector<MemoryShard>& shards,
    int topK
) const {
    std::vector<EmbeddingItem> items;
    items.reserve(shards.size());

    // Convert MemoryShard → EmbeddingItem
    for (const auto& shard : shards) {
        if (!shard.embedding.empty()) {
            items.push_back({ shard.id, shard.embedding });
        }
    }

    // Reuse the same top‑K logic
    return semantic.findSimilar(queryEmbedding, items, topK);
}