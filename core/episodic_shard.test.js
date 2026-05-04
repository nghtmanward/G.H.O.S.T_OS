const {
  EpisodicShard,
  SHARD_SCHEMA,
  SHARD_VERSION,
  MAX_EPISODES_PER_SHARD
} = require("./episodic_shard");

describe("EpisodicShard", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -----------------------------
  // constructor
  // -----------------------------
  test("initializes with correct schema, version, and index", () => {
    const shard = new EpisodicShard(3);

    expect(shard.schema).toBe(SHARD_SCHEMA);
    expect(shard.version).toBe(SHARD_VERSION);
    expect(shard.index).toBe(3);
    expect(shard.episodes).toEqual([]);
    expect(shard.semanticSummary).toBeNull();
  });

  // -----------------------------
  // addEpisode
  // -----------------------------
  test("addEpisode sets startTimestamp on first episode", () => {
    const shard = new EpisodicShard(1);

    shard.addEpisode({ timestamp: 111 });
    expect(shard.startTimestamp).toBe(111);
    expect(shard.endTimestamp).toBe(111);
  });

  test("addEpisode updates endTimestamp on each episode", () => {
    const shard = new EpisodicShard(1);

    shard.addEpisode({ timestamp: 111 });
    shard.addEpisode({ timestamp: 222 });

    expect(shard.startTimestamp).toBe(111);
    expect(shard.endTimestamp).toBe(222);
  });

  test("addEpisode ignores invalid input", () => {
    const shard = new EpisodicShard(1);

    shard.addEpisode(null);
    shard.addEpisode(undefined);
    shard.addEpisode(123);

    expect(shard.episodes.length).toBe(0);
  });

  // -----------------------------
  // count getter
  // -----------------------------
  test("count returns number of episodes", () => {
    const shard = new EpisodicShard(1);

    shard.addEpisode({ timestamp: 1 });
    shard.addEpisode({ timestamp: 2 });

    expect(shard.count).toBe(2);
  });

  // -----------------------------
  // isFull
  // -----------------------------
  test("isFull returns true when reaching MAX_EPISODES_PER_SHARD", () => {
    const shard = new EpisodicShard(1);

    for (let i = 0; i < MAX_EPISODES_PER_SHARD; i++) {
      shard.addEpisode({ timestamp: i });
    }

    expect(shard.isFull()).toBe(true);
  });

  test("isFull returns false when below capacity", () => {
    const shard = new EpisodicShard(1);
    shard.addEpisode({ timestamp: 1 });

    expect(shard.isFull()).toBe(false);
  });

  // -----------------------------
  // buildSummary
  // -----------------------------
  test("buildSummary returns neutral defaults for empty shard", () => {
    const shard = new EpisodicShard(1);
    const summary = shard.buildSummary();

    expect(summary.avgAnomaly).toBe(0);
    expect(summary.avgLatentMag).toBe(0);
    expect(summary.dominantMood).toBe("neutral");
    expect(summary.topics).toEqual([]);
  });

  test("buildSummary computes averages and dominant mood", () => {
    const shard = new EpisodicShard(1);

    shard.addEpisode({ anomaly: 1, latentMag: 2, mood: "happy", timestamp: 1 });
    shard.addEpisode({ anomaly: 3, latentMag: 4, mood: "sad", timestamp: 2 });
    shard.addEpisode({ anomaly: 5, latentMag: 6, mood: "happy", timestamp: 3 });

    const summary = shard.buildSummary();

    expect(summary.avgAnomaly).toBeCloseTo((1 + 3 + 5) / 3);
    expect(summary.avgLatentMag).toBeCloseTo((2 + 4 + 6) / 3);
    expect(summary.dominantMood).toBe("happy");
  });

  // -----------------------------
  // toJSON
  // -----------------------------
  test("toJSON returns correct structure including semanticSummary", () => {
    const shard = new EpisodicShard(1);

    shard.addEpisode({ timestamp: 111, anomaly: 1, latentMag: 2, mood: "calm" });
    shard.semanticSummary = { keywords: ["a"], embedding: [0.1, 0.2] };

    const json = shard.toJSON();

    expect(json.schema).toBe(SHARD_SCHEMA);
    expect(json.version).toBe(SHARD_VERSION);
    expect(json.index).toBe(1);
    expect(json.startTimestamp).toBe(111);
    expect(json.endTimestamp).toBe(111);
    expect(json.count).toBe(1);
    expect(json.summary).toBeDefined();
    expect(json.semanticSummary).toEqual({ keywords: ["a"], embedding: [0.1, 0.2] });
  });

  test("toJSON sets semanticSummary to null when not provided", () => {
    const shard = new EpisodicShard(1);
    shard.addEpisode({ timestamp: 111 });

    const json = shard.toJSON();
    expect(json.semanticSummary).toBeNull();
  });
});
