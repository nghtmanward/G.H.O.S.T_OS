describe("PersonalityEngine", () => {
  let PersonalityEngine;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.mock("./version_registry.js", () => ({
      PersonalityEngine: "2.2.1-2026.05.01"
    }));

    PersonalityEngine = require("./personality_engine");

    jest.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // constructor + version validation
  // ---------------------------------------------------------
  test("constructor initializes traits, moodBaseline, and styleBias", () => {
    const p = new PersonalityEngine(4);

    expect(p.traits.length).toBe(4);
    expect(p.moodBaseline).toBe(0);
    expect(p.styleBias).toEqual({
      poetic: 0.25,
      analytic: 0.25,
      emotional: 0.25,
      cryptic: 0.25
    });
  });

  test("constructor throws on version mismatch", () => {
    jest.resetModules();
    jest.mock("./version_registry.js", () => ({
      PersonalityEngine: "WRONG"
    }));
    const BadEngine = require("./personality_engine");
    expect(() => new BadEngine()).toThrow("Version mismatch");
  });

  // ---------------------------------------------------------
  // _nudge
  // ---------------------------------------------------------
  test("_nudge moves value toward target", () => {
    const p = new PersonalityEngine();
    const out = p._nudge(0, 1, 0.1);
    expect(out).toBeCloseTo(0.1);
  });

  test("_nudge ignores invalid values", () => {
    const p = new PersonalityEngine();
    expect(p._nudge(NaN, 1, 0.1)).toBeNaN();
  });

  // ---------------------------------------------------------
  // _normalizeStyle
  // ---------------------------------------------------------
  test("_normalizeStyle normalizes styleBias to sum to 1", () => {
    const p = new PersonalityEngine();
    p.styleBias = { poetic: 2, analytic: 2, emotional: 2, cryptic: 2 };
    p._normalizeStyle();
    const sum = Object.values(p.styleBias).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });

  test("_normalizeStyle resets invalid styleBias", () => {
    const p = new PersonalityEngine();
    p.styleBias = { poetic: Infinity, analytic: 0, emotional: 0, cryptic: 0 };
    p._normalizeStyle();
    expect(p.styleBias).toEqual({
      poetic: 0.25,
      analytic: 0.25,
      emotional: 0.25,
      cryptic: 0.25
    });
  });

  // ---------------------------------------------------------
  // update()
  // ---------------------------------------------------------
  test("update adjusts traits, moodBaseline, and styleBias", () => {
    const p = new PersonalityEngine(4);
    const out = p.update({
      anomaly: 0.2,
      predLoss: 0.1,
      intensity: 0.7,
      mood: "alert"
    });

    expect(out.traits.length).toBe(4);
    expect(Number.isFinite(out.moodBaseline)).toBe(true);
    const sum = Object.values(out.styleBias).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });

  test("update clamps traits to [-1, 1]", () => {
    const p = new PersonalityEngine(4);
    p.traits = [10, -10, 5, -5];
    const out = p.update({ anomaly: 1, predLoss: 1, intensity: 1, mood: "alert" });
    out.traits.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  test("update handles invalid inputs safely", () => {
    const p = new PersonalityEngine(4);
    const out = p.update({
      anomaly: NaN,
      predLoss: Infinity,
      intensity: NaN,
      mood: 123
    });
    expect(out.traits.every(Number.isFinite)).toBe(true);
    expect(Number.isFinite(out.moodBaseline)).toBe(true);
  });

  // ---------------------------------------------------------
  // output validation
  // ---------------------------------------------------------
  test("_validateOutput throws on invalid traits", () => {
    const p = new PersonalityEngine();
    expect(() =>
      p._validateOutput({
        traits: [1, 2, NaN],
        moodBaseline: 0,
        styleBias: { poetic: 1 }
      })
    ).toThrow("traits contain invalid values");
  });

  test("_validateOutput throws on invalid moodBaseline", () => {
    const p = new PersonalityEngine();
    expect(() =>
      p._validateOutput({
        traits: [0, 0, 0],
        moodBaseline: NaN,
        styleBias: { poetic: 1 }
      })
    ).toThrow("moodBaseline invalid");
  });

  test("_validateOutput throws on invalid styleBias", () => {
    const p = new PersonalityEngine();
    expect(() =>
      p._validateOutput({
        traits: [0, 0, 0],
        moodBaseline: 0,
        styleBias: null
      })
    ).toThrow("styleBias invalid");
  });
});