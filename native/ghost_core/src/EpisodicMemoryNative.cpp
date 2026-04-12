#include "EpisodicMemoryNative.h"
#include "SemanticCore.h"

EpisodicMemoryNative::EpisodicMemoryNative()
    : episodes() {}

// Add a new episode with auto-increment ID
void EpisodicMemoryNative::addEpisode(const EpisodeItem& ep) {
    EpisodeItem stored = ep;
    stored.id = static_cast<int>(episodes.size());
    episodes.push_back(stored);
}

const std::vector<EpisodeItem>& EpisodicMemoryNative::getAll() const {
    return episodes;
}

void EpisodicMemoryNative::clear() {
    episodes.clear();
}

// Retrieve top-K similar episodes by embedding
std::vector<int> EpisodicMemoryNative::retrieveTopK(
    const std::vector<float>& queryEmbedding,
    int topK
) const {
    std::vector<EmbeddingItem> items;
    items.reserve(episodes.size());

    for (const auto& ep : episodes) {
        if (!ep.embedding.empty()) {
            items.push_back({ ep.id, ep.embedding });
        }
    }

    SemanticCore semantic;
    return semantic.findSimilar(queryEmbedding, items, topK);
}