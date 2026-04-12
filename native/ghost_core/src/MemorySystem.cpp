#include "MemorySystem.h"

void MemorySystem::addShard(const MemoryShard& shard) {
    shards.push_back(shard);
}

const std::vector<MemoryShard>& MemorySystem::getShards() const {
    return shards;
}

std::size_t MemorySystem::size() const {
    return shards.size();
}

void MemorySystem::clear() {
    shards.clear();
}