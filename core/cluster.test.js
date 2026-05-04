const {
  jaccard,
  cosineSim,
  similarity,
  clusterShards
} = require("./cluster");

// -----------------------------
// jaccard
// -----------------------------
describe("jaccard", () => {
  test("computes correct similarity", () => {
    const a = ["apple", "banana", "cherry"];
    const b = ["banana", "cherry", "date"];

    // intersection = 2, union = 4 → 0.5
    expect(jaccard(a, b)).toBeCloseTo(0.5);
  });

  test("returns 0 for empty sets", () => {
    expect(jaccard([], [])).toBe(0);
  });

  test("returns 0 when no overlap", () => {
    expect(jaccard(["a"], ["b"])).toBe(0);
  });
});

// -----------------------------
// cosineSim
// -----------------------------
describe("cosineSim", () => {
  test("computes cosine similarity correctly", () => {
    const a = [1, 0];
    const b = [1, 0];
    expect(cosineSim(a, b)).toBeCloseTo(1);
  });

  test("returns 0 for orthogonal vectors", () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSim(a, b)).toBeCloseTo(0);
  });

  test("handles zero vectors safely", () => {
    const a = [0, 0];
    const b = [0, 0];
    expect(cosineSim(a, b)).toBeCloseTo(0);
  });

  test("returns 0 for invalid inputs", () => {
    expect(cosineSim(null, [1, 2])).toBe(0);
    expect(cosineSim([1, 2], undefined)).toBe(0);
  });
});

// -----------------------------
// similarity (combined score)
// -----------------------------
describe("similarity", () => {
  const shardA = {
    keywords: ["apple", "banana"],
    tags: ["fruit"],
    embedding: [1, 0]
  };

  const shardB = {
    keywords: ["banana", "cherry"],
    tags: ["fruit"],
    embedding: [1, 0]
  };

  test("computes weighted similarity blend", () => {
    const score = similarity(shardA, shardB);

    // keyword jaccard = 1/3 ≈ 0.333
    // tag jaccard = 1
    // cosine = 1
    // total = 0.333*0.5 + 1*0.3 + 1*0.2 = 0.1665 + 0.3 + 0.2 = 0.6665
    expect(score).toBeCloseTo(0.6665, 3);
  });
});

// -----------------------------
// clusterShards
// -----------------------------
describe("clusterShards", () => {
  const base = {
    tags: [],
    embedding: [1, 0]
  };

  const shard1 = {
    ...base,
    keywords: ["apple", "banana"]
  };

  const shard2 = {
    ...base,
    keywords: ["apple", "banana"]
  };

  const shard3 = {
    ...base,
    keywords: ["zebra", "lion"]
  };

  test("clusters similar shards together", () => {
    const clusters = clusterShards([shard1, shard2, shard3], 0.5);

    // shard1 and shard2 identical → same cluster
    // shard3 unrelated → separate cluster
    expect(clusters.length).toBe(2);
    expect(clusters[0].length).toBe(2);
    expect(clusters[1].length).toBe(1);
  });

  test("each shard appears in exactly one cluster", () => {
    const shards = [shard1, shard2, shard3];
    const clusters = clusterShards(shards, 0.5);

    const flattened = clusters.flat();
    expect(flattened.length).toBe(3);
    expect(new Set(flattened).size).toBe(3);
  });

  test("threshold prevents clustering when similarity too low", () => {
    const clusters = clusterShards([shard1, shard3], 0.9);
    expect(clusters.length).toBe(2);
  });

  test("empty input returns empty array", () => {
    expect(clusterShards([])).toEqual([]);
  });
});
