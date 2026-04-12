#include "utils.h"
#include <cmath>

namespace utils {

    void normalize(std::vector<float>& v) {
        float mag = magnitude(v);
        if (mag == 0.0f) {
            return; // leave zero vectors unchanged
        }
        for (float& x : v) {
            x /= mag;
        }
    }

    float dot(const std::vector<float>& a, const std::vector<float>& b) {
        if (a.size() != b.size() || a.empty()) {
            return 0.0f;
        }

        float sum = 0.0f;
        for (std::size_t i = 0; i < a.size(); ++i) {
            sum += a[i] * b[i];
        }
        return sum;
    }

    float magnitude(const std::vector<float>& v) {
        float sum = 0.0f;
        for (float x : v) {
            sum += x * x;
        }
        return std::sqrt(sum);
    }

    bool sameSizeNonEmpty(const std::vector<float>& a, const std::vector<float>& b) {
        return (!a.empty() && a.size() == b.size());
    }

}