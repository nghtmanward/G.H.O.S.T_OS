#pragma once

#include <vector>

namespace ghost {

    // Basic vector ops
    double dot(const std::vector<double>& a, const std::vector<double>& b);
    double magnitude(const std::vector<double>& v);
    std::vector<double> normalize(const std::vector<double>& v);

    // Cosine similarity between two vectors
    double cosineSimilarity(const std::vector<double>& a, const std::vector<double>& b);

    // Simple anomaly score: 1 - cosineSimilarity vs baseline
    double anomalyScore(const std::vector<double>& v,
                        const std::vector<double>& baseline);

}