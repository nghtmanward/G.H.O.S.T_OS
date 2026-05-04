// Shared mock so ThoughtEngine and tests see the same memory object
const mockMemory = { tertiary: [] };

jest.mock("./main_memory", () => mockMemory);

jest.mock("./retrieval_engine", () => ({
  RetrievalEngine: jest.fn().mockImplementation(() => ({
    retrieve: jest.fn(() => ({ episodic: [], shards: [] })),
    findByMeaningNative: jest.fn(() => ["native-ep"]),
    findSimilarSemanticShardsNative: jest.fn(() => ["native-shard"])
  }))
}));

const mainMemory = require("./main_memory");
const { RetrievalEngine } = require("./retrieval_engine");

describe("ThoughtEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(123456);

    // Reset semantic memory before each test
    mockMemory.tertiary = [];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // constructor + version validation
  // ---------------------------------------------------------
  test("constructor loads registry and validates version", () => {
    jest.resetModules();

    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    expect(() => new ThoughtEngine()).not.toThrow();
  });

  test("constructor throws on version mismatch", () => {
    jest.resetModules();

    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "WRONG"
    }));

    const ThoughtEngine = require("./thought_engine");
    expect(() => new ThoughtEngine()).toThrow("version mismatch");
  });

  // ---------------------------------------------------------
  // safeVal / safeArray
  // ---------------------------------------------------------
  test("safeVal returns fallback for invalid numbers", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();
    expect(te.safeVal(NaN, 5)).toBe(5);
    expect(te.safeVal("x", 3)).toBe(3);
  });

  test("safeArray returns empty array for invalid input", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();
    expect(te.safeArray(null)).toEqual([]);
    expect(te.safeArray("x")).toEqual([]);
  });

  // ---------------------------------------------------------
  // latentNoise
  // ---------------------------------------------------------
  test("latentNoise computes deterministic noise", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();
    const noise = te.latentNoise([1, 2, 3]);
    expect(noise).toBeGreaterThanOrEqual(0);
    expect(noise).toBeLessThanOrEqual(1);
  });

  // ---------------------------------------------------------
  // pick
  // ---------------------------------------------------------
  test("pick selects element based on t", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();
    const arr = ["a", "b", "c"];
    expect(te.pick(arr, 0)).toBe("a");
    expect(te.pick(arr, 0.5)).toBe("b");
  });

  // ---------------------------------------------------------
  // weightPool
  // ---------------------------------------------------------
  test("weightPool repeats pool based on weight", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();
    const out = te.weightPool(["x"], 0.5);
    expect(out.length).toBeGreaterThan(1);
  });

  // ---------------------------------------------------------
  // getSemanticContext
  // ---------------------------------------------------------
  test("getSemanticContext returns fallback when no tertiary", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    mockMemory.tertiary = [];

    const ctx = te.getSemanticContext();
    expect(ctx.theme).toBeNull();
    expect(ctx.related).toEqual([]);
  });

  test("getSemanticContext returns strongest record", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    mockMemory.tertiary = [
      { strength: 1, theme: "alpha", summary: "sumA" },
      { strength: 5, theme: "beta", summary: "sumB" }
    ];

    const ctx = te.getSemanticContext();

    expect(ctx.theme).toBe("beta");
    expect(ctx.summary).toBe("sumB");
    expect(ctx.nativeRelated.episodic).toEqual(["native-ep"]);
  });

  // ---------------------------------------------------------
  // generate() — core behavior
  // ---------------------------------------------------------
  test("generate returns a thought and metadata", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    mockMemory.tertiary = [
      { strength: 10, theme: "gamma", summary: "sumG" }
    ];

    const out = te.generate({
      latent: [0.1, 0.2],
      anomaly: 0.1,
      predLoss: 0.2,
      attention: [0.1, 0.9],
      mood: "neutral",
      intensity: 0.5,
      styleBias: { poetic: 0.25, analytic: 0.25, emotional: 0.25, cryptic: 0.25 },
      moodBaseline: 0,
      traits: [0.1, 0, 0.2, 0]
    });

    expect(out.text.length).toBeGreaterThan(0);
    expect(out.metadata.thought).toBe(out.text);
    expect(out.metadata.semanticNative.episodic).toEqual(["native-ep"]);
    expect(te.cooldown).toBe(15);
  });

  test("generate uses cachedFragments when provided", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    const out = te.generate({
      latent: [],
      anomaly: 0,
      predLoss: 0,
      attention: [1],
      mood: "neutral",
      intensity: 0,
      styleBias: {},
      moodBaseline: 0,
      traits: [],
      cachedFragments: {
        starts: ["LLM_START"],
        ends: ["LLM_END"]
      }
    });

    expect(out.metadata.llmAugmented).toBe(true);
    expect(out.text).toContain("LLM_START");
  });

  // ---------------------------------------------------------
  // cooldown behavior
  // ---------------------------------------------------------
  test("generate returns lastThought during cooldown", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    const first = te.generate({
      latent: [],
      anomaly: 0,
      predLoss: 0,
      attention: [1],
      mood: "neutral",
      intensity: 0,
      styleBias: {},
      moodBaseline: 0,
      traits: []
    });

    const second = te.generate({
      latent: [],
      anomaly: 0,
      predLoss: 0,
      attention: [1],
      mood: "neutral",
      intensity: 0,
      styleBias: {},
      moodBaseline: 0,
      traits: []
    });

    expect(second.text).toBe(first.text);
    expect(te.cooldown).toBe(14);
  });

  // ---------------------------------------------------------
  // semantic integration inside generate
  // ---------------------------------------------------------
  test("generate incorporates semantic theme when available", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    mockMemory.tertiary = [
      { strength: 10, theme: "MemoryAlpha", summary: "A long forgotten place" }
    ];

    const out = te.generate({
      latent: [],
      anomaly: 0,
      predLoss: 0,
      attention: [1],
      mood: "neutral",
      intensity: 0,
      styleBias: {},
      moodBaseline: 0,
      traits: []
    });

    expect(out.text.toLowerCase()).toContain("memoryalpha".toLowerCase());
  });
});
