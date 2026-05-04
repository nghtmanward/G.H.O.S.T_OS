jest.mock("./encoder", () => ({
  encodeShard: jest.fn().mockReturnValue({
    id: "default",
    keywords: [],
    tags: [],
    embedding: [1, 0],
    importance: 0,
    timestamp: 0,
    originalText: ""
  })
}));

jest.mock("./cluster", () => ({
  clusterShards: jest.fn().mockReturnValue([]) // safe default
}));

jest.mock("./summarizer", () => ({
  summarizeClusterData: jest.fn()
}));

const { encodeShard } = require("./encoder");
const { clusterShards } = require("./cluster");
const { summarizeClusterData } = require("./summarizer");

const { consolidate } = require("./consolidate");
const { TertiaryRecord } = require("./memory_models");

describe("consolidate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clusterShards.mockReturnValue([]);
    // Reset mock completely to clear any leftover mockReturnValueOnce queue
    encodeShard.mockReset();
    encodeShard.mockReturnValue({
      id: "default",
      keywords: [],
      tags: [],
      embedding: [1, 0],
      importance: 0,
      timestamp: 0,
      originalText: ""
    });
  });

  // -----------------------------
  // Helpers
  // -----------------------------
  function makeShard(id, text = "hello", importance = 0.2, daysAgo = 0) {
    const timestamp = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    const shard = {
      id,
      text,
      timestamp,
      consolidated: false
    };

    encodeShard.mockReturnValueOnce({
      id,
      keywords: ["hello"],
      tags: [],
      embedding: [1, 0],
      importance,
      timestamp,
      originalText: text
    });

    return shard;
  }

  // -----------------------------
  // Basic filtering
  // -----------------------------
  test("skips shards that are already consolidated", () => {
    const shard = makeShard("1");
    shard.consolidated = true;

    consolidate([shard], []);
    expect(encodeShard).not.toHaveBeenCalled();
  });

  test("skips shards older than recency window", () => {
    const oldShard = makeShard("1", "old", 0.5, 10); // 10 days ago
    consolidate([oldShard], []);
    expect(encodeShard).not.toHaveBeenCalled();
  });

  test("skips shards below importance threshold", () => {
    const shard = makeShard("1", "low", 0.01);
    consolidate([shard], []);
    expect(clusterShards).not.toHaveBeenCalled();
  });

  // -----------------------------
  // Clustering + summary
  // -----------------------------
  test("clusters encoded shards and processes clusters", () => {
    const s1 = makeShard("1");
    const s2 = makeShard("2");

    clusterShards.mockReturnValue([[{ id: "1" }, { id: "2" }]]);

    summarizeClusterData.mockReturnValue({
      theme: "test-theme",
      summary: "combined summary",
      tags: ["tag1"],
      mood_profile: { neutral: 1 }
    });

    const records = [];
    consolidate([s1, s2], records);

    expect(clusterShards).toHaveBeenCalled();
    expect(records.length).toBe(1);
    expect(records[0]).toBeInstanceOf(TertiaryRecord);
  });

  // -----------------------------
  // Merge into existing record
  // -----------------------------
  test("merges into existing record when theme matches", () => {
    const s1 = makeShard("1");
    const s2 = makeShard("2");

    clusterShards.mockReturnValue([[{ id: "1" }, { id: "2" }]]);

    summarizeClusterData.mockReturnValue({
      theme: "memory",
      summary: "summary text",
      tags: ["tagA"],
      mood_profile: { calm: 1 }
    });

    const existing = new TertiaryRecord({
      theme: "memory",
      summary: "old summary",
      tags: ["tagOld"],
      mood_profile: { calm: 1 },
      shard_ids: [],
      strength: 0.5
    });

    const records = [existing];

    consolidate([s1, s2], records);

    expect(records.length).toBe(1);
    expect(records[0].summary).toContain("summary text");
    expect(records[0].tags).toEqual(expect.arrayContaining(["tagA", "tagOld"]));
    expect(records[0].shard_ids).toEqual(["1", "2"]);
  });

  // -----------------------------
  // New record creation
  // -----------------------------
  test("creates new record when no match found", () => {
    const s1 = makeShard("1");
    const s2 = makeShard("2");

    clusterShards.mockReturnValue([[{ id: "1" }, { id: "2" }]]);

    summarizeClusterData.mockReturnValue({
      theme: "new-theme",
      summary: "summary text",
      tags: ["tagX"],
      mood_profile: { alert: 1 }
    });

    const records = [];
    consolidate([s1, s2], records);

    expect(records.length).toBe(1);
    expect(records[0].theme).toBe("new-theme");
  });

  // -----------------------------
  // Marking shards consolidated
  // -----------------------------
  test("marks shards as consolidated when processed", () => {
    const s1 = makeShard("1");
    const s2 = makeShard("2");

    clusterShards.mockReturnValue([[{ id: "1" }, { id: "2" }]]);

    summarizeClusterData.mockReturnValue({
      theme: "theme",
      summary: "summary",
      tags: [],
      mood_profile: {}
    });

    const records = [];
    consolidate([s1, s2], records);

    expect(s1.consolidated).toBe(true);
    expect(s2.consolidated).toBe(true);
    expect(typeof s1.consolidated_at).toBe("number");
  });

  // -----------------------------
  // Clusters of size < 2 are ignored
  // -----------------------------
  test("ignores clusters with only one shard", () => {
    const s1 = makeShard("1");

    clusterShards.mockReturnValue([[{ id: "1" }]]);

    const records = [];
    consolidate([s1], records);

    expect(records.length).toBe(0);
  });
});