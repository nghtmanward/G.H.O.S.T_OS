#pragma once
#include <vector>
#include "MemoryShard.h"

class MemorySystem {
public:
    // Add a new semantic shard to the system
    void addShard(const MemoryShard& shard);

    // Get read-only access to all shards
    const std::vector<MemoryShard>& getShards() const;

    // How many shards are currently stored
    std::size_t size() const;

    // Remove all shards
    void clear();

private:
    std::vector<MemoryShard> shards;
};