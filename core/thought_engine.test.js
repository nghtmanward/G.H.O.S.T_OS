// Shared mutable mock so tests can control what getLensSignals returns,
// the same pattern the old file used with mockMemory.tertiary.
let mockLensSignals = {
  activeCandidates: [],
  contradiction: null,
  moodSignal: null,
  topicSignal: null
};

jest.mock("./retrieval_engine", () => ({
  RetrievalEngine: jest.fn().mockImplementation(() => ({
    getLensSignals: jest.fn(() => mockLensSignals)
  }))
}));

describe("ThoughtEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(123456);

    // Reset lens signals before each test
    mockLensSignals = {
      activeCandidates: [],
      contradiction: null,
      moodSignal: null,
      topicSignal: null
    };
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
  // selectLens
  // ---------------------------------------------------------
  test("selectLens returns mode 'none' when no signals present", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    const lens = te.selectLens({ contradiction: null, moodSignal: null, topicSignal: null });
    expect(lens.mode).toBe("none");
  });

  test("selectLens picks the single strongest signal", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    const lens = te.selectLens({
      contradiction: { strength: 0.9 },
      moodSignal: { strength: 0.2 },
      topicSignal: { strength: 0.1 }
    });
    expect(lens).toEqual({ mode: "single", primary: "contradiction" });
  });

  test("selectLens blends when top two signals are close", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    const lens = te.selectLens({
      contradiction: { strength: 0.8 },
      moodSignal: { strength: 0.75 },
      topicSignal: { strength: 0.1 }
    });
    expect(lens.mode).toBe("blend");
    expect([lens.primary, lens.secondary].sort()).toEqual(["contradiction", "mood"]);
  });

  // ---------------------------------------------------------
  // buildLensContext
  // ---------------------------------------------------------
  test("buildLensContext returns noticing mode + pendingDreamBlend for a contradiction+mood blend", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    const signals = {
      contradiction: { shardA: { text: "shard A text" }, shardB: { text: "shard B text" }, strength: 0.8 },
      moodSignal: { shard: { text: "mood shard text" }, strength: 0.75 }
    };
    const lens = { mode: "blend", primary: "contradiction", secondary: "mood" };

    const ctx = te.buildLensContext(lens, signals);
    expect(ctx.mode).toBe("noticing");
    expect(ctx.pendingDreamBlend.contradiction).toBe(signals.contradiction);
    expect(ctx.pendingDreamBlend.moodSignal).toBe(signals.moodSignal);
  });

  test("buildLensContext returns tension mode for a single contradiction lens", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    const signals = {
      contradiction: { shardA: { text: "the contested memory" }, shardB: { text: "other" }, strength: 0.9 }
    };
    const lens = { mode: "single", primary: "contradiction" };

    const ctx = te.buildLensContext(lens, signals);
    expect(ctx.mode).toBe("tension");
    expect(ctx.text).toContain("the contested memory");
    expect(ctx.toneLean).toBe("analytic");
  });

  // ---------------------------------------------------------
  // toneBiasFromLens
  // ---------------------------------------------------------
  test("toneBiasFromLens bumps the lens-indicated tone", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    const base = { poetic: 0.25, analytic: 0.25, emotional: 0.25, cryptic: 0.25 };
    const bumped = te.toneBiasFromLens({ toneLean: "cryptic" }, base);

    expect(bumped.cryptic).toBeCloseTo(0.45);
    expect(base.cryptic).toBe(0.25); // original untouched
  });

  test("toneBiasFromLens returns base unchanged when lens has no toneLean", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    const ThoughtEngine = require("./thought_engine");
    const te = new ThoughtEngine();

    const base = { poetic: 0.25 };
    expect(te.toneBiasFromLens({ mode: "none" }, base)).toEqual(base);
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
    expect(out.pendingDreamBlend).toBeNull();
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
  // lens integration inside generate
  // ---------------------------------------------------------
  test("generate incorporates lens content when a topic signal is available", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    mockLensSignals = {
      activeCandidates: [],
      contradiction: null,
      moodSignal: null,
      topicSignal: { shard: { text: "MemoryAlpha, a long forgotten place" }, strength: 0.9 }
    };

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
      traits: []
    });

    expect(out.text.toLowerCase()).toContain("memoryalpha");
  });

  test("generate surfaces pendingDreamBlend when contradiction and mood both fire", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      ThoughtEngine: "2.2.1-2026.05.01"
    }));

    mockLensSignals = {
      activeCandidates: [],
      contradiction: { shardA: { text: "shard A" }, shardB: { text: "shard B" }, strength: 0.8 },
      moodSignal: { shard: { text: "mood shard" }, strength: 0.75 },
      topicSignal: null
    };

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
      traits: []
    });

    expect(out.pendingDreamBlend).not.toBeNull();
    expect(out.pendingDreamBlend.contradiction).toBe(mockLensSignals.contradiction);
    expect(out.pendingDreamBlend.moodSignal).toBe(mockLensSignals.moodSignal);
  });
});