/**
 * @jest-environment node
 * @jest-isolate-modules
 */

jest.mock("./version_registry.js", () => ({
  ReflectionState: "2.0.0-2026.01.08"
}));

jest.mock("./main_memory", () => ({
  tertiary: []
}));

jest.mock("./retrieval_engine", () => ({
  RetrievalEngine: jest.fn().mockImplementation(() => ({
    retrieve: jest.fn(() => ["rel1", "rel2"])
  }))
}));

// ---------------------------------------------------------
// Load modules ONLY after mocks using jest.isolateModules()
// ---------------------------------------------------------

let mainMemory;
let RetrievalEngine;
let ReflectionState;

jest.isolateModules(() => {
  mainMemory = require("./main_memory");
  ({ RetrievalEngine } = require("./retrieval_engine"));
  ReflectionState = require("./reflection_state");
});


describe("ReflectionState", () => {
  let retrievalMock;

  beforeEach(() => {
    jest.clearAllMocks();
    retrievalMock = new RetrievalEngine();
    jest.spyOn(Date, "now").mockReturnValue(999999);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // constructor + version validation
  // ---------------------------------------------------------
  test("constructor loads registry and validates version", () => {
    expect(() => new ReflectionState()).not.toThrow();
  });

  test("constructor throws on version mismatch", () => {
    jest.resetModules();
    jest.doMock("./version_registry.js", () => ({
      ReflectionState: "WRONG"
    }));

  let BadState;
  jest.isolateModules(() => {
    BadState = require("./reflection_state");
  });

  const bad = new BadState();
  expect(() => bad.init()).toThrow("version mismatch");

});


  // ---------------------------------------------------------
  // computeSemanticSummary
  // ---------------------------------------------------------
  test("computeSemanticSummary returns defaults when no tertiary memory", () => {
    const rs = new ReflectionState();
    mainMemory.tertiary = [];

    const out = rs.computeSemanticSummary();
    expect(out.memoryStrength).toBe(0);
    expect(out.related).toEqual([]);
  });

  test("computeSemanticSummary returns strongest record and related items", () => {
    const rs = new ReflectionState();

    mainMemory.tertiary = [
      { strength: 0.1, theme: "weak", summary: "weak summary" },
      { strength: 0.9, theme: "strong", summary: "strong summary" }
    ];

    const out = rs.computeSemanticSummary();

    expect(out.strongestTheme).toBe("strong");
    expect(out.strongestSummary).toBe("strong summary");
    expect(out.memoryStrength).toBe(0.9);
    expect(out.related).toEqual(["rel1", "rel2"]);
  });

  // ---------------------------------------------------------
  // computeTemporalArc
  // ---------------------------------------------------------
  test("computeTemporalArc returns defaults when null", () => {
    const rs = new ReflectionState();
    expect(rs.computeTemporalArc(null)).toEqual({
      moodTrend: 0,
      anomalyTrend: 0,
      dreamFrequency: 0,
      baselineShift: 0
    });
  });

  test("computeTemporalArc extracts fields safely", () => {
    const rs = new ReflectionState();
    const out = rs.computeTemporalArc({
      moodTrend: 1,
      anomalyTrend: 2,
      dreamFrequency: 3,
      baselineShift: 4
    });

    expect(out).toEqual({
      moodTrend: 1,
      anomalyTrend: 2,
      dreamFrequency: 3,
      baselineShift: 4
    });
  });

  // ---------------------------------------------------------
  // computeLatentDrift
  // ---------------------------------------------------------
  test("computeLatentDrift returns zeros for insufficient history", () => {
    const rs = new ReflectionState();
    expect(rs.computeLatentDrift([])).toEqual({ magnitude: 0, volatility: 0 });
  });

  test("computeLatentDrift computes magnitude + volatility", () => {
    const rs = new ReflectionState();

    const out = rs.computeLatentDrift([
      [0, 0],
      [3, 4]
    ]);

    expect(out.magnitude).toBe(5);
    expect(out.volatility).toBe(5);
  });

  // ---------------------------------------------------------
  // computeTrend
  // ---------------------------------------------------------
  test("computeTrend returns zeros for insufficient data", () => {
    const rs = new ReflectionState();
    expect(rs.computeTrend([1])).toEqual({
      direction: 0,
      slope: 0,
      recentAvg: 0
    });
  });

  test("computeTrend computes slope, direction, and avg", () => {
    const rs = new ReflectionState();

    const out = rs.computeTrend([1, 2, 3, 4]);

    expect(out.direction).toBe(1);
    expect(out.slope).toBeGreaterThan(0);
    expect(out.recentAvg).toBe(2.5);
  });

  // ---------------------------------------------------------
  // computeAttentionFocus
  // ---------------------------------------------------------
  test("computeAttentionFocus returns defaults for empty input", () => {
    const rs = new ReflectionState();
    expect(rs.computeAttentionFocus([])).toEqual({
      dominantIndex: null,
      dominantWeight: 0,
      entropy: 0
    });
  });

  test("computeAttentionFocus computes dominant index + entropy", () => {
    const rs = new ReflectionState();

    const out = rs.computeAttentionFocus([0.1, 0.4, 0.5]);

    expect(out.dominantIndex).toBe(2);
    expect(out.dominantWeight).toBe(0.5);
    expect(out.entropy).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------
  // computeMemoryLoad
  // ---------------------------------------------------------
  test("computeMemoryLoad returns defaults when null", () => {
    const rs = new ReflectionState();
    expect(rs.computeMemoryLoad(null)).toEqual({
      fillRatio: 0,
      count: 0,
      limit: 0,
      feelsHeavy: false
    });
  });

  test("computeMemoryLoad computes fill ratio + feelsHeavy", () => {
    const rs = new ReflectionState();

    const out = rs.computeMemoryLoad({ count: 8, limit: 10 });

    expect(out.fillRatio).toBe(0.8);
    expect(out.feelsHeavy).toBe(false);

    const heavy = rs.computeMemoryLoad({ count: 9, limit: 10 });
    expect(heavy.feelsHeavy).toBe(true);
  });

  // ---------------------------------------------------------
  // computeMoodState
  // ---------------------------------------------------------
  test("computeMoodState returns defaults when null", () => {
    const rs = new ReflectionState();
    expect(rs.computeMoodState(null)).toEqual({
      moodBaseline: 0,
      emotionality: 0,
      curiosity: 0,
      styleHint: "neutral"
    });
  });

  test("computeMoodState extracts traits + styleHint", () => {
    const rs = new ReflectionState();

    const out = rs.computeMoodState({
      moodBaseline: 0.5,
      traits: [0.2, 0, 0.7, 0],
      styleBias: { poetic: 0.1, analytic: 0.9 }
    });

    expect(out.moodBaseline).toBe(0.5);
    expect(out.curiosity).toBe(0.2);
    expect(out.emotionality).toBe(0.7);
    expect(out.styleHint).toBe("analytic");
  });

  // ---------------------------------------------------------
  // euclideanDistance
  // ---------------------------------------------------------
  test("euclideanDistance computes correct distance", () => {
    const rs = new ReflectionState();
    expect(rs.euclideanDistance([0, 0], [3, 4])).toBe(5);
  });

  // ---------------------------------------------------------
  // build()
  // ---------------------------------------------------------
  test("build() assembles full snapshot and validates it", () => {
    const rs = new ReflectionState();

    mainMemory.tertiary = [
      { strength: 1, theme: "t", summary: "s" }
    ];

    const snapshot = rs.build({
      latentHistory: [[0, 0], [1, 1]],
      anomalyHistory: [1, 2, 3],
      predLossHistory: [3, 2, 1],
      memorySummary: { count: 5, limit: 10 },
      personality: {
        moodBaseline: 0.2,
        traits: [0.1, 0, 0.3, 0],
        styleBias: { poetic: 0.2, analytic: 0.8 }
      },
      attention: [0.2, 0.8],
      temporalSummary: {
        moodTrend: 1,
        anomalyTrend: 2,
        dreamFrequency: 3,
        baselineShift: 4
      }
    });

    expect(snapshot.version).toBe("2.0.0-2026.01.08");
    expect(snapshot.semantic.memoryStrength).toBe(1);
    expect(snapshot.temporalArc.moodTrend).toBe(1);
    expect(snapshot.latentDrift.magnitude).toBeGreaterThan(0);
    expect(snapshot.attentionFocus.dominantIndex).toBe(1);
    expect(snapshot.memoryLoad.fillRatio).toBe(0.5);
    expect(snapshot.moodState.moodBaseline).toBe(0.2);
    expect(snapshot.timestamp).toBe(999999);
  });

  // ---------------------------------------------------------
  // snapshot validation
  // ---------------------------------------------------------
  test("build() throws if snapshot contains invalid numeric values", () => {
    const rs = new ReflectionState();

    jest.spyOn(rs, "computeLatentDrift").mockReturnValue({
      magnitude: NaN,
      volatility: 0
    });

    expect(() => rs.build({})).toThrow("invalid numeric values");
  });
});
