#pragma once
#include <string>
#include <vector>

struct MemoryShard {
    int id;                             // unique shard index
    std::string content;                // raw text or summary
    float emotionalWeight = 0.0f;       // emotional intensity
    float relevance = 0.0f;             // semantic relevance score
    float decay = 1.0f;                 // time-based decay factor
    std::vector<float> embedding;       // semantic vector
};