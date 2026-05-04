/**
 * @jest-environment node
 */

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([])
}));

jest.mock("./episodic_shard", () => ({
  EpisodicShard: jest.fn().mockImplementation((index, data = {}) => ({
    index,
    episodes: data.episodes || [],
    startTimestamp: data.startTimestamp || 0,
    endTimestamp: data.endTimestamp || 0,
    isFull: jest.fn().mockReturnValue(false),
    toJSON: jest.fn().mockReturnValue({ index })
  })),
  MAX_EPISODES_PER_SHARD: 100
}));

jest.mock("./encoder", () => ({
  encodeText: jest.fn().mockReturnValue([]),
  extractKeywords: jest.fn().mockReturnValue([]),
  computeImportance: jest.fn().mockReturnValue(0)
}));

const fs = require("fs");
const { EpisodicShard } = require("./episodic_shard");
const ShardManager = require("./shard_manager");

describe("ShardManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------
  // constructor loads index + current shard
  // ---------------------------------------------------------
  test("constructor loads index and current shard", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ lastShard: 1 }));

    const sm = new ShardManager("/mem");

    expect(fs.existsSync).toHaveBeenCalled();
    expect(EpisodicShard).toHaveBeenCalled();
    expect(sm.currentIndex).toBe(1);
  });

  // ---------------------------------------------------------
  // loadIndex creates index file if missing
  // ---------------------------------------------------------
  test("loadIndex creates index file if missing", () => {
    fs.existsSync.mockReturnValue(false);

    const sm = new ShardManager("/mem");

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(sm.currentIndex).toBe(1);
  });

  // ---------------------------------------------------------
  // loadShard loads existing shard file
  // ---------------------------------------------------------
  test("loadShard loads existing shard file", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        index: 2,
        episodes: [{ id: 1 }],
        startTimestamp: 10,
        endTimestamp: 20
      })
    );

    const sm = new ShardManager("/mem");
    const shard = sm.loadShard(2);

    expect(shard.index).toBe(2);
    expect(shard.episodes.length).toBe(1);
    expect(shard.startTimestamp).toBe(10);
    expect(shard.endTimestamp).toBe(20);
  });

  // ---------------------------------------------------------
  // dump filters corrupted files
  // ---------------------------------------------------------
  test("dump filters corrupted files", () => {
    fs.existsSync.mockReturnValue(true);
    // Valid index file so constructor doesn't crash
    fs.readFileSync.mockReturnValue(JSON.stringify({ lastShard: 1 }));

    const sm = new ShardManager("/mem");

    // Now simulate corrupted shard files during dump
    fs.readdirSync.mockReturnValue(["shard_1.json"]);
    fs.readFileSync.mockReturnValueOnce("{ bad json }");

    const result = sm.dump();
    expect(result).toEqual([]);
  });

  // ---------------------------------------------------------
  // load writes shard data to disk and reloads current shard
  // ---------------------------------------------------------
  test("load writes shard data to disk and reloads current shard", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ lastShard: 1 }));

    const sm = new ShardManager("/mem");

    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        index: 1,
        episodes: [{ id: 99 }],
        startTimestamp: 5,
        endTimestamp: 15
      })
    );

    // load() expects an array
    sm.load([{
      index: 1,
      episodes: [{ id: 99 }],
      startTimestamp: 5,
      endTimestamp: 15
    }]);

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(sm.currentShard.index).toBe(1);
  });
});