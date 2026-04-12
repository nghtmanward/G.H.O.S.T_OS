#pragma once
#include <vector>
#include "SemanticCore.h"
#include "MemoryShard.h"

class RetrievalEngine {
public:
    RetrievalEngine() = default;

    // Retrieve top-K similar embeddings from a list of items
    std::vector<int> retrieveTopK(
        const std::vector<float>& queryEmbedding,
        const std::vector<EmbeddingItem>& items,
        int topK
    ) const;

    // Retrieve top-K from stored semantic shards
    std::vector<int> retrieveFromShards(
        const std::vector<float>& queryEmbedding,
        const std::vector<MemoryShard>& shards,
        int topK
    ) const;

private:
    SemanticCore semantic;
};