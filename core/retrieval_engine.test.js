const fs = require("fs");
const path = require("path");

jest.mock("fs");
jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/"))
}));

jest.mock("./semantic_engine", () => ({
  SemanticEngine: jest.fn().mockImplementation(() => ({
    embed: jest.fn((txt) => [txt.length]), // deterministic embedding
    findSimilarEpisodes: jest.fn(() => [{ item: { text: "semantic-ep" } }]),
    findSimilarShards: jest.fn(() => ["shard-semantic"]),
    findSimilarTertiary: jest.fn(() => ["tertiary-semantic"]),
    findSimilarThemes: jest.fn(() => ["theme-semantic"])
  }))
}));

jest.mock("./main_memory", () => ({
  shards: [{ originalText: "shardA" }],
  tertiary: [{ summary: "t1" }]
}));

// Mock native module as unavailable
jest.mock("../native/build/Release/ghost_core.node", () => {
  throw new Error("native unavailable");
}, { virtual: true });

const { SemanticEngine } = require("./semantic_engine");
const mainMemory = require("./main_memory");
const { RetrievalEngine } = require("./retrieval_engine");

describe("RetrievalEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // loadAllShards()
  // ---------------------------------------------------------
  test("loadAllShards returns empty when directory missing", () => {
    fs.existsSync.mockReturnValue(false);

    const eng = new RetrievalEngine("/mem");
    const out = eng.loadAllShards();

    expect(out).toEqual([]);
  });

  test("loadAllShards loads and sorts shard files", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(["shard_2.json", "shard_1.json"]);
    fs.readFileSync.mockImplementation((file) => {
      if (file.includes("shard_1")) return JSON.stringify({ index: 1, episodes: [] });
      if (file.includes("shard_2")) return JSON.stringify({ index: 2, episodes: [] });
    });

    const eng = new RetrievalEngine("/mem");
    const out = eng.loadAllShards();

    expect(out[0].index).toBe(1);
    expect(out[1].index).toBe(2);
  });

  test("loadAllShards filters out corrupted files", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(["shard_1.json"]);
    fs.readFileSync.mockImplementation(() => "{bad json");

    const error = jest.spyOn(console, "error").mockImplementation(() => {});

    const eng = new RetrievalEngine("/mem");
    const out = eng.loadAllShards();

    expect(out).toEqual([]);
    expect(error).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // refresh()
  // ---------------------------------------------------------
  test("refresh loads shards and flattens episodes", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(["shard_1.json"]);
    fs.readFileSync.mockReturnValue(JSON.stringify({
      index: 1,
      episodes: [{ text: "A" }, { text: "B" }]
    }));

    const eng = new RetrievalEngine("/mem");

    expect(eng._episodicEpisodes.length).toBe(2);
  });

  // ---------------------------------------------------------
  // basic searches
  // ---------------------------------------------------------
  function setupShardWithEpisodes(episodes) {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(["shard_1.json"]);
    fs.readFileSync.mockReturnValue(JSON.stringify({
      index: 1,
      episodes
    }));
  }

  test("findByMood filters episodes", () => {
    setupShardWithEpisodes([
      { mood: "happy" },
      { mood: "sad" }
    ]);

    const eng = new RetrievalEngine("/mem");
    const out = eng.findByMood("happy");

    expect(out.length).toBe(1);
    expect(out[0].mood).toBe("happy");
  });

  test("findByAnomaly filters episodes", () => {
    setupShardWithEpisodes([
      { anomaly: 0.1 },
      { anomaly: 0.9 }
    ]);

    const eng = new RetrievalEngine("/mem");
    const out = eng.findByAnomaly(0.5);

    expect(out.length).toBe(1);
    expect(out[0].anomaly).toBe(0.9);
  });

  test("findByTime filters by timestamp", () => {
    setupShardWithEpisodes([
      { timestamp: 10 },
      { timestamp: 20 }
    ]);

    const eng = new RetrievalEngine("/mem");
    const out = eng.findByTime(15, 25);

    expect(out.length).toBe(1);
    expect(out[0].timestamp).toBe(20);
  });

  test("findByLatentMag filters episodes", () => {
    setupShardWithEpisodes([
      { latentMag: 0.2 },
      { latentMag: 0.8 }
    ]);

    const eng = new RetrievalEngine("/mem");
    const out = eng.findByLatentMag(0.5);

    expect(out.length).toBe(1);
    expect(out[0].latentMag).toBe(0.8);
  });

  test("findByKeyword matches text", () => {
    setupShardWithEpisodes([
      { text: "hello world" },
      { text: "other" }
    ]);

    const eng = new RetrievalEngine("/mem");
    const out = eng.findByKeyword("hello");

    expect(out.length).toBe(1);
    expect(out[0].text).toBe("hello world");
  });

  // ---------------------------------------------------------
  // semantic search (JS fallback)
  // ---------------------------------------------------------
  test("findByMeaning uses semantic engine", () => {
    setupShardWithEpisodes([{ text: "A" }]);

    const eng = new RetrievalEngine("/mem");
    const out = eng.findByMeaning("query", 5);

    expect(out[0].item.text).toBe("semantic-ep");
  });

  test("findByMeaningNative falls back to JS when native unavailable", () => {
    setupShardWithEpisodes([{ text: "A" }]);

    const eng = new RetrievalEngine("/mem");
    const out = eng.findByMeaningNative("query", 5);

    expect(out[0].item.text).toBe("semantic-ep");
  });

  // ---------------------------------------------------------
  // shard semantic search
  // ---------------------------------------------------------
  test("findSimilarSemanticShards uses semantic engine", () => {
    const eng = new RetrievalEngine("/mem");
    const out = eng.findSimilarSemanticShards("query");

    expect(out).toEqual(["shard-semantic"]);
  });

  test("findSimilarSemanticShardsNative falls back to JS when native unavailable", () => {
    const eng = new RetrievalEngine("/mem");
    const out = eng.findSimilarSemanticShardsNative("query");

    expect(out).toEqual(["shard-semantic"]);
  });

  // ---------------------------------------------------------
  // tertiary + themes
  // ---------------------------------------------------------
  test("findSimilarTertiary uses semantic engine", () => {
    const eng = new RetrievalEngine("/mem");
    const out = eng.findSimilarTertiary("query");

    expect(out).toEqual(["tertiary-semantic"]);
  });

  test("findSimilarThemes uses semantic engine", () => {
    const eng = new RetrievalEngine("/mem");
    const out = eng.findSimilarThemes("query");

    expect(out).toEqual(["theme-semantic"]);
  });

  // ---------------------------------------------------------
  // retrieve()
  // ---------------------------------------------------------
  test("retrieve returns unified semantic retrieval object", () => {
    setupShardWithEpisodes([{ text: "A" }]);

    const eng = new RetrievalEngine("/mem");
    const out = eng.retrieve("query");

    expect(out.episodic.length).toBeGreaterThan(0);
    expect(out.shards).toEqual(["shard-semantic"]);
    expect(out.tertiary).toEqual(["tertiary-semantic"]);
    expect(out.themes).toEqual(["theme-semantic"]);
  });
});
