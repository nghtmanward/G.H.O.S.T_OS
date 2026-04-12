#include "SemanticCore.h"
#include "utils.h"
#include <algorithm>   // for std::sort
#include <cmath>

float SemanticCore::cosine(
    const std::vector<float>& a,
    const std::vector<float>& b
) const {
    if (!utils::sameSizeNonEmpty(a, b)) {
        return 0.0f;
    }

    float dotVal = utils::dot(a, b);
    float magA = utils::magnitude(a);
    float magB = utils::magnitude(b);

    if (magA == 0.0f || magB == 0.0f) {
        return 0.0f;
    }

    return dotVal / (magA * magB);
}

std::vector<int> SemanticCore::findSimilar(
    const std::vector<float>& queryEmbedding,
    const std::vector<EmbeddingItem>& items,
    int topK
) const {
    std::vector<int> result;

    if (queryEmbedding.empty() || items.empty() || topK <= 0) {
        return result;
    }

    // Compute similarity scores
    struct ScoredItem {
        int id;
        float score;
    };

    std::vector<ScoredItem> scored;
    scored.reserve(items.size());

    for (const auto& item : items) {
        float score = cosine(queryEmbedding, item.embedding);
        scored.push_back({ item.id, score });
    }

    // Sort by descending similarity
    std::sort(scored.begin(), scored.end(),
        [](const ScoredItem& a, const ScoredItem& b) {
            return a.score > b.score;
        }
    );

    // Take top-K IDs
    int count = std::min(topK, static_cast<int>(scored.size()));
    for (int i = 0; i < count; ++i) {
        result.push_back(scored[i].id);
    }

    return result;
}