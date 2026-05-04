describe("AttentionEngine", () => {
  let AttentionEngine;

  beforeEach(() => {
    jest.resetModules();

    jest.mock("./version_registry.js", () => ({
      AttentionEngine: "2.2.1-2026.05.01"
    }));

    AttentionEngine = require("./attention_engine");
  });

  // -----------------------------
  // Version validation
  // -----------------------------
  test("loads without registry file", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => null);
    const AE = require("./attention_engine");
    expect(() => new AE()).not.toThrow();
  });

  test("throws on version mismatch", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      AttentionEngine: "WRONG-VERSION"
    }));
    const AE = require("./attention_engine");
    expect(() => new AE()).toThrow("Version mismatch");
  });

  test("accepts correct version", () => {
    expect(() => new AttentionEngine()).not.toThrow();
  });

  // -----------------------------
  // Constructor state
  // -----------------------------
  test("initializes uniform weights and zero utility", () => {
    const eng = new AttentionEngine(4);
    expect(eng.weights).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(eng.utility).toEqual([0, 0, 0, 0]);
  });

  // -----------------------------
  // applyAttention
  // -----------------------------
  test("applyAttention returns zero vector for non-array input", () => {
    const eng = new AttentionEngine(3);
    const { attended } = eng.applyAttention(null);
    expect(attended).toEqual([0, 0, 0]);
  });

  test("applyAttention multiplies input by weights", () => {
    const eng = new AttentionEngine(3);
    eng.weights = [0.5, 0.25, 0.25];

    const { attended } = eng.applyAttention([2, 4, 6]);
    expect(attended).toEqual([1, 1, 1.5]);
  });

  test("applyAttention clamps invalid values to 0", () => {
    const eng = new AttentionEngine(3);
    const { attended } = eng.applyAttention([1, NaN, 3]);
    expect(attended).toEqual([1 / 3, 0, 3 / 3]);
  });

  // -----------------------------
  // updateAttention
  // -----------------------------
  test("updateAttention ignores invalid predLoss values", () => {
    const eng = new AttentionEngine(3);
    const before = [...eng.weights];

    const after = eng.updateAttention([1, 2, 3], NaN, 0.1);
    expect(after).toEqual(before);
  });

  test("updateAttention increases utility based on improvement", () => {
    const eng = new AttentionEngine(3);
    eng.updateAttention([1, 2, 3], 1.0, 0.5);

    expect(eng.utility[0]).toBeCloseTo(0.5);
    expect(eng.utility[1]).toBeCloseTo(1.0);
    expect(eng.utility[2]).toBeCloseTo(1.5);
  });

  test("updateAttention normalizes weights to sum to 1", () => {
    const eng = new AttentionEngine(3);
    const weights = eng.updateAttention([1, 1, 1], 1.0, 0.0);

    const sum = weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });

  test("updateAttention ensures no weight is NaN or infinite", () => {
    const eng = new AttentionEngine(3);
    const weights = eng.updateAttention([Infinity, 1, 1], 1.0, 0.0);

    for (const w of weights) {
      expect(Number.isFinite(w)).toBe(true);
    }
  });

  // -----------------------------
  // _validateOutput
  // -----------------------------
  test("_validateOutput throws on non-array", () => {
    const eng = new AttentionEngine();
    expect(() => eng._validateOutput("bad")).toThrow("output is not an array");
  });

  test("_validateOutput throws on invalid values", () => {
    const eng = new AttentionEngine();
    expect(() => eng._validateOutput([1, 2, NaN])).toThrow(
      "output contains invalid values"
    );
  });
});