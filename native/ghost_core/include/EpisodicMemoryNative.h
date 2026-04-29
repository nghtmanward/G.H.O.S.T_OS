#pragma once
#include <vector>
#include <string>

// A full episodic memory entry stored natively
struct EpisodeItem {
    int id;                        // unique episode ID
    std::string text;              // raw text content
    std::vector<float> embedding;  // semantic embedding
    float anomaly;                 // anomaly score
    float latentMag;               // latent magnitude
    long long timestamp;           // epoch ms
    std::string mood;              // mood label
    std::string source;            // "ghost-input", "mnist", etc.
};

class EpisodicMemoryNative {
public:
    EpisodicMemoryNative();

    // Add a new episode
    void addEpisode(const EpisodeItem& ep);

    // Get all episodes (read-only)
    const std::vector<EpisodeItem>& getAll() const;

    // Clear all episodes
    void clear();

    // Retrieve top-K similar episodes by embedding
    std::vector<int> retrieveTopK(
        const std::vector<float>& queryEmbedding,
        int topK
    ) const;

private:
    std::vector<EpisodeItem> episodes;
};