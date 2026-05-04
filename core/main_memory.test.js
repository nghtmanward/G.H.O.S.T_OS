jest.mock("./storage", () => ({
  loadShards: jest.fn(),
  saveShards: jest.fn(),
  loadTertiary: jest.fn(),
  saveTertiary: jest.fn()
}));

jest.mock("./consolidate", () => ({
  consolidate: jest.fn()
}));

jest.mock("./decay", () => jest.fn());

jest.mock("./memory_models", () => ({
  EpisodicShard: jest.fn().mockImplementation((data) => ({
    ...data,
    mockShard: true
  }))
}));

const {
  loadShards,
  saveShards,
  loadTertiary,
  saveTertiary
} = require("./storage");

const { consolidate } = require("./consolidate");
const decay = require("./decay");
const { EpisodicShard } = require("./memory_models");

const mainMemory = require("./main_memory");

describe("MainMemory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(100_000_000);

    // Reset singleton state before every test
    mainMemory.shards = [];
    mainMemory.tertiary = [];
    mainMemory.lastConsolidation = 0;
    mainMemory.lastDecay = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // load()
  // ---------------------------------------------------------
  test("load() loads shards and tertiary", () => {
    loadShards.mockReturnValue([{ id: 1 }]);
    loadTertiary.mockReturnValue([{ t: 1 }]);

    mainMemory.load();

    expect(mainMemory.shards).toEqual([{ id: 1 }]);
    expect(mainMemory.tertiary).toEqual([{ t: 1 }]);
  });

  // ---------------------------------------------------------
  // save()
  // ---------------------------------------------------------
  test("save() writes shards and tertiary", () => {
    mainMemory.shards = [{ id: 1 }];
    mainMemory.tertiary = [{ t: 1 }];

    mainMemory.save();

    expect(saveShards).toHaveBeenCalledWith([{ id: 1 }]);
    expect(saveTertiary).toHaveBeenCalledWith([{ t: 1 }]);
  });

  // ---------------------------------------------------------
  // addShard()
  // ---------------------------------------------------------
  test("addShard creates a new EpisodicShard and stores it", () => {
    const shard = mainMemory.addShard({
      text: "hello",
      mood: "calm",
      tags: ["tag1"]
    });

    expect(EpisodicShard).toHaveBeenCalledWith({
      text: "hello",
      mood: "calm",
      tags: ["tag1"]
    });

    expect(shard.mockShard).toBe(true);
    expect(mainMemory.shards.includes(shard)).toBe(true);
  });

  // ---------------------------------------------------------
  // consolidateIfNeeded()
  // ---------------------------------------------------------
  test("consolidateIfNeeded does nothing if interval not reached", () => {
    mainMemory.lastConsolidation = 100_000_000 - 500; // only 500ms ago

    mainMemory.consolidateIfNeeded();

    expect(consolidate).not.toHaveBeenCalled();
  });

  test("consolidateIfNeeded runs consolidation when interval reached", () => {
    mainMemory.lastConsolidation = 0;
    mainMemory.shards = [{ s: 1 }];
    mainMemory.tertiary = [{ t: 1 }];

    mainMemory.consolidateIfNeeded();

    expect(consolidate).toHaveBeenCalledWith(
      mainMemory.shards,
      mainMemory.tertiary
    );
    expect(saveShards).toHaveBeenCalled();
    expect(saveTertiary).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // decayIfNeeded()
  // ---------------------------------------------------------
  test("decayIfNeeded does nothing if interval not reached", () => {
    mainMemory.lastDecay = 100_000_000 - 1000; // too recent

    mainMemory.decayIfNeeded();

    expect(decay).not.toHaveBeenCalled();
  });

  test("decayIfNeeded runs decay when interval reached", () => {
    mainMemory.lastDecay = 0;
    mainMemory.tertiary = [{ t: 1 }];

    decay.mockReturnValue([{ t: "decayed" }]);

    mainMemory.decayIfNeeded();

    expect(decay).toHaveBeenCalledWith([{ t: 1 }]);
    expect(mainMemory.tertiary).toEqual([{ t: "decayed" }]);
    expect(saveShards).toHaveBeenCalled();
    expect(saveTertiary).toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // getMemory()
  // ---------------------------------------------------------
  test("getMemory returns shards + tertiary", () => {
    mainMemory.shards = [{ a: 1 }];
    mainMemory.tertiary = [{ b: 2 }];

    const out = mainMemory.getMemory();

    expect(out.shards).toEqual([{ a: 1 }]);
    expect(out.tertiary).toEqual([{ b: 2 }]);
  });
});