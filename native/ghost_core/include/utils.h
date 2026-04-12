#pragma once
#include <vector>
#include <string>

namespace utils {

    // Normalize a vector to unit length (safe for zero vectors)
    void normalize(std::vector<float>& v);

    // Compute dot product between two vectors
    float dot(const std::vector<float>& a, const std::vector<float>& b);

    // Compute magnitude of a vector
    float magnitude(const std::vector<float>& v);

    // Safe check: are two vectors same size and non-empty?
    bool sameSizeNonEmpty(const std::vector<float>& a, const std::vector<float>& b);

}